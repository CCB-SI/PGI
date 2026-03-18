from datetime import datetime

from gestaodecomunicados.models import all_models as models


def test_kitchen_forecast_returns_only_geofence_events(client, db_session, seed_reference_data, admin_auth_headers):
    geofence_event = models.Event(
        title="Reunião com cozinha",
        description="Evento com apoio",
        start_time=datetime(2026, 3, 20, 19, 0),
        category="Administrativo",
        event_type="RA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
        target_audience="Ministerial",
        estimated_people=180,
        duration_minutes=120,
    )

    outside_geofence_event = models.Event(
        title="Evento fora geofence",
        description="Sem cozinha",
        start_time=datetime(2026, 3, 20, 19, 0),
        category="Administrativo",
        event_type="RA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["gopouva"].id,
        target_audience="Ministerial",
        estimated_people=300,
        duration_minutes=120,
    )

    db_session.add_all([geofence_event, outside_geofence_event])
    db_session.commit()

    response = client.get(
        "/api/v1/reports/kitchen-forecast?start_date=2026-03-01T00:00:00&end_date=2026-03-31T23:59:59",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["summary"]["events_count"] == 1
    assert payload["summary"]["estimated_people_total"] == 180
    assert payload["summary"]["estimated_meals_total"] == 180
    assert len(payload["items"]) == 1
    assert payload["items"][0]["location_name"] == "Jardim das Acácias"


def test_kitchen_forecast_requires_restricted_auth(client):
    response = client.get(
        "/api/v1/reports/kitchen-forecast?start_date=2026-03-01T00:00:00&end_date=2026-03-31T23:59:59"
    )
    assert response.status_code == 401
