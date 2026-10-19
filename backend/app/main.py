import os
import re
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from . import ai
from .db import Base, SessionLocal, engine, get_db
from .export import build_single, build_zip
from .models import Category, Collection, Item, Tag, now
from .schemas import *
from .seed import seed


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        empty = not (db.scalar(select(func.count(Item.id))) or db.scalar(select(func.count(Tag.id))) or db.scalar(select(func.count(Category.id))))
        if empty and os.getenv("SEED", "1") == "1":
            seed(db)
    yield


app = FastAPI(title="PromptShelf API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

_hits = {}


def rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    t = time.time()
    recent = [x for x in _hits.get(ip, []) if t - x < 60]
    if len(recent) >= 30:
        raise HTTPException(429, "Too many AI requests, try again in a minute")
    recent.append(t)
    _hits[ip] = recent


def get_or_404(db, model, obj_id):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(404, f"{model.__name__} not found")
    return obj


def item_out(i):
    return ItemOut(
        id=i.id, title=i.title, prompt=i.prompt, response=i.response, source=i.source,
        notes=i.notes, is_favorite=i.is_favorite,
        category=CategoryOut.model_validate(i.category) if i.category else None,
        tags=[TagOut.model_validate(t) for t in i.tags],
        collection_ids=[c.id for c in i.collections],
        created_at=i.created_at, updated_at=i.updated_at,
    )


def col_out(c):
    return CollectionOut(id=c.id, name=c.name, description=c.description,
                         item_ids=[i.id for i in c.items], item_count=len(c.items))


def apply_item(item, data, db):
    if data.category_id is not None:
        get_or_404(db, Category, data.category_id)
    item.title = data.title.strip()
    item.prompt = data.prompt
    item.response = data.response
    item.source = data.source
    item.notes = data.notes
    item.is_favorite = data.is_favorite
    item.category_id = data.category_id
    item.tags = list(db.scalars(select(Tag).where(Tag.id.in_(data.tag_ids))).all()) if data.tag_ids else []
    item.updated_at = now()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------- items ----------
@app.get("/api/items", response_model=list[ItemOut])
def list_items(q: str | None = None, tag_id: int | None = None, category_id: int | None = None,
               collection_id: int | None = None, favorite: bool | None = None,
               source: str | None = None, sort: str = "updated_desc", db: Session = Depends(get_db)):
    stmt = select(Item)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Item.title.ilike(like), Item.prompt.ilike(like),
                              Item.response.ilike(like), Item.notes.ilike(like)))
    if tag_id:
        stmt = stmt.where(Item.tags.any(Tag.id == tag_id))
    if category_id:
        stmt = stmt.where(Item.category_id == category_id)
    if collection_id:
        stmt = stmt.where(Item.collections.any(Collection.id == collection_id))
    if favorite is not None:
        stmt = stmt.where(Item.is_favorite == favorite)
    if source:
        stmt = stmt.where(Item.source == source)
    order = {"updated_desc": Item.updated_at.desc(), "created_desc": Item.created_at.desc(),
             "title_asc": Item.title.asc()}.get(sort, Item.updated_at.desc())
    return [item_out(i) for i in db.scalars(stmt.order_by(order)).all()]


@app.post("/api/items", response_model=ItemOut, status_code=201)
def create_item(data: ItemIn, db: Session = Depends(get_db)):
    item = Item()
    apply_item(item, data, db)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_out(item)


@app.post("/api/items/bulk-delete", status_code=204)
def bulk_delete(data: ItemIdsIn, db: Session = Depends(get_db)):
    for item in db.scalars(select(Item).where(Item.id.in_(data.item_ids))).all():
        db.delete(item)
    db.commit()
    return Response(status_code=204)


@app.get("/api/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    return item_out(get_or_404(db, Item, item_id))


@app.put("/api/items/{item_id}", response_model=ItemOut)
def update_item(item_id: int, data: ItemIn, db: Session = Depends(get_db)):
    item = get_or_404(db, Item, item_id)
    apply_item(item, data, db)
    db.commit()
    db.refresh(item)
    return item_out(item)


@app.post("/api/items/{item_id}/favorite", response_model=ItemOut)
def toggle_favorite(item_id: int, db: Session = Depends(get_db)):
    item = get_or_404(db, Item, item_id)
    item.is_favorite = not item.is_favorite
    db.commit()
    db.refresh(item)
    return item_out(item)


@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Item, item_id))
    db.commit()
    return Response(status_code=204)


# ---------- tags & categories ----------
def _name_taken(db, model, name, exclude_id=None):
    stmt = select(model).where(func.lower(model.name) == name.strip().lower())
    found = db.scalar(stmt)
    return found is not None and found.id != exclude_id


@app.get("/api/tags", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.scalars(select(Tag).order_by(Tag.name)).all()


@app.post("/api/tags", response_model=TagOut, status_code=201)
def create_tag(data: NamedIn, db: Session = Depends(get_db)):
    if _name_taken(db, Tag, data.name):
        raise HTTPException(409, "Tag already exists")
    tag = Tag(name=data.name.strip(), color=data.color or "#5B5BF0")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@app.patch("/api/tags/{tag_id}", response_model=TagOut)
def patch_tag(tag_id: int, data: NamedPatch, db: Session = Depends(get_db)):
    tag = get_or_404(db, Tag, tag_id)
    if data.name is not None:
        if _name_taken(db, Tag, data.name, tag.id):
            raise HTTPException(409, "Tag already exists")
        tag.name = data.name.strip()
    if data.color:
        tag.color = data.color
    db.commit()
    db.refresh(tag)
    return tag


@app.post("/api/tags/{tag_id}/merge", response_model=TagOut)
def merge_tag(tag_id: int, data: MergeIn, db: Session = Depends(get_db)):
    src = get_or_404(db, Tag, tag_id)
    dst = get_or_404(db, Tag, data.into_id)
    if src.id == dst.id:
        raise HTTPException(400, "Cannot merge a tag into itself")
    for item in list(src.items):
        if dst not in item.tags:
            item.tags.append(dst)
        item.tags.remove(src)
    db.delete(src)
    db.commit()
    db.refresh(dst)
    return dst


@app.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Tag, tag_id))
    db.commit()
    return Response(status_code=204)


