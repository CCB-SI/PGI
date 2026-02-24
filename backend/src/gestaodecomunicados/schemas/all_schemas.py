from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#000000"

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# --- MinistryMember Schemas ---
class MinistryMemberBase(BaseModel):
    name: str
    role: str  # Ancião, Diácono, Examinadora, Encarregado Regional, Cooperador, etc.

class MinistryMemberCreate(MinistryMemberBase):
    pass

class MinistryMember(MinistryMemberBase):
    id: int

    class Config:
        from_attributes = True

# --- Schedule Schemas ---
class ScheduleBase(BaseModel):
    event_type: str
    day_of_week: str
    time: str
    recurrence: str
    specific_date: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class Schedule(ScheduleBase):
    id: int
    location_id: int

    class Config:
        from_attributes = True

# --- Location Schemas ---
class LocationBase(BaseModel):
    name: str
    address: str
    city: str = "Santa Isabel"
    description: Optional[str] = None
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_url: Optional[str] = None
    waze_url: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    map_url: Optional[str] = None
    waze_url: Optional[str] = None

class Location(LocationBase):
    id: int
    schedules: List[Schedule] = []
    members: List[MinistryMember] = []

    class Config:
        from_attributes = True

# --- Event Schemas ---
class EventBase(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: Optional[datetime] = None
    image_url: Optional[str] = None
    category: str = "Musical"
    category_id: int
    location_id: Optional[int] = None
    target_audience: str = "Público"
    instructions: Optional[str] = None

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    created_at: datetime
    category_obj: Optional[Category] = None
    location: Optional[Location] = None

    class Config:
        from_attributes = True

# --- News (Informativos) ---
class NewsBase(BaseModel):
    tag: str
    tag_color: Optional[str] = "#0d47a1"
    date: str
    title: str
    content: str
    target_audience: str = "Público"

class NewsCreate(NewsBase):
    pass

class NewsUpdate(NewsBase):
    pass

class News(NewsBase):
    id: int

    class Config:
        from_attributes = True

# --- Users & Auth ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "editor"

class UserOut(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
