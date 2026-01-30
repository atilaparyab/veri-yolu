from datetime import datetime
from sqlmodel import SQLModel, Field
from typing import Optional

class Forum(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DiscussionThread(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    forum_id: int = Field(foreign_key="forum.id")
    topic_id: Optional[int] = Field(default=None, foreign_key="topic.id")
    title: str
    author_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DiscussionPost(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: int = Field(foreign_key="discussionthread.id")
    author_id: int = Field(foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # ✅ YENİ: iç içe yorumlar için parent
    parent_id: Optional[int] = Field(
        default=None,
        foreign_key="discussionpost.id",
        index=True,
    )

class DiscussionPostVote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="discussionpost.id")
    user_id: int = Field(foreign_key="user.id")
    value: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DiscussionPostBlock(SQLModel, table=True):
    __tablename__ = "discussion_post_block"
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="discussionpost.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
