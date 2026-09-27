from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from ...core.database import get_db
from ...models import all_models as models
from ...schemas import all_schemas as schemas
from ...services.event_rules import (
    infer_end_time,
    has_time_conflict,
    online_requires_jardim_acacias,
    requires_geofencing_logistics,
    resolve_capacity,
)
from ...services.recurrence_service import expand_event_occurrences_in_year
from ...services.recurrence_service import expand_occurrences
from . import auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

from .endpoints import resources, contact, users, documents, audit
api_router.include_router(resources.router, tags=["downloads"])
api_router.include_router(contact.router, tags=["contact"])
api_router.include_router(users.router)
api_router.include_router(documents.router)
api_router.include_router(audit.router)

# --- Events Endpoints ---
from typing import Optional
from datetime import datetime

ADMIN_EVENT_TYPES = [
    "RMA",
    "RRM",
    "RT",
    "RF",
    "RA",
    "RGA",
    "AGO",
    "Manutenção",
    "Reunião de Setor",
    "EBI",
    "DARPE",
]

PUBLIC_NOTICE_TYPES = [
    "Batismo",
    "Santa Ceia",
    "Culto para Mocidade",
    "Reunião para Mocidade",
    "Ensaio Regional",
]

def _build_ics(events: List[models.Event]) -> str:
    def _fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%SZ")

    def _esc(text: Optional[str]) -> str:
        value = (text or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
        return value.replace("\n", "\\n")

    now_utc = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//PGRI Santa Isabel//Agenda Administrativa//PT-BR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    for event in events:
        end_time = infer_end_time(event.start_time, event.end_time, event.duration_minutes)
        location_name = event.location.name if event.location else ""
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:event-{event.id}@pgri-santa-isabel",
                f"DTSTAMP:{now_utc}",
                f"DTSTART:{_fmt(event.start_time)}",
                f"DTEND:{_fmt(end_time)}",
                f"SUMMARY:{_esc(event.title)}",
                f"DESCRIPTION:{_esc(event.description)}",
                f"LOCATION:{_esc(location_name)}",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def _parse_news_date(date_text: Optional[str]) -> Optional[datetime]:
    if not date_text:
        return None
    normalized = date_text.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(normalized, fmt)
        except ValueError:
            continue
    return None


def _build_pdf_report(title: str, subtitle: str, lines: List[str]) -> bytes:
    try:
        import fitz
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="PyMuPDF não está instalado no ambiente") from exc

    doc = fitz.open()
    page = doc.new_page()
    y = 50
    page.insert_text((50, y), title, fontsize=16)
    y += 20
    page.insert_text((50, y), subtitle, fontsize=10)
    y += 24

    for line in lines:
        if y > 800:
            page = doc.new_page()
            y = 50
        page.insert_text((50, y), line, fontsize=10)
        y += 14

    content = doc.tobytes()
    doc.close()
    return content


def _is_restricted_scope(scope: Optional[str]) -> bool:
    normalized = (scope or "").strip().lower()
    return normalized in {"administrativa", "ministerial"}


def _visible_events(query, current_user: Optional[models.User]):
    """Sem login, só evento com público-alvo "Público" (RN-02). Toda leitura de evento passa aqui."""
    if not current_user:
        return query.filter(models.Event.target_audience == "Público")
    return query


