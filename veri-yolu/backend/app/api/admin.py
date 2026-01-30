from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models.category import Category
from app.models.user import User, RoleEnum
from app.db.session import get_session
from app.api.deps import get_current_user

router = APIRouter()

def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    return user

@router.post("/category")
def create_category(category: Category, session: Session = Depends(get_session), _=Depends(require_admin)):
    session.add(category)
    session.commit()
    return category

@router.get("/users")
def list_users(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(User)).all()

@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, new_role: RoleEnum, session: Session = Depends(get_session), _=Depends(require_admin)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    user.role = new_role
    session.commit()
    return {"message": "Rol güncellendi."}

@router.get("/categories")
def list_categories(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(Category)).all()

@router.delete("/category/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session), _=Depends(require_admin)):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı.")
    session.delete(category)
    session.commit()
    return {"message": "Kategori silindi."}