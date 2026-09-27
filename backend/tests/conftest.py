import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = BACKEND_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# A configuração é lida no import do app: o segredo de teste entra antes dele.
os.environ.setdefault("JWT_SECRET_KEY", "segredo-de-teste-" * 3)

from gestaodecomunicados.api.v1.router import api_router
from gestaodecomunicados.core.database import Base, get_db
from gestaodecomunicados.models import all_models as models


@pytest.fixture()
def db_session(tmp_path):
    db_file = tmp_path / "test_api.db"
    engine = create_engine(f"sqlite:///{db_file}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    app = FastAPI()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.include_router(api_router, prefix="/api/v1")

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def boot_backend(tmp_path):
    """Importa o app num processo novo, como o uvicorn faz ao subir o backend.

    Variável com valor None sai do ambiente do processo.
    """

    def run(code="import gestaodecomunicados.main", **env_overrides):
        env = {
            **os.environ,
            "PYTHONPATH": str(SRC_DIR),
            "DATABASE_URL": f"sqlite:///{tmp_path / 'boot.db'}",
        }
        for name, value in env_overrides.items():
            if value is None:
                env.pop(name, None)
            else:
                env[name] = value
        # cwd no tmp_path: nenhum .env de desenvolvimento entra no teste
        return subprocess.run(
            [sys.executable, "-c", code],
            cwd=tmp_path,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )

    return run


@pytest.fixture()
def admin_auth_headers(client, db_session):
    from gestaodecomunicados.core.security import get_password_hash

    admin_user = models.User(
        email="admin@test.com",
        password_hash=get_password_hash("admin123"),
        role="admin",
    )
    db_session.add(admin_user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@test.com", "password": "admin123"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def ministerial_auth_headers(client, db_session):
    from gestaodecomunicados.core.security import get_password_hash

    ministerial_user = models.User(
        email="ministerial@test.com",
        password_hash=get_password_hash("ministerial123"),
        role="ministerial",
    )
    db_session.add(ministerial_user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": "ministerial@test.com", "password": "ministerial123"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def seed_reference_data(db_session):
    category = models.Category(name="Administrativo", description="Eventos administrativos", color="#333333")

    loc_jardim = models.Location(
        name="Jardim das Acácias",
        address="Rua 1",
        city="Santa Isabel",
    )
    loc_redentor = models.Location(
        name="Igreja do Redentor",
        address="Rua 2",
        city="Santa Isabel",
    )
    loc_gopouva = models.Location(
        name="Gopouva (Guarulhos)",
        address="Rua 3",
        city="Guarulhos",
    )

    db_session.add_all([category, loc_jardim, loc_redentor, loc_gopouva])
    db_session.commit()

    db_session.refresh(category)
    db_session.refresh(loc_jardim)
    db_session.refresh(loc_redentor)
    db_session.refresh(loc_gopouva)

    return {
        "category": category,
        "jardim": loc_jardim,
        "redentor": loc_redentor,
        "gopouva": loc_gopouva,
    }
