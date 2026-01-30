from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import shutil, os
from app.db.session import get_session
from app.models.image import Image
from app.models.topic import Topic
from app.models.user import User, RoleEnum
from app.services.clip_labeler import is_image_relevant
from app.api.deps import get_current_user
from sqlmodel import Session, select
from app.api.admin import require_admin
from typing import List
from app.models.annotation import Annotation
from sqlalchemy import func


router = APIRouter()
UPLOAD_DIR = "uploaded_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/{topic_id}/upload")
def upload_image(
    topic_id: int,
    files: List[UploadFile] = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    print("Uploading images for topic:", topic_id)
    topic = session.get(Topic, topic_id)
    if not topic:
        print("Topic not found!")
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")

    results = []
    uploader = session.get(User, user.id)
    for file in files:
        print("Processing file:", file.filename)
        file_path = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            is_relevant, ai_score, auto_label = is_image_relevant(file_path, topic.get_candidate_labels())
        except Exception as e:
            print("Error in is_image_relevant:", e)
            raise HTTPException(status_code=500, detail=str(e))

        status = "approved" if is_relevant else "pending"
        points_awarded = 5 if is_relevant else 0
        new_image = Image(
            filename=file.filename,
            path=file_path,
            topic_id=topic_id,
            uploader_id=user.id,
            is_relevant=is_relevant,
            points_awarded=points_awarded,
            status=status,
            ai_score=ai_score,
            auto_label=auto_label
        )
        session.add(new_image)
        if uploader:
            uploader.points = (uploader.points or 0) + new_image.points_awarded
        results.append({
            "filename": file.filename,
            "is_relevant": is_relevant,
            "ai_score": ai_score,
            "auto_label": auto_label,
            "status": status,
            "points_awarded": points_awarded
        })

    session.commit()
    return {"status": "success", "results": results}


@router.get("/{topic_id}/list")
def list_images(topic_id: int, session: Session = Depends(get_session)):
    images = session.exec(select(Image).where((Image.topic_id == topic_id) & (Image.status == "approved"))).all()
    result = []
    for img in images:
        uploader = session.get(User, img.uploader_id)
        uploader_name = uploader.email if uploader else None

        # Annotation sayısını doğrudan veritabanında say
        annotation_count = session.exec(
            select(func.count()).where(Annotation.image_id == img.id)
        ).one()

        result.append({
            "id": img.id,
            "filename": img.filename,
            "uploader_name": uploader_name,
            "annotation_count": annotation_count,
            "type": None,  # Eğer modeline eklersen güncellenebilir
            "is_relevant": img.is_relevant,
        })
    return result


@router.get("/me")
def get_my_images(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    images = session.exec(select(Image).where(Image.uploader_id == user.id)).all()
    return images


@router.get("/all")
def get_all_images(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    return session.exec(select(Image)).all()


@router.get("/pending")
def get_pending_images(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    images = session.exec(select(Image).where(Image.status == "pending")).all()
    return images

@router.get("/approved")
def get_approved_images(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    images = session.exec(select(Image).where(Image.status == "approved")).all()
    return images


@router.get("/detail/{image_id}")
def get_image(image_id: int, session: Session = Depends(get_session)):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")
    return image


@router.delete("/{image_id}")
def delete_image(image_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")

    if image.uploader_id != user.id and user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Bu görseli silemezsiniz.")

    session.delete(image)
    session.commit()
    return {"detail": "Görsel silindi."}

@router.post("/{image_id}/approve")
def approve_image(image_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")
    image.status = "approved"
    image.is_relevant = True
    session.add(image)
    session.commit()
    return {"detail": "Görsel onaylandı."}

@router.post("/{image_id}/reject")
def reject_image(image_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    image = session.get(Image, image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı.")
    image.status = "rejected"
    image.is_relevant = False
    session.add(image)
    session.commit()
    return {"detail": "Görsel reddedildi."}
