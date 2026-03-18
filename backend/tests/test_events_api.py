from datetime import datetime, timedelta


def _base_event_payload(category_id, location_id, start_time=None):
    start = start_time or (datetime.utcnow() + timedelta(days=3)).replace(microsecond=0)
    end = start + timedelta(hours=2)
    return {
        "title": "Reunião Administrativa",
        "description": "Pauta geral",
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "image_url": None,
        "category": "Administrativo",
        "event_type": "RMA",
        "agenda_scope": "Administrativa",
        "category_id": category_id,
        "location_id": location_id,
        "target_audience": "Ministerial",
        "instructions": "Levar atas",
        "space_name": "Salão Principal",
        "estimated_people": 100,
        "duration_minutes": 120,
        "is_online": False,
        "recurrence_rule": "FREQ=MONTHLY;BYDAY=WE;BYSETPOS=3",
    }


def test_create_update_delete_event(client, admin_auth_headers, seed_reference_data):
    payload = _base_event_payload(
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
    )

    create_response = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["event_type"] == "RMA"
    assert created["estimated_people"] == 100

    event_id = created["id"]
    payload["title"] = "Reunião Administrativa Atualizada"
    payload["estimated_people"] = 120

    update_response = client.put(f"/api/v1/events/{event_id}", json=payload, headers=admin_auth_headers)
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["title"] == "Reunião Administrativa Atualizada"
    assert updated["estimated_people"] == 120

    delete_response = client.delete(f"/api/v1/events/{event_id}", headers=admin_auth_headers)
    assert delete_response.status_code == 204

    read_response = client.get(f"/api/v1/events/{event_id}")
    assert read_response.status_code == 404


def test_reject_conflicting_space_booking(client, admin_auth_headers, seed_reference_data):
    start = (datetime.utcnow() + timedelta(days=5)).replace(microsecond=0)
    first = _base_event_payload(
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
        start_time=start,
    )

    create_first = client.post("/api/v1/events", json=first, headers=admin_auth_headers)
    assert create_first.status_code == 201, create_first.text

    second = _base_event_payload(
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
        start_time=start + timedelta(minutes=30),
    )

    create_second = client.post("/api/v1/events", json=second, headers=admin_auth_headers)
    assert create_second.status_code == 409
    assert "Conflito de ocupação" in create_second.json()["detail"]


def test_reject_when_capacity_exceeded(client, admin_auth_headers, seed_reference_data):
    payload = _base_event_payload(
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
    )
    payload["space_name"] = "Salão Principal"
    payload["estimated_people"] = 350

    response = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert response.status_code == 400
    assert "excede a capacidade" in response.json()["detail"]


def test_reject_online_event_without_jardim_acacias(client, admin_auth_headers, seed_reference_data):
    payload = _base_event_payload(
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["redentor"].id,
    )
    payload["is_online"] = True
    payload["space_name"] = "Principal"

    response = client.post("/api/v1/events", json=payload, headers=admin_auth_headers)
    assert response.status_code == 400
    assert "Jardim das Acácias" in response.json()["detail"]
