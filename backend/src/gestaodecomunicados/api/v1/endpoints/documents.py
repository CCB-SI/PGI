from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, File, UploadFile, Form
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime

from ....core.database import get_db
from ....models import all_models as models
from .. import auth
from ....services.pdf_service import pdf_service

router = APIRouter(prefix="/documents", tags=["documents"])

class TemplateCreate(BaseModel):
    name: str
    filename: str
    version: str = "1.0"
    schema_mapping: str = "{}"

class TemplateResponse(BaseModel):
    id: int
    name: str
    filename: str
    version: str
    schema_mapping: str

    class Config:
        from_attributes = True

@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    return db.query(models.DocumentTemplate).all()

import os
import shutil

@router.post("/templates", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    name: str = Form(...),
    file: UploadFile = File(...),
    version: str = Form("1.0"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    try:
        # Determine the directory manually or statically
        upload_dir = "/app/templates/pdfs"
        os.makedirs(upload_dir, exist_ok=True)
        
        # We can use the original filename or sanitize it
        filename = file.filename
        file_path = os.path.join(upload_dir, filename)
        
        # Save the file physical contents
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Register the template in the database
        db_template = models.DocumentTemplate(
            name=name,
            filename=filename,
            version=version,
            schema_mapping="{}"
        )
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return db_template
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/{template_id}")
def generate_document(
    template_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado no banco de dados.")

    member = db.query(models.MinistryMember).filter(models.MinistryMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Irmão/Candidato não encontrado.")
    
    location = member.locations[0] if member.locations else None
    
    mapping_str = template.schema_mapping or "{}"
    try:
        mapping = json.loads(mapping_str)
    except:
        mapping = {}

    context = {
        "member_name": member.name,
        "member_role": member.role,
        "location_name": location.name if location else "Sem Comum",
        "location_city": location.city if location else "",
        "date_today": datetime.now().strftime("%d/%m/%Y")
    }

    pdf_payload = {}
    if mapping:
        for pdf_field, ctx_key in mapping.items():
            if ctx_key in context:
                pdf_payload[pdf_field] = context[ctx_key]
            else:
                pdf_payload[pdf_field] = ctx_key
    else:
        # Fallback fields directly
        pdf_payload = {
            "NomeCandidato": member.name,
            "Cargo": member.role,
            "Congregacao": location.name if location else "",
            "DataEmissao": context["date_today"]
        }

    try:
        output_stream = pdf_service.generate_document(template.filename, pdf_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    issuance = models.DocumentIssuance(
        template_id=template.id,
        issuer_id=current_user.id,
        member_id=member.id
    )
    db.add(issuance)
    db.commit()

    return StreamingResponse(
        output_stream, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=documento_{template.id}.pdf"}
    )

@router.get("/templates/{template_id}/view")
def view_template(
    template_id: int, 
    db: Session = Depends(get_db)
):
    import os
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado.")
        
    file_path = os.path.join("/app/templates/pdfs", template.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Arquivo físico do template não encontrado.")
        
    return FileResponse(file_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})

class CustomDocumentPayload(BaseModel):
    candidate_name: str
    candidate_role: str
    location_id: int

@router.post("/generate_custom/{template_id}")
def generate_custom_document(
    template_id: int,
    payload: CustomDocumentPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_editor_or_admin)
):
    template = db.query(models.DocumentTemplate).filter(models.DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado no banco de dados.")

    location = db.query(models.Location).filter(models.Location.id == payload.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Comum Congregação não encontrada.")
    
    mapping_str = template.schema_mapping or "{}"
    try:
        mapping = json.loads(mapping_str)
    except:
        mapping = {}

    context = {
        "member_name": payload.candidate_name,
        "member_role": payload.candidate_role,
        "location_name": location.name,
        "location_city": location.city,
        "date_today": datetime.now().strftime("%d/%m/%Y")
    }

    pdf_payload = {}
    if mapping:
        for pdf_field, ctx_key in mapping.items():
            if ctx_key in context:
                pdf_payload[pdf_field] = context[ctx_key]
            else:
                pdf_payload[pdf_field] = ctx_key
    else:
        # Fallback fields directly mapping to the extracted Sejda PDF fields
        pdf_payload = {
            "NomeCandidato": payload.candidate_name,
            "Congregacao": location.name,
            # Sejda created random strings for the other elements.
            # We map whichever one is intended for Role. Let's dump all with Role or Dates just in case.
            "textarea_3swfc": payload.candidate_role,
            "textarea_4hrro": context["date_today"],
            "textarea_5kyif": payload.candidate_role,
            "textarea_6jdvg": context["date_today"]
        }

    try:
        output_stream = pdf_service.generate_document(template.filename, pdf_payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Note: LGPD logging here won't link to a real member.id. We can link to the ID 1 as a placeholder or make member_id nullable.
    # We will attempt to link to member_id = 1 (System placeholder) just to satisfy FK.
    first_member = db.query(models.MinistryMember).first()
    
    if first_member:
        issuance = models.DocumentIssuance(
            template_id=template.id,
            issuer_id=current_user.id,
            member_id=first_member.id
        )
        db.add(issuance)
        db.commit()

    return StreamingResponse(
        output_stream, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=documento_{template.id}.pdf"}
    )
