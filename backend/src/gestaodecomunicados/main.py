from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .api.v1.router import api_router
from .core.database import engine, Base
from .models import all_models  # Importa modelos para registrar no SQLAlchemy
import os

from .core.database import SessionLocal

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

            cursor.execute("PRAGMA table_info(document_issuances)")
            issuance_columns = [row[1] for row in cursor.fetchall()]
            if 'file_key' not in issuance_columns:
                print("Migrating database: adding file_key to document_issuances...")
                cursor.execute("ALTER TABLE document_issuances ADD COLUMN file_key TEXT")
            if 'file_url' not in issuance_columns:
                print("Migrating database: adding file_url to document_issuances...")
                cursor.execute("ALTER TABLE document_issuances ADD COLUMN file_url TEXT")

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
            if 'event_type' not in evt_columns:
                print("Migrating database: adding event_type to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'Reunião Administrativa'")
            if 'agenda_scope' not in evt_columns:
                print("Migrating database: adding agenda_scope to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN agenda_scope TEXT DEFAULT 'Administrativa'")
            if 'space_name' not in evt_columns:
                print("Migrating database: adding space_name to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN space_name TEXT")
            if 'estimated_people' not in evt_columns:
                print("Migrating database: adding estimated_people to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN estimated_people INTEGER")
            if 'duration_minutes' not in evt_columns:
                print("Migrating database: adding duration_minutes to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN duration_minutes INTEGER")
            if 'serve_meals' not in evt_columns:
                print("Migrating database: adding serve_meals to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN serve_meals BOOLEAN DEFAULT 0")
            if 'is_online' not in evt_columns:
                print("Migrating database: adding is_online to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN is_online BOOLEAN DEFAULT 0")
            if 'recurrence_rule' not in evt_columns:
                print("Migrating database: adding recurrence_rule to events...")
                cursor.execute("ALTER TABLE events ADD COLUMN recurrence_rule TEXT")

            conn.commit()
            conn.close()

migrate_db()

def init_db():
    db = SessionLocal()
    # Administrador não nasce com senha fixa: é criado pela linha de comando (docs/DEPLOY.md)
    if not db.query(all_models.User).filter(all_models.User.role == "admin").first():
        print(
            "Nenhum administrador cadastrado. Crie o primeiro com: "
            "uv run python -m gestaodecomunicados.contas criar-admin <e-mail>"
        )

    reference_locations = [
        {
            "name": "Jardim das Acácias",
            "address": "Santa Isabel - SP",
            "city": "Santa Isabel",
            "description": "Referência logística: Salão Principal (300) e Sala de Reuniões (60).",
        },
        {
            "name": "Igreja do Redentor",
            "address": "Santa Isabel - SP",
            "city": "Santa Isabel",
            "description": "Referência logística: capacidade 300 pessoas.",
        },
        {
            "name": "Gopouva (Guarulhos)",
            "address": "Guarulhos - SP",
            "city": "Guarulhos",
            "description": "Local padrão para RRM.",
        },
    ]

    for loc in reference_locations:
        existing = db.query(all_models.Location).filter(all_models.Location.name == loc["name"]).first()
        if not existing:
            db.add(all_models.Location(**loc))

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
