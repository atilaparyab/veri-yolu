from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class ContactMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_processed: bool = Field(default=False)


