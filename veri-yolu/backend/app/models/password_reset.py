from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timedelta


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token: str
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @staticmethod
    def default_expiry(hours: int = 1) -> datetime:
        return datetime.utcnow() + timedelta(hours=hours)


