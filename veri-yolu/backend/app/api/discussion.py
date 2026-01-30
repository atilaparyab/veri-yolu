from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, constr, Field
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy import func

from app.db.session import get_session
from app.api.deps import get_current_user
from app.models.user import User
from app.models.discussion import (
    Forum,
    DiscussionThread,
    DiscussionPost,
    DiscussionPostVote,
    DiscussionPostBlock,   # ⬅️ ENGELLEME tablosunu import ettik
)
from app.core.security import SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from app.models.topic import Topic


router = APIRouter()


# Forum endpoints
class ForumCreate(BaseModel):
    name: constr(min_length=1)
    description: Optional[str] = None


class ThreadOut(BaseModel):
    id: int
    forum_id: int
    topic_id: Optional[int] = None
    title: str
    author_id: int
    author_email: Optional[str] = None
    author_avatar_url: Optional[str] = None
    created_at: str


class ForumOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    participant_avatars: List[str] = Field(default_factory=list)


@router.get("/forums", response_model=List[ForumOut])
def list_forums(session: Session = Depends(get_session)):
    forums = session.exec(select(Forum)).all()
    results: List[ForumOut] = []
    for f in forums:
        threads = session.exec(select(DiscussionThread).where(DiscussionThread.forum_id == f.id)).all()
        user_ids = {t.author_id for t in threads}
        avatars = []
        for uid in list(user_ids)[:3]:
            u = session.get(User, uid)
            if getattr(u, "profile_image", None):
                avatars.append(f"/uploaded_images/{u.profile_image}")
        results.append(
            ForumOut(
                id=f.id,
                name=f.name,
                description=f.description,
                participant_avatars=avatars
            )
        )
    return results