def _validate_and_prepare_event_payload(
    db: Session,
    payload: dict,
    current_event_id: Optional[int] = None,
) -> dict:
    category = db.query(models.Category).filter(models.Category.id == payload["category_id"]).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if payload.get("event_type") == "RRM" and not payload.get("location_id"):
        default_rrm_location = db.query(models.Location).filter(
            models.Location.name.ilike("%Gopouva%")
        ).first()
        if default_rrm_location:
            payload["location_id"] = default_rrm_location.id

    location = None
    if payload.get("location_id"):
        location = db.query(models.Location).filter(models.Location.id == payload["location_id"]).first()
        if not location:
            raise HTTPException(status_code=404, detail="Comum não encontrada")

    start_time = payload["start_time"]
    end_time = infer_end_time(start_time, payload.get("end_time"), payload.get("duration_minutes"))

    if location and requires_geofencing_logistics(location.city):
        if payload.get("serve_meals") and payload.get("estimated_people") is None:
            raise HTTPException(
                status_code=400,
                detail="Quantidade estimada de pessoas é obrigatória quando Servir Refeições estiver marcado.",
            )
        if payload.get("duration_minutes") is None:
            raise HTTPException(
                status_code=400,
                detail="Duração do evento é obrigatória para programação da cozinha nas cidades atendidas.",
            )

    if payload.get("is_online"):
        if not location or online_requires_jardim_acacias(location.name, True):
            raise HTTPException(
                status_code=400,
                detail="Eventos online devem reservar espaço físico no Jardim das Acácias para geração do sinal.",
            )
        if not payload.get("space_name"):
            raise HTTPException(
                status_code=400,
                detail="Informe o espaço físico reservado no Jardim das Acácias para evento online.",
            )

    if location and payload.get("estimated_people") is not None:
        capacity = resolve_capacity(location.name, payload.get("space_name"))
        if capacity is not None and payload["estimated_people"] > capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Quantidade estimada ({payload['estimated_people']}) excede a capacidade do espaço ({capacity}).",
            )

    if location:
        existing_events = db.query(models.Event).filter(
            models.Event.location_id == location.id,
            models.Event.space_name == payload.get("space_name")
        ).all()

        for existing in existing_events:
            if current_event_id and existing.id == current_event_id:
                continue
            existing_end = infer_end_time(existing.start_time, existing.end_time, existing.duration_minutes)
            if has_time_conflict(existing.start_time, existing_end, start_time, end_time):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Conflito de ocupação: já existe um evento no mesmo local/espaço "
                        "neste intervalo de horário."
                    ),
                )

    return payload

@api_router.get("/events", response_model=List[schemas.Event])
def read_events(
    skip: int = 0, 
    limit: int = 100, 
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    start_date: Optional[datetime] = None,
    event_type: Optional[str] = None,
    agenda_scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    if _is_restricted_scope(agenda_scope) and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for restricted agenda scope")

    query = _visible_events(db.query(models.Event), current_user)

    if category_id:
        query = query.filter(models.Event.category_id == category_id)
    if city:
        query = query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))
    if start_date:
        query = query.filter(models.Event.start_time >= start_date)
    if event_type:
        query = query.filter(models.Event.event_type.ilike(f"%{event_type}%"))
    if agenda_scope:
        query = query.filter(models.Event.agenda_scope.ilike(f"%{agenda_scope}%"))
    
    events = query.order_by(models.Event.start_time.asc()).offset(skip).limit(limit).all()
    return events


@api_router.get("/events.ics")
def export_events_ics(
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    start_date: Optional[datetime] = None,
    event_type: Optional[str] = None,
    agenda_scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    if _is_restricted_scope(agenda_scope) and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for restricted agenda scope")

    query = _visible_events(db.query(models.Event).options(joinedload(models.Event.location)), current_user)

    if category_id:
        query = query.filter(models.Event.category_id == category_id)
    if city:
        query = query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))
    if start_date:
        query = query.filter(models.Event.start_time >= start_date)
    if event_type:
        query = query.filter(models.Event.event_type.ilike(f"%{event_type}%"))
    if agenda_scope:
        query = query.filter(models.Event.agenda_scope.ilike(f"%{agenda_scope}%"))

    events = query.order_by(models.Event.start_time.asc()).all()
    calendar_content = _build_ics(events)

    return Response(
        content=calendar_content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=agenda.ics"},
    )

@api_router.get("/events/{event_id}", response_model=schemas.Event)
def read_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
):
    # Evento que o visitante não pode ver responde como inexistente
    event = _visible_events(db.query(models.Event), current_user).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events", response_model=schemas.Event, status_code=status.HTTP_201_CREATED)
