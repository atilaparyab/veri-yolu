from fastapi import APIRouter, Depends, HTTPException, Body, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from sqlmodel import Session, select
from app.models.topic import Topic
from app.db.session import get_session
from app.api.deps import get_current_user
from app.models.category import Category
from app.models.user import User, RoleEnum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import desc
from app.models.user import User as UserModel
from app.models.discussion import Forum
from app.models.image import Image  # Görseller için
from app.models.annotation import Annotation  # <-- Annotation modeli
import os, time, json, io, zipfile, csv  # ZIP ve CSV için gerekli

# ✅ METRİK SERVİSLERİ (unique view/download ve sayım)
from app.services.topic_metrics import (
    track_unique_view,
    track_unique_download,
    get_metrics,
)

# Ana topics router (genelde main.py'de prefix="/topics" ile mount ediliyor)
router = APIRouter()

# Ek: annotation export için ayrık prefix'ler (frontend'in kullandığı /annotation/... yolunu korumak için)
export_router = APIRouter(prefix="/annotation", tags=["annotation"])
compat_router = APIRouter(prefix="/annotations", tags=["annotation"])  # /annotations/... uyumluluk


@router.post("/", response_model=Topic)
def create_topic(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: int = Form(...),
    candidate_labels: Optional[str] = Form("[]"),  # JSON stringified list
    cover_image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    # Handle cover image upload
    cover_image_path = None
    if cover_image:
        upload_dir = "uploaded_images"
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(cover_image.filename)[1]
        timestamp = int(time.time())
        file_name = f"topic_{user.id}_{timestamp}{file_ext}"
        file_path = os.path.join(upload_dir, file_name)
        with open(file_path, "wb") as buffer:
            buffer.write(cover_image.file.read())
        cover_image_path = file_name  # sadece dosya adı

    labels = json.loads(candidate_labels or "[]")
    topic = Topic(
        title=title,
        description=description,
        category_id=category_id,
        owner_id=user.id,
        cover_image=cover_image_path
    )
    topic.set_candidate_labels(labels)
    session.add(topic)
    session.commit()
    session.refresh(topic)

    # Create a dedicated forum for this topic
    try:
        forum_name = f"{title} Tartışmaları"
        forum_desc = f"'{title}' veri seti hakkında konuşmalar"
        topic_forum = Forum(name=forum_name, description=forum_desc)
        # If Forum has topic_id field, set it
        if hasattr(Forum, '__table__') and 'topic_id' in Forum.__table__.columns:
            topic_forum.topic_id = topic.id
        session.add(topic_forum)
        session.commit()
    except Exception:
        session.rollback()

    return topic


class TopicOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category_id: int
    owner_id: int
    created_at: str
    candidate_labels: Optional[str] = None
    cover_image: Optional[str] = None
    category_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_avatar_url: Optional[str] = None
    forum_id: Optional[int] = None


@router.get("/", response_model=List[TopicOut])
def list_topics(
    search: str = Query(None),
    category_id: int = Query(None),
    sort: str = Query("-created_at"),
    session: Session = Depends(get_session)
):
    query = select(Topic)
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.where((Topic.title.ilike(search_lower)) | (Topic.description.ilike(search_lower)))
    if category_id:
        query = query.where(Topic.category_id == category_id)
    # Sıralama
    if sort == "created_at":
        query = query.order_by(Topic.created_at)
    elif sort == "-created_at":
        query = query.order_by(desc(Topic.created_at))
    elif sort == "title":
        query = query.order_by(Topic.title)
    elif sort == "-title":
        query = query.order_by(desc(Topic.title))
    topics = session.exec(query).all()
    return [_build_topic_out(session, t) for t in topics]


@router.get("/categories")
def list_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category)).all()


