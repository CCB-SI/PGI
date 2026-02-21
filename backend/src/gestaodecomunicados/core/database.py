from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings
import os

# Pega o DATABASE_URL do environment ou usa um fallback local
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gestaodecomunicados.db")

# Garante que o diretório do SQLite exista
if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
