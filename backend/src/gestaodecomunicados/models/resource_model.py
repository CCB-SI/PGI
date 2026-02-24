from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class DownloadCategory(Base):
    """Categorias de arquivos (ex: Circulares, Métodos, Escalas)"""
    __tablename__ = "download_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resources = relationship("Resource", back_populates="category_obj", cascade="all, delete-orphan")

class Resource(Base):
    """Arquivos para download (PDFs, Circulares, etc)"""
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    file_url = Column(String) # URL do arquivo
    file_type = Column(String) # PDF, DOC, IMG
    
    category_id = Column(Integer, ForeignKey("download_categories.id"), nullable=True)
    category_obj = relationship("DownloadCategory", back_populates="resources")
    
    # Keep category field for backward compatibility or as a label if needed, 
    # but we'll prioritize category_id
    category = Column(String, index=True) 
    
    is_external = Column(Boolean, default=False)
    external_url = Column(String, nullable=True)
    target_audience = Column(String, default="Público") # Público ou Ministerial
    
    created_at = Column(DateTime, default=datetime.utcnow)