@app.get("/api/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.name)).all()


@app.post("/api/categories", response_model=CategoryOut, status_code=201)
def create_category(data: NamedIn, db: Session = Depends(get_db)):
    if _name_taken(db, Category, data.name):
        raise HTTPException(409, "Category already exists")
    cat = Category(name=data.name.strip(), color=data.color or "#5B5BF0")
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@app.patch("/api/categories/{cat_id}", response_model=CategoryOut)
def patch_category(cat_id: int, data: NamedPatch, db: Session = Depends(get_db)):
    cat = get_or_404(db, Category, cat_id)
    if data.name is not None:
        if _name_taken(db, Category, data.name, cat.id):
            raise HTTPException(409, "Category already exists")
        cat.name = data.name.strip()
    if data.color:
        cat.color = data.color
    db.commit()
    db.refresh(cat)
    return cat


@app.delete("/api/categories/{cat_id}", status_code=204)
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = get_or_404(db, Category, cat_id)
    db.execute(update(Item).where(Item.category_id == cat.id).values(category_id=None))
    db.delete(cat)
    db.commit()
    return Response(status_code=204)


# ---------- collections ----------
@app.get("/api/collections", response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return [col_out(c) for c in db.scalars(select(Collection).order_by(Collection.name)).all()]


@app.post("/api/collections", response_model=CollectionOut, status_code=201)
def create_collection(data: CollectionIn, db: Session = Depends(get_db)):
    col = Collection(name=data.name.strip(), description=data.description)
    db.add(col)
    db.commit()
    db.refresh(col)
    return col_out(col)


@app.get("/api/collections/{col_id}", response_model=CollectionOut)
def get_collection(col_id: int, db: Session = Depends(get_db)):
    return col_out(get_or_404(db, Collection, col_id))


@app.put("/api/collections/{col_id}", response_model=CollectionOut)
def update_collection(col_id: int, data: CollectionIn, db: Session = Depends(get_db)):
    col = get_or_404(db, Collection, col_id)
    col.name = data.name.strip()
    col.description = data.description
    db.commit()
    db.refresh(col)
    return col_out(col)


@app.delete("/api/collections/{col_id}", status_code=204)
def delete_collection(col_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Collection, col_id))
    db.commit()
    return Response(status_code=204)


@app.post("/api/collections/{col_id}/items", response_model=CollectionOut)
def add_items(col_id: int, data: ItemIdsIn, db: Session = Depends(get_db)):
    col = get_or_404(db, Collection, col_id)
    for item_id in data.item_ids:
        item = get_or_404(db, Item, item_id)
        if item not in col.items:
            col.items.append(item)
    db.commit()
    db.refresh(col)
    return col_out(col)


@app.delete("/api/collections/{col_id}/items/{item_id}", response_model=CollectionOut)
def remove_item(col_id: int, item_id: int, db: Session = Depends(get_db)):
    col = get_or_404(db, Collection, col_id)
    item = get_or_404(db, Item, item_id)
    if item in col.items:
        col.items.remove(item)
    db.commit()
    db.refresh(col)
    return col_out(col)


# ---------- export ----------
@app.post("/api/export")
def export(data: ExportIn, db: Session = Depends(get_db)):
    cols = db.scalars(select(Collection).where(Collection.id.in_(data.collection_ids)).order_by(Collection.name)).all()
    if not cols:
        raise HTTPException(400, "Select at least one collection")
    if all(not c.items for c in cols):
        raise HTTPException(400, "Selected collections are empty")
    if data.mode == "zip":
        return Response(build_zip(cols), media_type="application/zip",
                        headers={"Content-Disposition": 'attachment; filename="promptshelf-export.zip"'})
    name = "collection" if len(cols) == 1 else "promptshelf-export"
    return Response(build_single(cols), media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}.md"'})


# ---------- import & AI ----------
@app.post("/api/import/parse", dependencies=[Depends(rate_limit)])
def import_parse(data: ParseIn):
    return ai.parse_chat(data.raw, data.lang)


@app.post("/api/ai/analyze", dependencies=[Depends(rate_limit)])
def ai_analyze(data: AnalyzeIn):
    return ai.analyze(data.prompt, data.response, data.lang)


@app.post("/api/ai/improve-prompt", dependencies=[Depends(rate_limit)])
def ai_improve(data: ImproveIn):
    return ai.improve(data.prompt, data.lang)


@app.post("/api/ai/ask", dependencies=[Depends(rate_limit)])
def ai_ask(data: AskIn, db: Session = Depends(get_db)):
    words = [w for w in re.findall(r"\w+", data.question.lower()) if len(w) > 2][:8]
    scored = []
    for i in db.scalars(select(Item)).all():
        text = f"{i.title} {i.prompt} {i.response} {i.notes}".lower()
        score = sum(w in text for w in words)
        if score:
            scored.append((score, i))
    scored.sort(key=lambda x: -x[0])
    return ai.ask(data.question, [i for _, i in scored[:5]], data.lang)
