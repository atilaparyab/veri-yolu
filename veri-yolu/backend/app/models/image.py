from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Image(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    topic_id: int = Field(foreign_key="topic.id")
    uploader_id: int = Field(foreign_key="user.id")
    is_relevant: Optional[bool] = None  # CLIP ile otomatik işlenecek
    points_awarded: Optional[int] = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending")  # 'pending', 'approved', 'rejected'
    ai_score: Optional[float] = None  # AI similarity/confidence score
    auto_label: Optional[str] = None  # CLIP tarafından önerilen en iyi etiket