@router.get("/mine", response_model=List[TopicOut])
def get_my_topics(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    topics = session.exec(select(Topic).where(Topic.owner_id == user.id)).all()
    return [_build_topic_out(session, t) for t in topics]


@router.get("/all", response_model=List[TopicOut])
def get_all_topics(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    if user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Sadece admin erişebilir.")
    topics = session.exec(select(Topic)).all()
    return [_build_topic_out(session, t) for t in topics]


@router.get("/{topic_id}")
def get_topic(topic_id: int, session: Session = Depends(get_session)):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")
    # Enrich with owner info if exists
    owner = session.get(UserModel, topic.owner_id) if getattr(topic, "owner_id", None) else None
    result = topic.dict() if hasattr(topic, "dict") else topic.__dict__
    result = dict(result)
    if owner:
        result["owner_email"] = owner.email
        if getattr(owner, "profile_image", None):
            result["owner_avatar_url"] = f"/uploaded_images/{owner.profile_image}"
    # Attach per-topic forum if found
    try:
        # If Forum has topic_id column, prefer exact match
        forum = None
        if hasattr(Forum, '__table__') and 'topic_id' in Forum.__table__.columns:
            forum = session.exec(select(Forum).where(Forum.topic_id == topic_id)).first()
        if not forum:
            forum = session.exec(select(Forum).where(Forum.name.ilike(f"%{topic.title}%"))).first()
        if forum:
            result["forum_id"] = forum.id
    except Exception:
        pass
    return result


def _build_topic_out(session: Session, t: Topic) -> TopicOut:
    owner = session.get(UserModel, t.owner_id) if getattr(t, "owner_id", None) else None
    category = session.get(Category, t.category_id) if getattr(t, "category_id", None) else None
    avatar = None
    if getattr(owner, "profile_image", None):
        avatar = f"/uploaded_images/{owner.profile_image}"
    # find forum by topic_id column if exists, else by name pattern
    forum_id: Optional[int] = None
    try:
        forum = None
        if hasattr(Forum, '__table__') and 'topic_id' in Forum.__table__.columns:
            forum = session.exec(select(Forum).where(Forum.topic_id == t.id)).first()
        if not forum:
            forum = session.exec(select(Forum).where(Forum.name.ilike(f"%{t.title}%"))).first()
        if forum:
            forum_id = forum.id
    except Exception:
        forum_id = None
    return TopicOut(
        id=t.id,
        title=t.title,
        description=t.description,
        category_id=t.category_id,
        owner_id=t.owner_id,
        created_at=t.created_at.isoformat(),
        candidate_labels=t.candidate_labels,
        cover_image=t.cover_image,
        category_name=getattr(category, "name_tr", None) or getattr(category, "name_en", None),
        owner_email=getattr(owner, "email", None),
        owner_avatar_url=avatar,
        forum_id=forum_id,
    )


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    candidate_labels: Optional[List[str]] = None


@router.put("/{topic_id}")
def update_topic(
    topic_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    candidate_labels: Optional[str] = Form(None),  # JSON string (opsiyonel)
    cover_image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")

    if topic.owner_id != user.id and user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Bu konuyu güncelleyemezsiniz.")

    # Basit alanlar
    if title is not None:
        topic.title = title
    if description is not None:
        topic.description = description
    if category_id is not None:
        topic.category_id = int(category_id)

    # Etiketler (stringified JSON)
    if candidate_labels is not None:
        try:
            labels = json.loads(candidate_labels)
            topic.set_candidate_labels(labels)
        except Exception:
            pass  # geçersiz JSON gelirse es geç

    # Kapak görseli
    if cover_image:
        upload_dir = "uploaded_images"
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(cover_image.filename)[1]
        file_name = f"topic_{topic.owner_id}_{int(time.time())}{file_ext}"
        file_path = os.path.join(upload_dir, file_name)
        with open(file_path, "wb") as buffer:
            buffer.write(cover_image.file.read())
        topic.cover_image = file_name  # sadece dosya adını tutuyoruz

    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


# ✅ YENİ: Multipart güncelleme (kapak resmi dahil)
@router.put("/{topic_id}/multipart")
def update_topic_multipart(
    topic_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    candidate_labels: Optional[str] = Form(None),  # JSON stringified list
    cover_image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")

    if topic.owner_id != user.id and user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Bu konuyu güncelleyemezsiniz.")  # ← status_code düzeltildi

    if title is not None:
        topic.title = title.strip()
    if description is not None:
        topic.description = description
    if category_id is not None:
        topic.category_id = int(category_id)

    if candidate_labels is not None:
        try:
            labels = json.loads(candidate_labels or "[]")
        except Exception:
            labels = []
        topic.set_candidate_labels(labels)

    if cover_image:
        upload_dir = "uploaded_images"
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(cover_image.filename)[1]
        fname = f"topic_{topic_id}_{int(time.time())}{ext}"
        fpath = os.path.join(upload_dir, fname)
        with open(fpath, "wb") as bf:
            bf.write(cover_image.file.read())
        topic.cover_image = fname

    session.add(topic)
    session.commit()
    session.refresh(topic)

    return _build_topic_out(session, topic)


@router.delete("/{topic_id}")
def delete_topic(
    topic_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")

    if topic.owner_id != user.id and user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Bu konuyu silemezsiniz.")

    session.delete(topic)
    session.commit()
    return {"detail": "Konu silindi."}


class CategoryCreate(BaseModel):
    name_tr: str
    name_en: Optional[str] = None


@router.post("/categories")
def create_category(
    data: CategoryCreate = Body(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    # İsteğe bağlı: sadece admin ekleyebilsin
    # if user.role != RoleEnum.admin:
    #     raise HTTPException(status_code=403, detail="Yetkiniz yok.")
    category = Category(name_tr=data.name_tr, name_en=data.name_en)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


# =========================
# ✅ YENİ METRİK UÇLARI
# =========================

def _ensure_topic(session: Session, topic_id: int) -> Topic:
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı")
    return topic


@router.post("/{topic_id}/view")
def mark_viewed(
    topic_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),  # login şart: kullanıcı başına 1
):
    _ensure_topic(session, topic_id)
    track_unique_view(session, user.id, topic_id)
    metrics = get_metrics(session, topic_id)
    return {"ok": True, "views": metrics["views"]}


@router.post("/{topic_id}/download")
def mark_downloaded(
    topic_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _ensure_topic(session, topic_id)
    track_unique_download(session, user.id, topic_id)
    metrics = get_metrics(session, topic_id)
    return {"ok": True, "downloads": metrics["downloads"]}


@router.get("/{topic_id}/metrics")
def read_metrics(
    topic_id: int,
    session: Session = Depends(get_session),
):
    _ensure_topic(session, topic_id)
    return get_metrics(session, topic_id)  # {"views": X, "downloads": Y}


# =========================
# ✅ GÖRSELLERİ ZIP İNDİR (TOPIC ÜZERİNDEN)
# =========================
@router.get("/{topic_id}/images/zip")
def download_topic_images_zip(
    topic_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),  # auth korumalı
):
    _ensure_topic(session, topic_id)

    images = session.exec(select(Image).where(Image.topic_id == topic_id)).all()
    if not images:
        raise HTTPException(status_code=404, detail="Bu konuya ait görsel bulunamadı.")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for img in images:
            file_path = os.path.join("uploaded_images", img.filename)
            if os.path.isfile(file_path):
                # ZIP içindeki isim sade olsun
                arcname = img.filename
                zf.write(file_path, arcname=arcname)
    buf.seek(0)

    headers = {
        "Content-Disposition": f'attachment; filename="topic_{topic_id}_images.zip"'
    }
    return StreamingResponse(buf, media_type="application/zip", headers=headers)


# =========================
# ✅ ANN EXPORT (JSON/CSV)
# =========================
def _collect_annotations(session: Session, topic_id: int) -> List[Dict[str, Any]]:
    images = session.exec(select(Image).where(Image.topic_id == topic_id)).all()
    if not images:
        return []

    img_ids = [img.id for img in images]
    filename_map = {img.id: img.filename for img in images}

    anns = session.exec(select(Annotation).where(Annotation.image_id.in_(img_ids))).all()

    out: List[Dict[str, Any]] = []
    for a in anns:
        item = {
            "annotation_id": getattr(a, "id", None),
            "image_id": a.image_id,
            "image_filename": filename_map.get(a.image_id),
            "label": getattr(a, "label", None),
            "x": getattr(a, "x", None),
            "y": getattr(a, "y", None),
            "width": getattr(a, "width", None),
            "height": getattr(a, "height", None),
            "category_id": getattr(a, "category_id", None),
            "source": getattr(a, "source", None),
            "created_at": getattr(a, "created_at", None).isoformat() if getattr(a, "created_at", None) else None,
            "updated_at": getattr(a, "updated_at", None).isoformat() if getattr(a, "updated_at", None) else None,
        }
        out.append(item)
    return out


def _stream_csv(rows: List[Dict[str, Any]]) -> io.BytesIO:
    headers = [
        "annotation_id", "image_id", "image_filename",
        "label", "x", "y", "width", "height",
        "category_id", "source", "created_at", "updated_at",
    ]
    sio = io.StringIO()
    writer = csv.DictWriter(sio, fieldnames=headers)
    writer.writeheader()
    for r in rows:
        writer.writerow({k: r.get(k) for k in headers})
    data = io.BytesIO(sio.getvalue().encode("utf-8"))
    data.seek(0)
    return data


def _stream_json(rows: List[Dict[str, Any]]) -> io.BytesIO:
    data = io.BytesIO(json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8"))
    data.seek(0)
    return data


def _export_annotations(topic_id: int, format: str, session: Session, user: User) -> StreamingResponse:
    _ensure_topic(session, topic_id)
    rows = _collect_annotations(session, topic_id)
    filename = f"annotations_topic_{topic_id}.{format}"

    if format == "csv":
        buf = _stream_csv(rows)
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return StreamingResponse(buf, media_type="text/csv; charset=utf-8", headers=headers)

    # default json
    buf = _stream_json(rows)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(buf, media_type="application/json; charset=utf-8", headers=headers)


# 1) /topics/{topic_id}/annotations/export  (topics prefix'i altında da mevcut olsun)
@router.get("/{topic_id}/annotations/export")
def export_annotations_under_topics(
    topic_id: int,
    format: str = Query("json", pattern="^(json|csv)$"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return _export_annotations(topic_id, format, session, user)


# 2) /annotation/topic/{topic_id}/export_annotations  (frontend'in çağırdığı yol)
@export_router.get("/topic/{topic_id}/export_annotations")
def export_annotations_annotation_prefix(
    topic_id: int,
    format: str = Query("json", pattern="^(json|csv)$"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return _export_annotations(topic_id, format, session, user)


# 3) /annotations/topic/{topic_id}/export_annotations  (uyumluluk)
@compat_router.get("/topic/{topic_id}/export_annotations")
def export_annotations_annotations_prefix(
    topic_id: int,
    format: str = Query("json", pattern="^(json|csv)$"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return _export_annotations(topic_id, format, session, user)
