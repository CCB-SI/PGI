from datetime import datetime, timedelta

import pytest

from gestaodecomunicados.core.security import get_password_hash
from gestaodecomunicados.models import all_models as models


def _event_payload(category_id, location_id):
    start = (datetime.utcnow() + timedelta(days=2)).replace(microsecond=0)
    end = start + timedelta(hours=1)
    return {
        "title": "RMA Restrita",
        "description": "Pauta ministerial",
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "image_url": None,
        "category": "Administrativo",
        "event_type": "RMA",
        "agenda_scope": "Administrativa",
        "category_id": category_id,
        "location_id": location_id,
        "target_audience": "Ministerial",
        "instructions": None,
        "space_name": "Salão Principal",
        "estimated_people": 100,
        "duration_minutes": 60,
        "is_online": False,
        "recurrence_rule": None,
    }


def _login(client, email, password):
    response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_create_ministerial_user(client, admin_auth_headers):
    payload = {
        "email": "ministerial.user@teste.com",
        "password": "senhaforte",
        "role": "ministerial",
    }

    response = client.post("/api/v1/users/", json=payload, headers=admin_auth_headers)
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "ministerial"


def test_restricted_scope_requires_auth(client, admin_auth_headers, seed_reference_data):
    payload = _event_payload(seed_reference_data["category"].id, seed_reference_data["jardim"].id)
    create = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert create.status_code == 201, create.text

    no_auth = client.get("/api/v1/events?agenda_scope=Administrativa")
    assert no_auth.status_code == 401


def test_ministerial_can_read_restricted_but_cannot_write(client, db_session, admin_auth_headers, seed_reference_data):
    ministerial_user = models.User(
        email="ministerial.reader@teste.com",
        password_hash=get_password_hash("123456"),
        role="ministerial",
    )
    db_session.add(ministerial_user)
    db_session.commit()

    payload = _event_payload(seed_reference_data["category"].id, seed_reference_data["jardim"].id)
    create_admin = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert create_admin.status_code == 201, create_admin.text

    ministerial_headers = _login(client, "ministerial.reader@teste.com", "123456")

    read_restricted = client.get("/api/v1/events?agenda_scope=Administrativa", headers=ministerial_headers)
    assert read_restricted.status_code == 200
    assert len(read_restricted.json()) >= 1

    create_ministerial = client.post("/api/v1/events", json=payload, headers=ministerial_headers)
    assert create_ministerial.status_code == 403


def test_annual_report_restricted_scope_requires_auth(client, admin_auth_headers, seed_reference_data):
    payload = _event_payload(seed_reference_data["category"].id, seed_reference_data["jardim"].id)
    create = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert create.status_code == 201, create.text

    year = datetime.utcnow().year
    report_no_auth = client.get(f"/api/v1/reports/annual-agenda.pdf?year={year}&agenda_scope=Administrativa")
    assert report_no_auth.status_code == 401

    report_auth = client.get(
        f"/api/v1/reports/annual-agenda.pdf?year={year}&agenda_scope=Administrativa",
        headers=admin_auth_headers,
    )
    assert report_auth.status_code == 200
    assert report_auth.content.startswith(b"%PDF")


@pytest.fixture()
def audience_events(db_session, seed_reference_data):
    def event(title, event_type, agenda_scope, target_audience):
        return models.Event(
            title=title,
            description="Pauta",
            start_time=datetime(2026, 11, 10, 19, 0),
            category="Administrativo",
            event_type=event_type,
            agenda_scope=agenda_scope,
            category_id=seed_reference_data["category"].id,
            location_id=seed_reference_data["jardim"].id,
            target_audience=target_audience,
        )

    events = {
        "public": event("Batismo Regional", "Batismo", "Espiritual/Geral", "Público"),
        "restricted": event("RMA Restrita", "RMA", "Administrativa", "Ministerial"),
        "restricted_notice": event("Santa Ceia Restrita", "Santa Ceia", "Espiritual/Geral", "Ministerial"),
    }
    db_session.add_all(events.values())
    db_session.commit()
    return events


def _pdf_text(content):
    import fitz

    with fitz.open(stream=content, filetype="pdf") as doc:
        return "".join(page.get_text() for page in doc)


def test_event_detail_without_login_hides_restricted_event(client, audience_events):
    restricted = client.get(f"/api/v1/events/{audience_events['restricted'].id}")
    public = client.get(f"/api/v1/events/{audience_events['public'].id}")

    assert restricted.status_code == 404
    assert public.status_code == 200


def test_event_detail_with_login_shows_restricted_event(client, audience_events, ministerial_auth_headers):
    response = client.get(
        f"/api/v1/events/{audience_events['restricted'].id}",
        headers=ministerial_auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "RMA Restrita"


def test_event_list_without_login_shows_only_public_events(client, audience_events):
    response = client.get("/api/v1/events")

    assert response.status_code == 200
    assert [event["title"] for event in response.json()] == ["Batismo Regional"]


def test_events_ics_without_login_exports_only_public_events(client, audience_events):
    response = client.get("/api/v1/events.ics")

    assert response.status_code == 200
    assert "Batismo Regional" in response.text
    assert "Restrita" not in response.text


def test_annual_agenda_pdf_without_login_lists_only_public_events(client, audience_events):
    response = client.get("/api/v1/reports/annual-agenda.pdf?year=2026")

    assert response.status_code == 200
    text = _pdf_text(response.content)
    assert "Batismo" in text
    assert "RMA" not in text
    assert "Santa Ceia" not in text


def test_monthly_notices_pdf_without_login_lists_only_public_events(client, audience_events):
    response = client.get("/api/v1/reports/monthly-notices.pdf?year=2026&month=11")

    assert response.status_code == 200
    text = _pdf_text(response.content)
    assert "Batismo |" in text
    assert "Santa Ceia" not in text