def create_event(
    event: schemas.EventCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    payload = _validate_and_prepare_event_payload(db, event.model_dump())

    db_event = models.Event(**payload, owner_id=current_user.id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@api_router.put("/events/{event_id}", response_model=schemas.Event)
def update_event(
    event_id: int,
    event: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    payload = _validate_and_prepare_event_payload(db, event.model_dump(), current_event_id=event_id)
    for field, value in payload.items():
        setattr(db_event, field, value)

    db.commit()
    db.refresh(db_event)
    return db_event


@api_router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(db_event)
    db.commit()
    return None


@api_router.get("/event-types/custom", response_model=List[schemas.EventType])
def read_custom_event_types(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
):
    _ = current_user
    return db.query(models.EventType).order_by(models.EventType.name.asc()).all()


@api_router.post("/event-types", response_model=schemas.EventType, status_code=status.HTTP_201_CREATED)
def create_event_type(
    event_type: schemas.EventTypeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    _ = current_user
    normalized_name = event_type.name.strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Nome do tipo de evento é obrigatório")

    existing = db.query(models.EventType).filter(models.EventType.name.ilike(normalized_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tipo de evento já cadastrado")

    db_event_type = models.EventType(name=normalized_name, scope=event_type.scope)
    db.add(db_event_type)
    db.commit()
    db.refresh(db_event_type)
    return db_event_type


@api_router.get("/event-types")
def read_event_types(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
):
    _ = current_user
    custom_rows = db.query(models.EventType).order_by(models.EventType.name.asc()).all()
    custom_types = [{"id": row.id, "name": row.name, "scope": row.scope} for row in custom_rows]
    all_types = sorted(set(ADMIN_EVENT_TYPES + PUBLIC_NOTICE_TYPES + [row.name for row in custom_rows]))
    return {
        "administrative": ADMIN_EVENT_TYPES,
        "public_notices": PUBLIC_NOTICE_TYPES,
        "custom": custom_types,
        "all": all_types,
    }


@api_router.get("/reports/monthly-notices.pdf")
def export_monthly_notices_pdf(
    year: int,
    month: int,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Mês inválido")

    month_start = datetime(year, month, 1)
    month_end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    events_query = db.query(models.Event).options(joinedload(models.Event.location)).filter(
        models.Event.start_time >= month_start,
        models.Event.start_time < month_end,
        models.Event.event_type.in_(PUBLIC_NOTICE_TYPES)
    )

    events_query = _visible_events(events_query, current_user)
    if city:
        events_query = events_query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))

    events = events_query.order_by(models.Event.start_time.asc()).all()

    news_query = db.query(models.News).filter(models.News.target_audience == "Público")
    news_rows = news_query.order_by(models.News.id.desc()).all()
    monthly_news = []
    for item in news_rows:
        parsed_date = _parse_news_date(item.date)
        if parsed_date and parsed_date.year == year and parsed_date.month == month:
            monthly_news.append(item)

    lines = ["Escalas de Batismos, Ceias e Avisos Gerais", ""]
    if events:
        lines.append("Eventos Públicos:")
        for event in events:
            start_text = event.start_time.strftime("%d/%m/%Y %H:%M")
            location_text = event.location.name if event.location else "Local não informado"
            city_text = event.location.city if event.location else ""
            lines.append(f"- {event.event_type} | {start_text} | {location_text} ({city_text})")
    else:
        lines.append("Sem eventos públicos cadastrados no período.")

    lines.append("")
    if monthly_news:
        lines.append("Avisos Gerais:")
        for notice in monthly_news:
            lines.append(f"- {notice.date} | {notice.title}: {notice.content}")
    else:
        lines.append("Sem avisos gerais no período.")

    content = _build_pdf_report(
        title="Lista de Avisos Mensal",
        subtitle=f"Mês: {month:02d}/{year}",
        lines=lines,
    )

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=lista-avisos-{year}-{month:02d}.pdf"},
    )


@api_router.get("/reports/annual-agenda.pdf")
def export_annual_agenda_pdf(
    year: int,
    city: Optional[str] = None,
    agenda_scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    if _is_restricted_scope(agenda_scope) and not current_user:
        raise HTTPException(status_code=401, detail="Authentication required for restricted agenda scope")

    query = _visible_events(db.query(models.Event).options(joinedload(models.Event.location)), current_user)
    if city:
        query = query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))
    if agenda_scope:
        query = query.filter(models.Event.agenda_scope.ilike(f"%{agenda_scope}%"))

    events = query.order_by(models.Event.start_time.asc()).all()

    expanded_rows = []
    for event in events:
        occurrences = expand_event_occurrences_in_year(
            start_time=event.start_time,
            end_time=event.end_time,
            duration_minutes=event.duration_minutes,
            recurrence_rule=event.recurrence_rule,
            year=year,
        )
        for occurrence in occurrences:
            expanded_rows.append((occurrence.start, event))

    expanded_rows.sort(key=lambda item: item[0])

    lines = ["Planejamento completo de eventos", ""]
    if expanded_rows:
        for occurrence_start, event in expanded_rows:
            start_text = occurrence_start.strftime("%d/%m/%Y %H:%M")
            event_type = event.event_type or "Evento"
            scope = event.agenda_scope or "Geral"
            location_text = event.location.name if event.location else "Local não informado"
            lines.append(f"- {start_text} | {event_type} | {scope} | {location_text}")
    else:
        lines.append("Sem eventos cadastrados para o ano informado.")

    content = _build_pdf_report(
        title="Agenda Anual",
        subtitle=f"Ano: {year}",
        lines=lines,
    )

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=agenda-anual-{year}.pdf"},
    )


@api_router.get("/reports/kitchen-forecast")
def kitchen_forecast_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    city: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    window_start = start_date or datetime.utcnow()
    window_end = end_date or (window_start + timedelta(days=30))

    if window_end <= window_start:
        raise HTTPException(status_code=400, detail="Período inválido: end_date deve ser maior que start_date")

    query = db.query(models.Event).options(joinedload(models.Event.location))
    if city:
        query = query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))

    events = query.all()

    items = []
    total_events = 0
    total_people = 0
    total_duration_minutes = 0

    for event in events:
        if not event.serve_meals:
            continue

        occurrences = expand_occurrences(
            start_time=event.start_time,
            end_time=event.end_time,
            duration_minutes=event.duration_minutes,
            recurrence_rule=event.recurrence_rule,
            window_start=window_start,
            window_end=window_end,
            max_occurrences=200,
        )

        for occurrence in occurrences:
            estimated_people = event.estimated_people or 0
            duration_minutes = event.duration_minutes or int((occurrence.end - occurrence.start).total_seconds() // 60)

            total_events += 1
            total_people += estimated_people
            total_duration_minutes += duration_minutes

            items.append(
                {
                    "event_id": event.id,
                    "title": event.title,
                    "event_type": event.event_type,
                    "city": event.location.city if event.location else None,
                    "location_name": event.location.name if event.location else "Local não informado",
                    "space_name": event.space_name,
                    "start_time": occurrence.start,
                    "end_time": occurrence.end,
                    "estimated_people": estimated_people,
                    "duration_minutes": duration_minutes,
                    "meals_estimate": estimated_people,
                }
            )

    items.sort(key=lambda row: row["start_time"])

    return {
        "period": {
            "start_date": window_start,
            "end_date": window_end,
            "city_filter": city,
        },
        "summary": {
            "events_count": total_events,
            "estimated_people_total": total_people,
            "estimated_meals_total": total_people,
            "duration_minutes_total": total_duration_minutes,
        },
        "items": items,
    }
# --- Categories Endpoints ---
@api_router.get("/categories", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = db.query(models.Category).offset(skip).limit(limit).all()
    return categories

@api_router.post("/categories", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category(
    category: schemas.CategoryCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category
# --- MinistryMember (Irmãos do Ministério) Endpoints ---
@api_router.get("/members", response_model=List[schemas.MinistryMember])
def read_members(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.MinistryMember)
    if role:
        query = query.filter(models.MinistryMember.role == role)
    return query.order_by(models.MinistryMember.name).all()

@api_router.post("/members", response_model=schemas.MinistryMember, status_code=status.HTTP_201_CREATED)
def create_member(
    member: schemas.MinistryMemberCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_member = models.MinistryMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@api_router.put("/members/{member_id}", response_model=schemas.MinistryMember)
def update_member(
    member_id: int, 
    member: schemas.MinistryMemberCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    db_member.name = member.name
    db_member.role = member.role
    db.commit()
    db.refresh(db_member)
    return db_member

@api_router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    db_member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    db.delete(db_member)
    db.commit()
    return None
# --- Location Members (vincular irmãos a comuns) ---
@api_router.post("/locations/{location_id}/members/{member_id}", status_code=status.HTTP_201_CREATED)
def add_member_to_location(
    location_id: int, 
    member_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    if member not in location.members:
        location.members.append(member)
        db.commit()
    return {"message": "Irmão vinculado"}

@api_router.delete("/locations/{location_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member_from_location(
    location_id: int, 
    member_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    location = db.query(models.Location).options(
        joinedload(models.Location.members)
    ).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    if member in location.members:
        location.members.remove(member)
        db.commit()
    return None
# --- Locations (Comuns) Endpoints ---
@api_router.get("/locations", response_model=List[schemas.Location])
def read_locations(
    skip: int = 0, 
    limit: int = 100, 
    city: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Location).options(
        joinedload(models.Location.schedules),
        joinedload(models.Location.members),
    )
    if city:
        query = query.filter(models.Location.city.ilike(f"%{city}%"))
    locations = query.offset(skip).limit(limit).all()
    return locations

@api_router.get("/locations/{location_id}", response_model=schemas.Location)
def read_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(models.Location).options(
        joinedload(models.Location.schedules),
        joinedload(models.Location.members),
    ).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    return location

@api_router.post("/locations", response_model=schemas.Location, status_code=status.HTTP_201_CREATED)
def create_location(
    location: schemas.LocationCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_location = models.Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@api_router.put("/locations/{location_id}", response_model=schemas.Location)
def update_location(
    location_id: int, 
    location: schemas.LocationUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    update_data = location.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    db.commit()
    db.refresh(db_location)
    return db_location

@api_router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    db_location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    db.delete(db_location)
    db.commit()
    return None
# --- Schedules (Horários) Endpoints ---
@api_router.get("/locations/{location_id}/schedules", response_model=List[schemas.Schedule])
def read_schedules(location_id: int, db: Session = Depends(get_db)):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    return db.query(models.Schedule).filter(models.Schedule.location_id == location_id).all()

@api_router.post("/locations/{location_id}/schedules", response_model=schemas.Schedule, status_code=status.HTTP_201_CREATED)
def create_schedule(
    location_id: int, 
    schedule: schemas.ScheduleCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    db_schedule = models.Schedule(**schedule.model_dump(), location_id=location_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@api_router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    db_schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Horário não encontrado")
    db.delete(db_schedule)
    db.commit()
    return None
# --- Upload de Foto ---
import os
import uuid

UPLOAD_DIR = "/app/uploads"

@api_router.post("/locations/{location_id}/photo", response_model=schemas.Location)
async def upload_location_photo(
    location_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato inválido. Use JPEG, PNG ou WebP.")
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    db_location.photo_url = f"/uploads/{filename}"

    db.commit()
    db.refresh(db_location)
    return db_location
# --- News (Informativos) Endpoints ---
@api_router.get("/news", response_model=List[schemas.News])
def read_news(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    query = db.query(models.News)
    
    # Se não estiver logado, mostra apenas Público
    if not current_user:
        query = query.filter(models.News.target_audience == "Público")
        
    return query.order_by(models.News.id.desc()).offset(skip).limit(limit).all()

@api_router.post("/news", response_model=schemas.News, status_code=status.HTTP_201_CREATED)
def create_news(
    news: schemas.NewsCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_news = models.News(**news.model_dump())
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news

@api_router.put("/news/{news_id}", response_model=schemas.News)
def update_news(
    news_id: int, 
    news: schemas.NewsUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    db_news = db.query(models.News).filter(models.News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="Informativo não encontrado")
    update_data = news.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_news, field, value)
    db.commit()
    db.refresh(db_news)
    return db_news

@api_router.delete("/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_news(
    news_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.require_admin)
):
    db_news = db.query(models.News).filter(models.News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="Informativo não encontrado")
    db.delete(db_news)
    db.commit()
    return None
