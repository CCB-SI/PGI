import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..models import all_models as models


def log_audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    actor_id: Optional[int] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    payload = None
    if details is not None:
        payload = json.dumps(details, ensure_ascii=False)

    db.add(
        models.AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            details=payload,
        )
    )
