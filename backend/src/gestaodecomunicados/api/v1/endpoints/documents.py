import json
import logging
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ....core.database import get_db
from ....core.s3_storage import S3StorageError, s3_storage
from ....models import all_models as models
from ....services.audit_service import log_audit
from ....services.pdf_service import pdf_service
from .. import auth

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)


class TemplateResponse(BaseModel):
    id: int
    name: str
    filename: str
    version: str
    schema_mapping: str

    class Config:
        from_attributes = True


class DocumentIssuanceOut(BaseModel):
    id: int
    template_id: int
    template_name: str
    issuer_id: int
    issuer_email: Optional[str] = None
    member_id: int
    member_name: Optional[str] = None
    issued_at: datetime
    file_key: Optional[str] = None
    file_url: Optional[str] = None


class CustomDocumentPayload(BaseModel):
    candidate_name: str
    candidate_role: str
    location_id: int


def _store_template_binary(name: str, file: UploadFile) -> str:
    ext = file.filename.split(".")[-1].lower() if file.filename else "pdf"
    if ext != "pdf":
        raise HTTPException(status_code=400, detail="Apenas templates PDF são permitidos")

    safe_name = (file.filename or "template.pdf").replace(" ", "_")
    key = f"templates/pdfs/{name.strip().replace(' ', '_')}_{safe_name}"
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo de template vazio")

    if s3_storage.enabled:
        try:
            s3_storage.upload_bytes(content, key, content_type=file.content_type or "application/pdf")
            return key
        except S3StorageError as exc:
            raise HTTPException(status_code=500, detail=f"Falha no upload para S3: {exc}") from exc

    upload_dir = "/app/templates/pdfs"
    os.makedirs(upload_dir, exist_ok=True)
    with open(os.path.join(upload_dir, safe_name), "wb") as buffer:
        buffer.write(content)
    return safe_name


def _delete_template_binary(filename: Optional[str]) -> None:
    if not filename:
        return
    if s3_storage.enabled and not filename.startswith("/"):
        s3_storage.delete_object(filename)
        return
    local_path = os.path.join("/app/templates/pdfs", filename)
    if os.path.exists(local_path):
        os.remove(local_path)


def _store_generated_document(content: bytes, template: models.DocumentTemplate, document_name: str) -> tuple[str | None, str | None]:
    if not s3_storage.enabled:
        return None, None
    key = f"documents/generated/{template.id}/{document_name}"
    try:
        s3_storage.upload_bytes(content, key, content_type="application/pdf")
    except S3StorageError as exc:
        raise HTTPException(status_code=500, detail=f"Falha ao armazenar documento no S3: {exc}") from exc
    return key, s3_storage.build_url(key)


def _build_payload(template: models.DocumentTemplate, context: dict) -> dict:
    mapping_str = template.schema_mapping or "{}"
    try:
        mapping = json.loads(mapping_str)
    except Exception:
        mapping = {}

    if mapping:
        payload = {}
        for pdf_field, ctx_key in mapping.items():
            payload[pdf_field] = context.get(ctx_key, ctx_key)
        return payload

    return {
        "NomeCandidato": context.get("member_name", ""),
        "Cargo": context.get("member_role", ""),
        "Congregacao": context.get("location_name", ""),
        "DataEmissao": context.get("date_today", ""),
    }


@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    return db.query(models.DocumentTemplate).all()


