import hashlib
import os
from datetime import datetime, timedelta

import pytest
from jose import jwt
from pydantic import ValidationError

from gestaodecomunicados.core import config
from gestaodecomunicados.core.security import get_password_hash
from gestaodecomunicados.models import all_models as models


def test_backend_refuses_to_start_without_jwt_secret(boot_backend):
    # Marcador curto: o pydantic encurta valor longo na mensagem de erro e o teste não veria o vazamento
    result = boot_backend(JWT_SECRET_KEY=None, AWS_SECRET_ACCESS_KEY="vaza1234")

    assert result.returncode != 0
    assert "JWT_SECRET_KEY" in result.stderr
    assert "vaza1234" not in result.stderr


def test_backend_refuses_short_jwt_secret_without_echoing_it(boot_backend):
    result = boot_backend(JWT_SECRET_KEY="segredo-curto")

    assert result.returncode != 0
    assert "JWT_SECRET_KEY" in result.stderr
    assert "segredo-curto" not in result.stderr


def test_jwt_secret_that_leaked_is_refused(monkeypatch):
    # O valor real vazado não entra no teste: a lista guarda só o sha256 dele
    leaked = "valor-que-ja-esteve-no-codigo-" * 2
    monkeypatch.setattr(
        config,
        "LEAKED_JWT_SECRET_SHA256",
        {hashlib.sha256(leaked.encode()).hexdigest()},
        raising=False,
    )

    with pytest.raises(ValidationError) as error:
        config.Settings(JWT_SECRET_KEY=leaked)

    assert "JWT_SECRET_KEY" in str(error.value)
    assert leaked not in str(error.value)


def _admin_token(db_session, secret):
    db_session.add(
        models.User(
            email="admin.jwt@test.com",
            password_hash=get_password_hash("admin123"),
            role="admin",
        )
    )
    db_session.commit()
    expire = datetime.utcnow() + timedelta(minutes=5)
    return jwt.encode({"sub": "admin.jwt@test.com", "exp": expire}, secret, algorithm="HS256")


def test_token_signed_with_configured_secret_is_accepted(client, db_session):
    token = _admin_token(db_session, os.environ["JWT_SECRET_KEY"])

    response = client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200, response.text


def test_token_signed_with_another_secret_is_rejected(client, db_session):
    token = _admin_token(db_session, "outro-segredo-" * 3)

    response = client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
