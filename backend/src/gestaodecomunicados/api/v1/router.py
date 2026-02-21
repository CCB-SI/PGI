from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List

from ...core.database import get_db
from ...models import all_models as models
from ...schemas import all_schemas as schemas

api_router = APIRouter()

from .endpoints import resources, contact
api_router.include_router(resources.router, tags=["downloads"])
api_router.include_router(contact.router, tags=["contact"])

# --- Events Endpoints ---
from typing import Optional
from datetime import datetime

@api_router.get("/events", response_model=List[schemas.Event])
def read_events(
    skip: int = 0, 
    limit: int = 100, 
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    start_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Event)
    if category_id:
        query = query.filter(models.Event.category_id == category_id)
    if city:
        query = query.join(models.Location).filter(models.Location.city.ilike(f"%{city}%"))
    if start_date:
        query = query.filter(models.Event.start_time >= start_date)
    events = query.order_by(models.Event.start_time.asc()).offset(skip).limit(limit).all()
    return events

@api_router.get("/events/{event_id}", response_model=schemas.Event)
def read_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events", response_model=schemas.Event, status_code=status.HTTP_201_CREATED)
def create_event(event: schemas.EventCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == event.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_event = models.Event(**event.model_dump(), owner_id=1) 
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

# --- Categories Endpoints ---
@api_router.get("/categories", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = db.query(models.Category).offset(skip).limit(limit).all()
    return categories

@api_router.post("/categories", response_model=schemas.Category, status_code=status.HTTP_201_CREATED)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
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
def create_member(member: schemas.MinistryMemberCreate, db: Session = Depends(get_db)):
    db_member = models.MinistryMember(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@api_router.put("/members/{member_id}", response_model=schemas.MinistryMember)
def update_member(member_id: int, member: schemas.MinistryMemberCreate, db: Session = Depends(get_db)):
    db_member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    db_member.name = member.name
    db_member.role = member.role
    db.commit()
    db.refresh(db_member)
    return db_member

@api_router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    db_member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Irmão não encontrado")
    db.delete(db_member)
    db.commit()
    return None

# --- Location Members (vincular irmãos a comuns) ---
@api_router.post("/locations/{location_id}/members/{member_id}", status_code=status.HTTP_201_CREATED)
def add_member_to_location(location_id: int, member_id: int, db: Session = Depends(get_db)):
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
def remove_member_from_location(location_id: int, member_id: int, db: Session = Depends(get_db)):
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
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db)):
    db_location = models.Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@api_router.put("/locations/{location_id}", response_model=schemas.Location)
def update_location(location_id: int, location: schemas.LocationUpdate, db: Session = Depends(get_db)):
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
def delete_location(location_id: int, db: Session = Depends(get_db)):
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
def create_schedule(location_id: int, schedule: schemas.ScheduleCreate, db: Session = Depends(get_db)):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum não encontrado")
    db_schedule = models.Schedule(**schedule.model_dump(), location_id=location_id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@api_router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
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
