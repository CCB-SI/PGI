import pytest

from gestaodecomunicados import contas
from gestaodecomunicados.core.security import get_password_hash
from gestaodecomunicados.models import all_models as models


@pytest.fixture()
def cli(db_session, monkeypatch):
    monkeypatch.setattr(contas, "SessionLocal", lambda: db_session)
    monkeypatch.delenv("NOVA_SENHA", raising=False)
    return contas.main


def _login(client, email, password):
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


def _add_user(db_session, email, password, role):
    db_session.add(models.User(email=email, password_hash=get_password_hash(password), role=role))
    db_session.commit()


def test_create_admin_with_generated_password(cli, client, capsys):
    assert cli(["criar-admin", "primeiro.admin@teste.com"]) == 0

    password = capsys.readouterr().out.strip().splitlines()[-1]
    response = _login(client, "primeiro.admin@teste.com", password)
    assert response.status_code == 200, response.text
    assert response.json()["user"]["role"] == "admin"


def test_create_admin_with_password_from_env_does_not_print_it(cli, client, capsys, monkeypatch):
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")

    assert cli(["criar-admin", "admin.env@teste.com"]) == 0

    assert "senhadeteste123" not in capsys.readouterr().out
    assert _login(client, "admin.env@teste.com", "senhadeteste123").status_code == 200


def test_create_admin_rejects_weak_password(cli, db_session, monkeypatch):
    monkeypatch.setenv("NOVA_SENHA", "curta1")

    assert cli(["criar-admin", "admin.fraca@teste.com"]) == 1
    assert db_session.query(models.User).count() == 0


def test_create_admin_rejects_password_longer_than_bcrypt_accepts(cli, db_session, monkeypatch):
    monkeypatch.setenv("NOVA_SENHA", "senha1" * 13)  # 78 bytes; o bcrypt só aceita até 72

    assert cli(["criar-admin", "admin.longa@teste.com"]) == 1
    assert db_session.query(models.User).count() == 0


def test_create_admin_rejects_invalid_email(cli, db_session, monkeypatch):
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")

    assert cli(["criar-admin", "nao-e-email"]) == 1
    assert db_session.query(models.User).count() == 0


def test_create_admin_refuses_existing_email(cli, db_session, monkeypatch):
    _add_user(db_session, "ja.existe@teste.com", "antiga12345", "editor")
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")

    assert cli(["criar-admin", "ja.existe@teste.com"]) == 1
    user = db_session.query(models.User).filter_by(email="ja.existe@teste.com").one()
    assert user.role == "editor"


def test_change_password_replaces_the_old_one(cli, client, db_session, monkeypatch):
    _add_user(db_session, "conta.antiga@teste.com", "admin", "admin")
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")

    assert cli(["trocar-senha", "conta.antiga@teste.com"]) == 0

    assert _login(client, "conta.antiga@teste.com", "admin").status_code == 401
    assert _login(client, "conta.antiga@teste.com", "senhadeteste123").status_code == 200


def test_change_password_with_generated_password(cli, client, db_session, capsys):
    _add_user(db_session, "conta.gerada@teste.com", "admin", "admin")

    assert cli(["trocar-senha", "conta.gerada@teste.com"]) == 0

    password = capsys.readouterr().out.strip().splitlines()[-1]
    assert _login(client, "conta.gerada@teste.com", password).status_code == 200


def test_change_password_finds_the_account_by_the_email_typed_on_creation(cli, client, monkeypatch):
    # criar-admin grava o domínio em minúsculas; trocar-senha precisa achar a conta do mesmo jeito
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")
    assert cli(["criar-admin", "Chefe@Exemplo.COM.br"]) == 0

    monkeypatch.setenv("NOVA_SENHA", "outrasenha456")
    assert cli(["trocar-senha", "Chefe@Exemplo.COM.br"]) == 0

    assert _login(client, "Chefe@exemplo.com.br", "outrasenha456").status_code == 200


def test_change_password_of_unknown_email_fails(cli, monkeypatch):
    monkeypatch.setenv("NOVA_SENHA", "senhadeteste123")

    assert cli(["trocar-senha", "ninguem@teste.com"]) == 1
