from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

# Usando SQLite por enquanto para facilitar
SQLALCHEMY_DATABASE_URL = "sqlite:///./gestaodecomunicados.db"
# Para Postgres production usaríamos:
# SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL 

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
