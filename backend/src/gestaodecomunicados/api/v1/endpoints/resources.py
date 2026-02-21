from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ....core.database import get_db
from ....models.resource_model import Resource
from ....schemas import resource_schema

router = APIRouter()

@router.get("/resources", response_model=List[resource_schema.Resource])
def read_resources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    resources = db.query(Resource).offset(skip).limit(limit).all()
    return resources

@router.post("/resources", response_model=resource_schema.Resource, status_code=status.HTTP_201_CREATED)
def create_resource(resource: resource_schema.ResourceCreate, db: Session = Depends(get_db)):
    db_resource = Resource(**resource.model_dump())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource
