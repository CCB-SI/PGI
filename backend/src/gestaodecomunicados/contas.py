"""Contas de acesso pela linha de comando, dentro do container do backend.

    python -m gestaodecomunicados.contas criar-admin <e-mail>
    python -m gestaodecomunicados.contas trocar-senha <e-mail>

A senha vem da variável NOVA_SENHA; sem ela, é gerada e impressa uma única vez.
Uso no servidor: docs/DEPLOY.md, seção "Contas de acesso".
"""

import argparse
import os
import secrets
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError

from .core.database import SessionLocal
from .core.security import get_password_hash
from .models import all_models as models

MIN_PASSWORD_LENGTH = 10


class AccountError(Exception):
    pass


def _has_letter_and_digit(password: str) -> bool:
    return any(char.isalpha() for char in password) and any(char.isdigit() for char in password)


def validate_password(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH or not _has_letter_and_digit(password):
        raise AccountError(
            f"A senha precisa de pelo menos {MIN_PASSWORD_LENGTH} caracteres, com letras e números."
        )


def generate_password() -> str:
    while True:
        password = secrets.token_urlsafe(18)
        if _has_letter_and_digit(password):
            return password


def create_admin(db, email: str, password: str) -> models.User:
    try:
        email = TypeAdapter(EmailStr).validate_python(email)
    except ValidationError:
        raise AccountError(f"E-mail inválido: {email}") from None
    if db.query(models.User).filter(models.User.email == email).first():
        raise AccountError(
            f"Já existe uma conta com o e-mail {email}. Para trocar a senha: trocar-senha."
        )
    validate_password(password)
    user = models.User(email=email, password_hash=get_password_hash(password), role="admin")
    db.add(user)
    db.commit()
    return user


def change_password(db, email: str, password: str) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise AccountError(f"Nenhuma conta com o e-mail {email}.")
    validate_password(password)
    user.password_hash = get_password_hash(password)
    db.commit()
    return user


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m gestaodecomunicados.contas",
        description="Cria administrador ou troca senha. A senha vem de NOVA_SENHA ou é gerada.",
    )
    actions = parser.add_subparsers(dest="action", required=True)
    actions.add_parser("criar-admin", help="cria um administrador").add_argument("email")
    actions.add_parser("trocar-senha", help="troca a senha de uma conta").add_argument("email")
    args = parser.parse_args(argv)

    informed_password = os.environ.get("NOVA_SENHA")
    password = informed_password or generate_password()
    email = args.email.strip()

    db = SessionLocal()
    try:
        if args.action == "criar-admin":
            user = create_admin(db, email, password)
            print(f"Administrador {user.email} criado.")
        else:
            user = change_password(db, email, password)
            print(f"Senha de {user.email} trocada.")
    except AccountError as error:
        print(error, file=sys.stderr)
        return 1
    finally:
        db.close()

    if informed_password:
        print("Senha: a informada em NOVA_SENHA.")
    else:
        print("Senha gerada, mostrada só desta vez (guarde num cofre de senhas):")
        print(password)
    return 0


if __name__ == "__main__":
    sys.exit(main())
