from sqlmodel import Session, select, func
from app.models.user import User
from datetime import datetime

from sqlmodel import SQLModel, Field

# SQLModel tabloları
class TopicView(SQLModel, table=True):
    __tablename__ = "topic_view"
    topic_id: int = Field(primary_key=True, foreign_key="topic.id")
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)


class TopicDownload(SQLModel, table=True):
    __tablename__ = "topic_download"
    topic_id: int = Field(primary_key=True, foreign_key="topic.id")
    user_id: int = Field(primary_key=True, foreign_key="user.id")
    first_download_at: datetime = Field(default_factory=datetime.utcnow)


# === Servis fonksiyonları ===

def track_unique_view(session: Session, user_id: int, topic_id: int):
    """
    Kullanıcı bu konuyu ilk kez görüyorsa kaydet, aksi halde görmezden gel.
    """
    exists = session.exec(
        select(TopicView).where(
            (TopicView.user_id == user_id) & (TopicView.topic_id == topic_id)
        )
    ).first()

    if not exists:
        session.add(TopicView(user_id=user_id, topic_id=topic_id))
        session.commit()


def track_unique_download(session: Session, user_id: int, topic_id: int):
    """
    Kullanıcı bu konuyu ilk kez indiriyorsa kaydet.
    """
    exists = session.exec(
        select(TopicDownload).where(
            (TopicDownload.user_id == user_id) & (TopicDownload.topic_id == topic_id)
        )
    ).first()

    if not exists:
        session.add(TopicDownload(user_id=user_id, topic_id=topic_id))
        session.commit()


def get_metrics(session: Session, topic_id: int):
    """
    İlgili konunun toplam unique görüntülenme ve indirme sayısını döndür.
    """
    views = session.exec(
        select(func.count()).select_from(TopicView).where(TopicView.topic_id == topic_id)
    ).one()

    downloads = session.exec(
        select(func.count()).select_from(TopicDownload).where(TopicDownload.topic_id == topic_id)
    ).one()

    return {"views": views, "downloads": downloads}
