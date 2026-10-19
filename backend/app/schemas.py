from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TagOut(ORM):
    id: int
    name: str
    color: str


class CategoryOut(ORM):
    id: int
    name: str
    color: str


class NamedIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = None


class NamedPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = None


class MergeIn(BaseModel):
    into_id: int


class ItemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    prompt: str = ""
    response: str = ""
    source: str = "Other"
    notes: str = ""
    is_favorite: bool = False
    category_id: int | None = None
    tag_ids: list[int] = []


class ItemOut(BaseModel):
    id: int
    title: str
    prompt: str
    response: str
    source: str
    notes: str
    is_favorite: bool
    category: CategoryOut | None = None
    tags: list[TagOut] = []
    collection_ids: list[int] = []
    created_at: datetime
    updated_at: datetime


class ItemIdsIn(BaseModel):
    item_ids: list[int]


class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str
    item_ids: list[int]
    item_count: int


class ExportIn(BaseModel):
    collection_ids: list[int]
    mode: Literal["single", "zip"] = "single"


class AnalyzeIn(BaseModel):
    prompt: str = Field(min_length=1)
    response: str = ""
    lang: str = "en"


class ImproveIn(BaseModel):
    prompt: str = Field(min_length=1)
    lang: str = "en"


class AskIn(BaseModel):
    question: str = Field(min_length=1)
    lang: str = "en"


class ParseIn(BaseModel):
    raw: str = Field(min_length=1)
    lang: str = "en"
