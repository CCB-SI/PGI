import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....models import all_models as models
from .. import auth

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    actor_id: Optional[int] = None
    actor_email: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime


@router.get("/logs", response_model=List[AuditLogOut])
def list_audit_logs(
    skip: int = 0,
    limit: int = 200,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    query = db.query(models.AuditLog)
    if entity_type:
        query = query.filter(models.AuditLog.entity_type.ilike(f"%{entity_type}%"))
    if action:
        query = query.filter(models.AuditLog.action.ilike(f"%{action}%"))
    if start_date:
        query = query.filter(models.AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(models.AuditLog.created_at <= end_date)

    rows = (
        query.order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result: List[AuditLogOut] = []
    for row in rows:
        parsed_details = None
        if row.details:
            try:
                parsed_details = json.loads(row.details)
            except Exception:
                parsed_details = {"raw": row.details}

        result.append(
            AuditLogOut(
                id=row.id,
                action=row.action,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                actor_id=row.actor_id,
                actor_email=row.actor.email if row.actor else None,
                details=parsed_details,
                created_at=row.created_at,
            )
        )

    return result
