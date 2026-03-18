from datetime import datetime, timedelta

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
