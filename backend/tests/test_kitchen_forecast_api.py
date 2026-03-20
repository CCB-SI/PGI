from datetime import datetime

from gestaodecomunicados.models import all_models as models


def test_kitchen_forecast_returns_only_events_with_meals(client, db_session, seed_reference_data, admin_auth_headers):
    event_with_meals_supported_city = models.Event(
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
        serve_meals=True,
    )

    event_with_meals_other_city = models.Event(
        title="Evento fora cidade geofence",
        description="Ainda precisa de cozinha",
        start_time=datetime(2026, 3, 20, 19, 0),
        category="Administrativo",
        event_type="RA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["gopouva"].id,
        target_audience="Ministerial",
        estimated_people=300,
        duration_minutes=120,
        serve_meals=True,
    )

    event_without_meals = models.Event(
        title="Reunião sem refeições",
        description="Não precisa de cozinha",
        start_time=datetime(2026, 3, 21, 19, 0),
        category="Administrativo",
        event_type="RA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
        target_audience="Ministerial",
        estimated_people=220,
        duration_minutes=120,
        serve_meals=False,
    )

    db_session.add_all([event_with_meals_supported_city, event_with_meals_other_city, event_without_meals])
    db_session.commit()

    response = client.get(
        "/api/v1/reports/kitchen-forecast?start_date=2026-03-01T00:00:00&end_date=2026-03-31T23:59:59",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["summary"]["events_count"] == 2
    assert payload["summary"]["estimated_people_total"] == 480
    assert payload["summary"]["estimated_meals_total"] == 480
    assert len(payload["items"]) == 2
    location_names = {item["location_name"] for item in payload["items"]}
    assert location_names == {"Jardim das Acácias", "Gopouva"}


def test_kitchen_forecast_requires_admin_auth(client, ministerial_auth_headers):
    forbidden_response = client.get(
        "/api/v1/reports/kitchen-forecast?start_date=2026-03-01T00:00:00&end_date=2026-03-31T23:59:59",
        headers=ministerial_auth_headers,
    )
    assert forbidden_response.status_code == 403

    response = client.get(
        "/api/v1/reports/kitchen-forecast?start_date=2026-03-01T00:00:00&end_date=2026-03-31T23:59:59"
    )
    assert response.status_code == 401
