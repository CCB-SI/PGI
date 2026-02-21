from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Resource(Base):
    """Arquivos para download (PDFs, Circulares, etc)"""
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    file_url = Column(String) # URL do arquivo
    file_type = Column(String) # PDF, DOC, IMG
    category = Column(String, index=True) # Ex: "Administrativo", "Musical"
    created_at = Column(DateTime, default=datetime.utcnow)
