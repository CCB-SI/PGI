def test_create_and_list_custom_event_types(client, admin_auth_headers):
    payload = {
        "name": "Reunião de Apoio",
        "scope": "Ministerial",
    }

    create_response = client.post("/api/v1/event-types", json=payload, headers=admin_auth_headers)
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["name"] == "Reunião de Apoio"
    assert created["scope"] == "Ministerial"

    list_response = client.get("/api/v1/event-types")
    assert list_response.status_code == 200, list_response.text
    body = list_response.json()

    assert "custom" in body
    assert any(item["name"] == "Reunião de Apoio" for item in body["custom"])
    assert "Reunião de Apoio" in body["all"]


def test_reject_duplicate_custom_event_type(client, admin_auth_headers):
    payload = {
        "name": "RMA Local",
        "scope": "Administrativa",
    }

    first = client.post("/api/v1/event-types", json=payload, headers=admin_auth_headers)
    assert first.status_code == 201, first.text

    second = client.post("/api/v1/event-types", json=payload, headers=admin_auth_headers)
    assert second.status_code == 400
    assert "já cadastrado" in second.json()["detail"]


def test_event_type_creation_requires_editor_or_admin(client):
    payload = {
        "name": "Tipo sem autenticação",
        "scope": "Administrativa",
    }

    response = client.post("/api/v1/event-types", json=payload)
    assert response.status_code == 401
