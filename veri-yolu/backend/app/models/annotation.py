from sqlmodel import SQLModel, Field, Relationship
from typing import Optional

class Annotation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    label: str
    x: float
    y: float
    width: float
    height: float
    image_id: int = Field(foreign_key="image.id")
    category_id: int = Field(foreign_key="category.id")