@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    name: str = Form(...),
    file: UploadFile = File(...),
    version: str = Form("1.0"),
    schema_mapping: str = Form("{}"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    stored_reference = _store_template_binary(name, file)

    db_template = models.DocumentTemplate(
        name=name,
        filename=stored_reference,
        version=version,
        schema_mapping=schema_mapping or "{}",
    )
    db.add(db_template)
    log_audit(
        db,
        action="document_template_created",
        entity_type="document_template",
        entity_id=None,
        actor_id=current_user.id,
        details={"name": name, "version": version, "filename": stored_reference},
    )
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    name: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    schema_mapping: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    old_filename = template.filename
    if name is not None:
        template.name = name
    if version is not None:
        template.version = version
    if schema_mapping is not None:
        template.schema_mapping = schema_mapping
    if file is not None:
        target_name = template.name if name is None else name
        template.filename = _store_template_binary(target_name, file)
        _delete_template_binary(old_filename)

    log_audit(
        db,
        action="document_template_updated",
        entity_type="document_template",
        entity_id=str(template.id),
        actor_id=current_user.id,
        details={"name": template.name, "version": template.version, "filename": template.filename},
    )
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    template = (
        db.query(models.DocumentTemplate)
        .options(joinedload(models.DocumentTemplate.issuances))
        .filter(models.DocumentTemplate.id == template_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")

    for issuance in template.issuances:
        if issuance.file_key:
            s3_storage.delete_object(issuance.file_key)
        elif issuance.file_url:
            s3_storage.delete_object(issuance.file_url)

    _delete_template_binary(template.filename)

    log_audit(
        db,
        action="document_template_deleted",
        entity_type="document_template",
        entity_id=str(template.id),
        actor_id=current_user.id,
        details={"name": template.name, "filename": template.filename},
    )
    db.delete(template)
    db.commit()
    return None


@router.get("/issuances", response_model=List[DocumentIssuanceOut])
def list_issuances(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    rows = (
        db.query(models.DocumentIssuance)
        .options(
            joinedload(models.DocumentIssuance.template),
            joinedload(models.DocumentIssuance.issuer),
            joinedload(models.DocumentIssuance.member),
        )
        .order_by(models.DocumentIssuance.issued_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        DocumentIssuanceOut(
            id=row.id,
            template_id=row.template_id,
            template_name=row.template.name if row.template else "",
            issuer_id=row.issuer_id,
            issuer_email=row.issuer.email if row.issuer else None,
            member_id=row.member_id,
            member_name=row.member.name if row.member else None,
            issued_at=row.issued_at,
            file_key=row.file_key,
            file_url=row.file_url,
        )
        for row in rows
    ]


@router.delete("/issuances/{issuance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_issuance(
    issuance_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    issuance = db.query(models.DocumentIssuance).filter(models.DocumentIssuance.id == issuance_id).first()
    if not issuance:
        raise HTTPException(status_code=404, detail="Documento emitido não encontrado")

    if issuance.file_key:
        s3_storage.delete_object(issuance.file_key)
    elif issuance.file_url:
        s3_storage.delete_object(issuance.file_url)

    log_audit(
        db,
        action="document_issuance_deleted",
        entity_type="document_issuance",
        entity_id=str(issuance.id),
        actor_id=current_user.id,
        details={"template_id": issuance.template_id, "file_key": issuance.file_key},
    )
    db.delete(issuance)
    db.commit()
    return None


@router.post("/generate/{template_id}")
def generate_document(
    template_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado no banco de dados.")

    member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Irmão/Candidato não encontrado.")

    location = member.locations[0] if member.locations else None
    context = {
        "member_name": member.name,
        "member_role": member.role,
        "location_name": location.name if location else "Sem Comum",
        "location_city": location.city if location else "",
        "date_today": datetime.now().strftime("%d/%m/%Y"),
    }
    pdf_payload = _build_payload(template, context)

    try:
        output_stream = pdf_service.generate_document(template.filename, pdf_payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    output_bytes = output_stream.getvalue()
    document_name = f"documento_{template.id}_{member.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
    file_key, file_url = _store_generated_document(output_bytes, template, document_name)

    issuance = models.DocumentIssuance(
        template_id=template.id,
        issuer_id=current_user.id,
        member_id=member.id,
        file_key=file_key,
        file_url=file_url,
    )
    db.add(issuance)
    log_audit(
        db,
        action="document_generated",
        entity_type="document_issuance",
        entity_id=None,
        actor_id=current_user.id,
        details={"template_id": template.id, "member_id": member.id, "file_key": file_key},
    )
    db.commit()

    return StreamingResponse(
        iter([output_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=documento_{template.id}.pdf"},
    )


@router.get("/templates/{template_id}/view")
def view_template(template_id: int, db: Session = Depends(get_db)):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado.")

    if s3_storage.enabled:
        try:
            payload = s3_storage.download_bytes(template.filename)
            logger.info("documents.template.view source=s3 template_id=%s key=%s", template.id, template.filename)
            return StreamingResponse(
                iter([payload]),
                media_type="application/pdf",
                headers={"Content-Disposition": "inline"},
            )
        except S3StorageError:
            logger.warning("documents.template.view source=s3_fallback template_id=%s key=%s", template.id, template.filename)

    file_path = os.path.join("/app/templates/pdfs", template.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo físico do template não encontrado.")

    logger.info("documents.template.view source=local template_id=%s path=%s", template.id, file_path)
    return FileResponse(file_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})


@router.post("/generate_custom/{template_id}")
def generate_custom_document(
    template_id: int,
    payload: CustomDocumentPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin),
):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado no banco de dados.")

    location = db.query(models.Location).filter(models.Location.id == payload.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum Congregação não encontrada.")

    context = {
        "member_name": payload.candidate_name,
        "member_role": payload.candidate_role,
        "location_name": location.name,
        "location_city": location.city,
        "date_today": datetime.now().strftime("%d/%m/%Y"),
    }
    pdf_payload = _build_payload(template, context)
    # Backward compatibility for older templates with Sejda random names.
    pdf_payload.setdefault("textarea_3swfc", payload.candidate_role)
    pdf_payload.setdefault("textarea_4hrro", context["date_today"])
    pdf_payload.setdefault("textarea_5kyif", payload.candidate_role)
    pdf_payload.setdefault("textarea_6jdvg", context["date_today"])

    try:
        output_stream = pdf_service.generate_document(template.filename, pdf_payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    output_bytes = output_stream.getvalue()
    first_member = db.query(models.MinistryMember).first()
    file_key = None
    file_url = None
    if first_member:
        document_name = f"documento_{template.id}_{first_member.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
        file_key, file_url = _store_generated_document(output_bytes, template, document_name)

        issuance = models.DocumentIssuance(
            template_id=template.id,
            issuer_id=current_user.id,
            member_id=first_member.id,
            file_key=file_key,
            file_url=file_url,
        )
        db.add(issuance)

    log_audit(
        db,
        action="document_generated_custom",
        entity_type="document_issuance",
        entity_id=None,
        actor_id=current_user.id,
        details={"template_id": template.id, "location_id": location.id, "file_key": file_key},
    )
    db.commit()

    return StreamingResponse(
        iter([output_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=documento_{template.id}.pdf"},
    )
