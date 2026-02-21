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
