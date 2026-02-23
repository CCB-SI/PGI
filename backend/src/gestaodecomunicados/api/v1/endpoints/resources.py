import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from ....core.database import get_db
from ....models.resource_model import Resource, DownloadCategory
from ....schemas import resource_schema
from .. import auth

router = APIRouter()
UPLOAD_DIR = "/app/uploads/resources"

# --- Categories ---

@router.get("/download_categories", response_model=List[resource_schema.DownloadCategory])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(DownloadCategory).offset(skip).limit(limit).all()

@router.post("/download_categories", response_model=resource_schema.DownloadCategory, status_code=status.HTTP_201_CREATED)
def create_category(
    category: resource_schema.DownloadCategoryCreate, 
    db: Session = Depends(get_db),
    current_user: auth.models.User = Depends(auth.require_editor_or_admin)
):
    db_category = DownloadCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.put("/download_categories/{category_id}", response_model=resource_schema.DownloadCategory)
def update_category(
    category_id: int,
    category: resource_schema.DownloadCategoryCreate,
    db: Session = Depends(get_db),
    current_user: auth.models.User = Depends(auth.require_editor_or_admin)
):
    db_cat = db.query(DownloadCategory).filter(DownloadCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db_cat.name = category.name
    db_cat.description = category.description
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/download_categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: auth.models.User = Depends(auth.require_admin)
):
    db_cat = db.query(DownloadCategory).filter(DownloadCategory.id == category_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_cat)
    db.commit()
    return None

# --- Resources ---

@router.get("/resources", response_model=List[resource_schema.Resource])
def read_resources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    resources = db.query(Resource).order_by(Resource.created_at.desc()).offset(skip).limit(limit).all()
    return resources

@router.post("/resources", response_model=resource_schema.Resource, status_code=status.HTTP_201_CREATED)
async def create_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    is_external: bool = Form(False),
    external_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: auth.models.User = Depends(auth.require_editor_or_admin)
):
    f_url = None
    f_type = "LINK"
    
    if not is_external:
        if not file:
            raise HTTPException(status_code=400, detail="Arquivo é obrigatório para recursos internos")
        
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = file.filename.split(".")[-1] if file.filename else "file"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        f_url = f"/uploads/resources/{filename}"
        f_type = ext.upper()
    else:
        if not external_url:
            raise HTTPException(status_code=400, detail="URL externa é obrigatória")
        f_url = external_url
        # Try to guess type from URL if possible, or just stay as LINK
        if external_url.lower().endswith('.pdf'): f_type = "PDF"
        elif external_url.lower().endswith(('.jpg', '.png', '.webp')): f_type = "IMG"

    db_resource = Resource(
        title=title,
        description=description,
        file_url=f_url,
        file_type=f_type,
        category_id=category_id,
        category="Geral", # Default label
        is_external=is_external,
        external_url=external_url if is_external else None
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: auth.models.User = Depends(auth.require_admin)
):
    db_res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not db_res:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Optional: Delete file from disk
    try:
        if db_res.file_url.startswith("/uploads/resources/"):
            filename = db_res.file_url.split("/")[-1]
            os.remove(os.path.join(UPLOAD_DIR, filename))
    except:
        pass

    db.delete(db_res)
    db.commit()
    return None
