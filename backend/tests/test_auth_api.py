from gestaodecomunicados.models import all_models as models


def test_seed_route_no_longer_exists(client, db_session):
    response = client.get("/api/v1/auth/seed")

    assert response.status_code == 404
    assert db_session.query(models.User).count() == 0


def test_login_with_old_default_credentials_does_not_create_admin(client, db_session):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@admin.com", "password": "admin"},
    )

    assert response.status_code == 401
    assert db_session.query(models.User).count() == 0
