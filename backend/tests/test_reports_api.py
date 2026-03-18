from datetime import datetime

from gestaodecomunicados.models import all_models as models


def test_monthly_notices_pdf_export(client, db_session, seed_reference_data):
    event = models.Event(
        title="Batismo Regional",
        description="Escala de apoio",
        start_time=datetime(2026, 3, 15, 19, 30),
        category="Espiritual",
        event_type="Batismo",
        agenda_scope="Espiritual/Geral",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["jardim"].id,
        target_audience="Público",
    )

    news = models.News(
        tag="Aviso",
        tag_color="#2196f3",
        date="15/03/2026",
        title="Aviso Geral",
        content="Manter ordem e reverência.",
        target_audience="Público",
    )

    db_session.add_all([event, news])
    db_session.commit()

    response = client.get("/api/v1/reports/monthly-notices.pdf?year=2026&month=3")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF")


def test_annual_agenda_pdf_export(client, db_session, seed_reference_data, admin_auth_headers):
    event_admin = models.Event(
        title="RGA",
        description="Planejamento anual",
        start_time=datetime(2026, 5, 10, 14, 0),
        category="Administrativo",
        event_type="RGA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["gopouva"].id,
        target_audience="Ministerial",
    )

    db_session.add(event_admin)
    db_session.commit()

    response = client.get(
        "/api/v1/reports/annual-agenda.pdf?year=2026&agenda_scope=Administrativa",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF")


def test_annual_agenda_pdf_export_includes_recurring_events_from_previous_year(
    client,
    db_session,
    seed_reference_data,
    admin_auth_headers,
):
    recurring_event = models.Event(
        title="RMA Mensal",
        description="Reunião recorrente",
        start_time=datetime(2025, 1, 15, 19, 30),
        category="Administrativo",
        event_type="RMA",
        agenda_scope="Administrativa",
        category_id=seed_reference_data["category"].id,
        location_id=seed_reference_data["gopouva"].id,
        target_audience="Ministerial",
        recurrence_rule="FREQ=MONTHLY;BYDAY=WE;BYSETPOS=3",
    )

    db_session.add(recurring_event)
    db_session.commit()

    response = client.get(
        "/api/v1/reports/annual-agenda.pdf?year=2026&agenda_scope=Administrativa",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content.startswith(b"%PDF")