@router.post("/forums", response_model=Forum)
def create_forum(data: ForumCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    forum = Forum(name=data.name, description=data.description)
    session.add(forum)
    session.commit()
    session.refresh(forum)
    return forum


@router.get("/topic/{topic_id}/threads", response_model=List[ThreadOut])
def list_topic_threads(topic_id: int, session: Session = Depends(get_session)):
    topic = session.get(Topic, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")
    threads = session.exec(select(DiscussionThread).where(DiscussionThread.topic_id == topic_id)).all()
    results: List[ThreadOut] = []
    for thr in threads:
        author = session.get(User, thr.author_id)
        avatar = None
        if getattr(author, "profile_image", None):
            avatar = f"/uploaded_images/{author.profile_image}"
        results.append(
            ThreadOut(
                id=thr.id,
                forum_id=thr.forum_id,
                topic_id=thr.topic_id,
                title=thr.title,
                author_id=thr.author_id,
                author_email=getattr(author, "email", None),
                author_avatar_url=avatar,
                created_at=thr.created_at.isoformat(),
            )
        )
    return results


@router.get("/forums/{forum_id}", response_model=Forum)
def get_forum(forum_id: int, session: Session = Depends(get_session)):
    forum = session.get(Forum, forum_id)
    if not forum:
        raise HTTPException(status_code=404, detail="Forum bulunamadı.")
    return forum


# -----------------------------
# İstatistik modelleri ve endpointleri
# -----------------------------
class UserStatsOut(BaseModel):
    discussions: int
    threads: int


@router.get("/stats/me", response_model=UserStatsOut)
def get_my_stats(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    posts_count = session.exec(
        select(func.count(DiscussionPost.id)).where(DiscussionPost.author_id == user.id)
    ).one()
    if isinstance(posts_count, tuple):
        posts_count = posts_count[0]

    threads_count = session.exec(
        select(func.count(DiscussionThread.id)).where(DiscussionThread.author_id == user.id)
    ).one()
    if isinstance(threads_count, tuple):
        threads_count = threads_count[0]

    return UserStatsOut(discussions=posts_count, threads=threads_count)


@router.get("/stats/{user_id}", response_model=UserStatsOut)
def get_user_stats(user_id: int, session: Session = Depends(get_session)):
    posts_count = session.exec(
        select(func.count(DiscussionPost.id)).where(DiscussionPost.author_id == user_id)
    ).one()
    if isinstance(posts_count, tuple):
        posts_count = posts_count[0]

    threads_count = session.exec(
        select(func.count(DiscussionThread.id)).where(DiscussionThread.author_id == user_id)
    ).one()
    if isinstance(threads_count, tuple):
        threads_count = threads_count[0]

    return UserStatsOut(discussions=posts_count, threads=threads_count)


# Thread endpoints
class ThreadCreate(BaseModel):
    forum_id: int
    topic_id: Optional[int] = None
    title: constr(min_length=1)
    content: constr(min_length=1)


@router.get("/forums/{forum_id}/threads", response_model=List[ThreadOut])
def list_threads(forum_id: int, q: Optional[str] = Query(None), session: Session = Depends(get_session)):
    query = select(DiscussionThread).where(DiscussionThread.forum_id == forum_id)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(DiscussionThread.title.ilike(like))
    threads = session.exec(query).all()
    results: List[ThreadOut] = []
    for thr in threads:
        author = session.get(User, thr.author_id)
        avatar = None
        if getattr(author, "profile_image", None):
            avatar = f"/uploaded_images/{author.profile_image}"
        results.append(
            ThreadOut(
                id=thr.id,
                forum_id=thr.forum_id,
                title=thr.title,
                topic_id=thr.topic_id,
                author_id=thr.author_id,
                author_email=getattr(author, "email", None),
                author_avatar_url=avatar,
                created_at=thr.created_at.isoformat(),
            )
        )
    return results


@router.get("/threads", response_model=List[ThreadOut])
def list_threads_general(
    author_id: Optional[int] = Query(None),
    forum_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    query = select(DiscussionThread)
    if author_id is not None:
        query = query.where(DiscussionThread.author_id == author_id)
    if forum_id is not None:
        query = query.where(DiscussionThread.forum_id == forum_id)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(DiscussionThread.title.ilike(like))
    query = query.order_by(DiscussionThread.created_at.desc())

    threads = session.exec(query).all()
    results: List[ThreadOut] = []
    for thr in threads:
        author = session.get(User, thr.author_id)
        avatar = None
        if getattr(author, "profile_image", None):
            avatar = f"/uploaded_images/{author.profile_image}"
        results.append(
            ThreadOut(
                id=thr.id,
                forum_id=thr.forum_id,
                topic_id=thr.topic_id,
                title=thr.title,
                author_id=thr.author_id,
                author_email=getattr(author, "email", None),
                author_avatar_url=avatar,
                created_at=thr.created_at.isoformat(),
            )
        )
    return results


@router.post("/threads", response_model=DiscussionThread)
def create_thread(data: ThreadCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    forum = session.get(Forum, data.forum_id)
    if not forum:
        raise HTTPException(status_code=404, detail="Forum bulunamadı.")
    thread = DiscussionThread(
        forum_id=data.forum_id,
        topic_id=data.topic_id,
        title=data.title,
        author_id=user.id,
    )
    session.add(thread)
    session.commit()
    session.refresh(thread)
    post = DiscussionPost(thread_id=thread.id, author_id=user.id, content=data.content)
    session.add(post)
    session.commit()
    return thread


@router.get("/threads/me", response_model=List[ThreadOut])
def list_my_threads(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    query = (
        select(DiscussionThread)
        .where(DiscussionThread.author_id == user.id)
        .order_by(DiscussionThread.created_at.desc())
    )
    threads = session.exec(query).all()
    results: List[ThreadOut] = []
    for thr in threads:
        author = session.get(User, thr.author_id)
        avatar = None
        if getattr(author, "profile_image", None):
            avatar = f"/uploaded_images/{author.profile_image}"
        results.append(
            ThreadOut(
                id=thr.id,
                forum_id=thr.forum_id,
                topic_id=thr.topic_id,
                title=thr.title,
                author_id=thr.author_id,
                author_email=getattr(author, "email", None),
                author_avatar_url=avatar,
                created_at=thr.created_at.isoformat(),
            )
        )
    return results


# Post endpoints
class PostCreate(BaseModel):
    thread_id: int
    content: constr(min_length=1)
    parent_id: Optional[int] = None


class PostOut(BaseModel):
    id: int
    thread_id: int
    author_id: int
    author_email: Optional[str] = None
    author_avatar_url: Optional[str] = None
    content: str
    created_at: str
    score: int
    user_liked: bool = False
    parent_id: Optional[int] = None


@router.get("/threads/{thread_id}/posts", response_model=List[PostOut])
def list_posts(thread_id: int, request: Request, session: Session = Depends(get_session)):
    posts = session.exec(select(DiscussionPost).where(DiscussionPost.thread_id == thread_id)).all()
    current_user_id: Optional[int] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            current_user_id = int(payload.get("sub")) if payload.get("sub") else None
        except JWTError:
            current_user_id = None

    results: List[PostOut] = []
    for p in posts:
        author = session.get(User, p.author_id)
        avatar = None
        if getattr(author, "profile_image", None):
            avatar = f"/uploaded_images/{author.profile_image}"
        votes = session.exec(select(DiscussionPostVote).where(DiscussionPostVote.post_id == p.id)).all()
        score = sum(v.value for v in votes)
        user_liked = (
            current_user_id is not None and any(v.user_id == current_user_id and v.value == 1 for v in votes)
        )
        results.append(
            PostOut(
                id=p.id,
                thread_id=p.thread_id,
                author_id=p.author_id,
                author_email=getattr(author, "email", None),
                author_avatar_url=avatar,
                content=p.content,
                created_at=p.created_at.isoformat(),
                score=score,
                user_liked=user_liked,
                parent_id=p.parent_id,
            )
        )
    return results


@router.post("/posts", response_model=DiscussionPost)
def create_post(data: PostCreate, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    thread = session.get(DiscussionThread, data.thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Konu başlığı bulunamadı.")
    
    parent_id = data.parent_id
    
    if parent_id is not None:
        parent = session.get(DiscussionPost, parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Yanıt verilen gönderi bulunamadı.")
        if parent.thread_id != data.thread_id:
            raise HTTPException(status_code=400, detail="Yanıtlanan gönderi bu başlığa ait değil.")    
    
    post = DiscussionPost(thread_id=data.thread_id, author_id=user.id, content=data.content, parent_id=parent_id)
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


class VoteRequest(BaseModel):
    post_id: int
    value: int | None = 1


@router.post("/posts/vote")
def vote_post(data: VoteRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    post = session.get(DiscussionPost, data.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı.")
    existing = session.exec(
        select(DiscussionPostVote).where(
            (DiscussionPostVote.post_id == data.post_id)
            & (DiscussionPostVote.user_id == user.id)
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return {"detail": "Like kaldırıldı"}
    session.add(DiscussionPostVote(post_id=data.post_id, user_id=user.id, value=1))
    session.commit()
    return {"detail": "Like eklendi"}


# -----------------------------
# Yeni: Post Block endpoint
# -----------------------------
class BlockRequest(BaseModel):
    post_id: int


@router.post("/posts/block")
def block_post(
    data: BlockRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user)
):
    post = session.get(DiscussionPost, data.post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı.")

    # Zaten engellemiş mi?
    existing = session.exec(
        select(DiscussionPostBlock).where(
            (DiscussionPostBlock.post_id == data.post_id) &
            (DiscussionPostBlock.user_id == user.id)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zaten şikayet edilmiş.")

    # Yeni kayıt ekle
    block = DiscussionPostBlock(post_id=data.post_id, user_id=user.id)
    session.add(block)
    session.commit()

    # Kaç kişi engellemiş?
    count_row = session.exec(
        select(func.count()).where(DiscussionPostBlock.post_id == data.post_id)
    ).first()
    count = count_row or 0   # ✅ düzeltme yapıldı

    # 20+ ise gönderiyi ve ilişkilerini sil
    if count >= 20:
        votes = session.exec(
            select(DiscussionPostVote).where(DiscussionPostVote.post_id == data.post_id)
        ).all()
        for v in votes:
            session.delete(v)

        blocks = session.exec(
            select(DiscussionPostBlock).where(DiscussionPostBlock.post_id == data.post_id)
        ).all()
        for b in blocks:
            session.delete(b)

        session.delete(post)
        session.commit()
        return {"detail": "Gönderi 20’den fazla engelleme aldığı için silindi."}

    return {"detail": "Gönderi engellendi."}



# Silme endpointleri
@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(thread_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    thr = session.get(DiscussionThread, thread_id)
    if not thr:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")
    if str(thr.author_id) != str(user.id) and getattr(user, "role", None) not in ("admin", "moderator"):
        raise HTTPException(status_code=403, detail="Bu konuyu silme yetkiniz yok.")

    posts = session.exec(select(DiscussionPost).where(DiscussionPost.thread_id == thread_id)).all()
    if posts:
        post_ids = [p.id for p in posts]
        # votes
        votes = session.exec(select(DiscussionPostVote).where(DiscussionPostVote.post_id.in_(post_ids))).all()
        for v in votes:
            session.delete(v)
        # blocks  ⬅️ thread altındaki tüm postların block kayıtlarını da sil
        blocks = session.exec(select(DiscussionPostBlock).where(DiscussionPostBlock.post_id.in_(post_ids))).all()
        for b in blocks:
            session.delete(b)
        # posts
        for p in posts:
            session.delete(p)

    session.delete(thr)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    p = session.get(DiscussionPost, post_id)
    if not p:
        raise HTTPException(status_code=404, detail="Gönderi bulunamadı.")
    thr = session.get(DiscussionThread, p.thread_id)
    allowed = (
        str(p.author_id) == str(user.id)
        or (thr and str(thr.author_id) == str(user.id))
        or getattr(user, "role", None) in ("admin", "moderator")
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Bu gönderiyi silme yetkiniz yok.")

    # önce oyları sil
    votes = session.exec(select(DiscussionPostVote).where(DiscussionPostVote.post_id == p.id)).all()
    for v in votes:
        session.delete(v)
    # ardından block kayıtlarını sil ⬅️
    blocks = session.exec(select(DiscussionPostBlock).where(DiscussionPostBlock.post_id == p.id)).all()
    for b in blocks:
        session.delete(b)

    # son olarak post'u sil
    session.delete(p)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
