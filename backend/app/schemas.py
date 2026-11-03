from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Color = Literal['gray', 'red', 'amber', 'green', 'teal', 'blue', 'indigo', 'violet', 'pink']
Source = Literal['chatgpt', 'claude', 'gemini', 'other']
Locale = Literal['en', 'ru', 'kk']


class NamedIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: Color = 'indigo'

    @field_validator('name')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Name must not be blank')
        return value.strip()


class NamedPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: Color | None = None

    @field_validator('name')
    @classmethod
    def nonblank(cls, value):
        if value is not None and not value.strip():
            raise ValueError('Name must not be blank')
        return value.strip() if value else value


class NamedOut(BaseModel):
    id: str
    name: str
    color: Color
    itemCount: int


class MergeIn(BaseModel):
    sourceIds: list[str]
    targetId: str


class ItemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    prompt: str = ''
    response: str = ''
    source: Source = 'other'
    notes: str = ''
    favorite: bool = False
    categoryId: str | None = None
    tagIds: list[str] = Field(default_factory=list)
    collectionIds: list[str] = Field(default_factory=list)

    @field_validator('title')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Title must not be blank')
        return value.strip()


class ItemPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    prompt: str | None = None
    response: str | None = None
    source: Source | None = None
    notes: str | None = None
    favorite: bool | None = None
    categoryId: str | None = None
    tagIds: list[str] | None = None
    collectionIds: list[str] | None = None


class ItemOut(ItemIn):
    id: str
    createdAt: datetime
    updatedAt: datetime


class ItemIdsIn(BaseModel):
    ids: list[str]


class BatchIn(BaseModel):
    items: list[ItemIn]


class BulkPatch(BaseModel):
    favorite: bool | None = None
    addTagIds: list[str] = Field(default_factory=list)
    addCollectionIds: list[str] = Field(default_factory=list)
    removeCollectionIds: list[str] = Field(default_factory=list)


class BulkIn(ItemIdsIn):
    patch: BulkPatch


class CollectionIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ''

    @field_validator('name')
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError('Name must not be blank')
        return value.strip()


class CollectionPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None


class CollectionOut(CollectionIn):
    id: str
    createdAt: datetime
    itemCount: int


class ExportIn(BaseModel):
    collectionIds: list[str]
    format: Literal['md', 'zip'] = 'md'


class AnalyzeIn(BaseModel):
    prompt: str = ''
    response: str = ''
    locale: Locale = 'en'


class ImproveIn(BaseModel):
    prompt: str = Field(min_length=1)
    locale: Locale = 'en'


class AskIn(BaseModel):
    question: str = Field(min_length=1)
    history: list[dict] = Field(default_factory=list)
    locale: Locale = 'en'


class ParseIn(BaseModel):
    raw: str = Field(min_length=1)
    locale: Locale = 'en'
