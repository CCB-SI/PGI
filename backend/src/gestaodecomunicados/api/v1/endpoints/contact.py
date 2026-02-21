from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter()

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/contact", status_code=status.HTTP_200_OK)
def send_contact_message(contact: ContactMessage):
    # Mock sending email
    print(f"--- Novo Contato Recebido ---")
    print(f"De: {contact.name} <{contact.email}>")
    print(f"Assunto: {contact.subject}")
    print(f"Mensagem: {contact.message}")
    print(f"-----------------------------")
    return {"message": "Mensagem enviada com sucesso! Em breve entraremos em contato."}
