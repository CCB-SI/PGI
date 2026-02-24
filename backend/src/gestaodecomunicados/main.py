from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .api.v1.router import api_router
from .core.database import engine, Base
from .models import all_models  # Importa modelos para registrar no SQLAlchemy
import os

from .core.database import SessionLocal
from .core.security import get_password_hash

# Criar tabelas no banco de dados
Base.metadata.create_all(bind=engine)

def migrate_db():
    """Garante que colunas novas existam em tabelas já criadas"""
    import sqlite3
    db_url = os.getenv("DATABASE_URL", "sqlite:///./gestaodecomunicados.db")
    if db_url.startswith("sqlite:///"):
        path = db_url.replace("sqlite:///", "")
        if os.path.exists(path):
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(resources)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'category_id' not in columns:
                print("Migrating database: adding category_id to resources...")
                cursor.execute("ALTER TABLE resources ADD COLUMN category_id INTEGER REFERENCES download_categories(id)")
            if 'is_external' not in columns:
                print("Migrating database: adding is_external to resources...")
                cursor.execute("ALTER TABLE resources ADD COLUMN is_external BOOLEAN DEFAULT 0")
            if 'external_url' not in columns:
                print("Migrating database: adding external_url to resources...")
                cursor.execute("ALTER TABLE resources ADD COLUMN external_url TEXT")
            if 'target_audience' not in columns:
                print("Migrating database: adding target_audience to resources...")
                cursor.execute("ALTER TABLE resources ADD COLUMN target_audience TEXT DEFAULT 'Público'")
            
            # Migration for news
            cursor.execute("PRAGMA table_info(news)")
            news_columns = [row[1] for row in cursor.fetchall()]
            if 'target_audience' not in news_columns:
                print("Migrating database: adding target_audience to news...")
                cursor.execute("ALTER TABLE news ADD COLUMN target_audience TEXT DEFAULT 'Público'")

            # Migration for locations
            cursor.execute("PRAGMA table_info(locations)")
            loc_columns = [row[1] for row in cursor.fetchall()]
            if 'waze_url' not in loc_columns:
                print("Migrating database: adding waze_url to locations...")
                cursor.execute("ALTER TABLE locations ADD COLUMN waze_url TEXT")

            # Migration for events
            cursor.execute("PRAGMA table_info(events)")
            evt_columns = [row[1] for row in cursor.fetchall()]
            if 'target_audience' not in evt_columns:
                print("Migrating database: adding target_audience to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN target_audience TEXT DEFAULT 'Público'")
            if 'category' not in evt_columns:
                print("Migrating database: adding category to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'Musical'")
            if 'instructions' not in evt_columns:
                print("Migrating database: adding instructions to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN instructions TEXT")

            conn.commit()
            conn.close()

migrate_db()

def init_db():
    db = SessionLocal()
    admin_user = db.query(all_models.User).filter(all_models.User.email == "admin@secretaria.com").first()
    if not admin_user:
        hashed_password = get_password_hash("admin")
        db_user = all_models.User(email="admin@secretaria.com", password_hash=hashed_password, role="admin")
        db.add(db_user)
        db.commit()
    db.close()

init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar diretório de uploads como arquivos estáticos
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

@app.get("/")
async def root():
    return {"message": "Bem-vindo à API Gestão de Comunicados"}
