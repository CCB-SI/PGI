from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, Float, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

# Tabela de associação: Irmãos <-> Comuns (many-to-many)
location_members = Table(
    "location_members",
    Base.metadata,
    Column("location_id", Integer, ForeignKey("locations.id"), primary_key=True),
    Column("member_id", Integer, ForeignKey("ministry_members.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

class Category(Base):
    """Categorias de eventos (ex: Religioso, Cultural, Utilidade Pública)"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    color = Column(String, default="#000000")

    events = relationship("Event", back_populates="category")

class MinistryMember(Base):
    """Irmãos do Ministério – cadastro prévio"""
    __tablename__ = "ministry_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # Ancião, Diácono, Examinadora, etc.

    # Comuns onde este irmão atende
    locations = relationship("Location", secondary=location_members, back_populates="members")

class Location(Base):
    """Comuns – Igrejas da Regional SAI"""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    city = Column(String, default="Santa Isabel")
    description = Column(Text, nullable=True)

    # Foto
    photo_url = Column(String, nullable=True)

    # GPS
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    map_url = Column(String, nullable=True)

    # Relacionamentos
    events = relationship("Event", back_populates="location")
    schedules = relationship("Schedule", back_populates="location", cascade="all, delete-orphan")
    members = relationship("MinistryMember", secondary=location_members, back_populates="locations")

class Schedule(Base):
    """Horários estruturados de uma Comum"""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    event_type = Column(String, nullable=False)
    day_of_week = Column(String, nullable=False)
    time = Column(String, nullable=False)
    recurrence = Column(String, nullable=False)
    specific_date = Column(String, nullable=True)

    location = relationship("Location", back_populates="schedules")

class Event(Base):
    """O Comunicado ou Evento em si"""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    image_url = Column(String, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="events")

    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    location = relationship("Location", back_populates="events")

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User")

from .resource_model import Resource
