from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime, date  # ✅ date eklendi

class RoleEnum(str, Enum):
    admin = "admin"
    project_owner = "proje_yoneticisi"
    annotator = "etiketleyici"
    user = "kullanıcı"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = True
    is_verified: bool = False
    role: RoleEnum = Field(default=RoleEnum.user)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    points: int = 0
    profile_image: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})

    # ✅ Yeni alanlar (login streak için)
    about: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})
    last_login: Optional[date] = Field(default=None, sa_column_kwargs={"nullable": True})
    streak: int = Field(default=0)

