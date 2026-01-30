from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import json

class Topic(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    category_id: int = Field(foreign_key="category.id")
    owner_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # New field for CLIP candidate labels
    candidate_labels: Optional[str] = Field(default="[]", sa_column_kwargs={"nullable": True})
    
    # Cover image path
    cover_image: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})

    # Accessor/helper methods
    def get_candidate_labels(self) -> List[str]:
        return json.loads(self.candidate_labels or "[]")

    def set_candidate_labels(self, labels: List[str]):
        self.candidate_labels = json.dumps(labels)

    def get_cover_image_url(self) -> Optional[str]:
        if self.cover_image:
            return f"/uploaded_images/{self.cover_image}"
        return None
