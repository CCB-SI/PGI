from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: str
    file_type: str
    category: str = "Geral"

class ResourceCreate(ResourceBase):
    pass

class Resource(ResourceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
