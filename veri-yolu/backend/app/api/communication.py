from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, constr
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.contact_message import ContactMessage
from typing import List
from app.api.admin import require_admin


router = APIRouter()


class ContactMessageCreate(BaseModel):
    subject: constr(min_length=1)
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr
    message: constr(min_length=1)


@router.post("/", status_code=201)
def create_contact_message(data: ContactMessageCreate, session: Session = Depends(get_session)):
    msg = ContactMessage(
        subject=data.subject,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        message=data.message,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return {"id": msg.id, "detail": "Mesajınız alınmıştır."}


@router.get("/", response_model=List[ContactMessage])
def list_contact_messages(
    session: Session = Depends(get_session), _=Depends(require_admin)
):
    return session.exec(select(ContactMessage)).all()


