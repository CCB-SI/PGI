from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DownloadCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class DownloadCategoryCreate(DownloadCategoryBase):
    pass

class DownloadCategory(DownloadCategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    category_id: Optional[int] = None
    category: str = "Geral"
    is_external: bool = False
    external_url: Optional[str] = None
    target_audience: str = "Público"

class ResourceCreate(ResourceBase):
    pass

class Resource(ResourceBase):
    id: int
    created_at: datetime
    category_obj: Optional[DownloadCategory] = None

    class Config:
        from_attributes = True
