from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import Session, select
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.core.security import verify_password, hash_password, create_access_token
from app.db.session import get_session
from typing import Optional
import secrets
from datetime import datetime, date
from app.models.password_reset import PasswordResetToken

from fastapi import Path

router = APIRouter()


# Giriş ve kayıt için gelen JSON verisini tanımlayan modeller
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(data: RegisterRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if user:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı.")
    
    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        is_verified=False,
        role=RoleEnum.user
    )
    session.add(new_user)
    session.commit()
    return {"message": "Kayıt başarılı. Lütfen e-postanızı onaylayın."}


@router.post("/login")
def login(data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Geçersiz giriş bilgileri.")

    # ✅ Giriş serisi (streak) güncelle
    today = date.today()
    if getattr(user, "last_login", None):
        delta = (today - user.last_login).days
        if delta == 0:
            pass
        elif delta == 1:
            user.streak = (user.streak or 0) + 1
        else:
            user.streak = 1
    else:
        user.streak = 1
    user.last_login = today

    session.add(user)
    session.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_verified": user.is_verified,
            "profile_image": user.profile_image,
            "points": user.points,
            "streak": user.streak,
            "about": user.about   # ✅ eklendi
        }
    }


@router.get("/me")
def get_user_info(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "profile_image": user.profile_image,
        "points": user.points,
        "streak": user.streak,
        "about": user.about   # ✅ eklendi
    }


class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    about: Optional[str] = None


@router.put("/me")
def update_user_info(
    email: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    profile_image: Optional[UploadFile] = File(None),
    about: Optional[str] = Form(None),   # ✅ yeni alan
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    updated = False
    if email and email != user.email:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu e-posta zaten kullanılıyor.")
        user.email = email
        updated = True
    if password:
        from app.core.security import hash_password
        user.hashed_password = hash_password(password)
        updated = True
    if profile_image:
        import os, time
        os.makedirs("uploaded_images", exist_ok=True)
        file_ext = os.path.splitext(profile_image.filename)[1]
        timestamp = int(time.time())
        file_name = f"user_{user.id}_{timestamp}{file_ext}"
        file_path = os.path.join("uploaded_images", file_name)
        with open(file_path, "wb") as buffer:
            buffer.write(profile_image.file.read())
        user.profile_image = file_name
        updated = True
    if about is not None:   # ✅ eklendi
        user.about = about
        updated = True

    if updated:
        session.add(user)
        session.commit()
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "profile_image": user.profile_image,
        "points": user.points,
        "streak": user.streak,
        "about": user.about   # ✅ eklendi
    }


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user:
        return {"detail": "If the email exists, a reset link has been sent."}
    token_str = secrets.token_urlsafe(32)
    prt = PasswordResetToken(
        user_id=user.id,
        token=token_str,
        expires_at=PasswordResetToken.default_expiry(hours=2),
    )
    session.add(prt)
    session.commit()
    reset_url = f"http://localhost:3000/reset-password?token={token_str}"
    print("Password reset URL:", reset_url)
    return {"detail": "If the email exists, a reset link has been sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, session: Session = Depends(get_session)):
    prt = session.exec(select(PasswordResetToken).where(PasswordResetToken.token == data.token)).first()
    if not prt or prt.used or prt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token geçersiz veya süresi dolmuş")
    user = session.get(User, prt.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.hashed_password = hash_password(data.new_password)
    prt.used = True
    session.add(user)
    session.add(prt)
    session.commit()
    return {"detail": "Şifre güncellendi"}


@router.get("/users/search")
def search_users(q: str = Query(..., min_length=1), session: Session = Depends(get_session)):
    users = session.exec(select(User).where(User.email.contains(q))).all()
    return [
        {"id": u.id, "email": u.email, "role": u.role, "about": u.about} for u in users  # ✅ about dahil
    ]




@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int = Path(..., ge=1),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Sadece güvenli alanları döndürüyoruz
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "profile_image": user.profile_image,
        "points": user.points,
        "streak": user.streak,
        "about": user.about,  # 👈 ÖNEMLİ
        "created_at": user.created_at,
        "last_login": user.last_login,
    }



