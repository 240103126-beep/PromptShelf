import os
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, inspect, or_, select, text, update
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
    # Upgrade the original SQLite/Postgres schema without discarding saved data.
    if 'created_at' not in {c['name'] for c in inspect(engine).get_columns('collections')}:
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE collections ADD COLUMN created_at TIMESTAMP'))
            connection.execute(text('UPDATE collections SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL'))
    with SessionLocal() as db:
        empty = not any(db.scalar(select(func.count(model.id))) for model in (Item, Tag, Category, Collection))
        if empty and os.getenv('SEED', '1') == '1':
            seed(db)
    yield


app = FastAPI(title='PromptShelf API', version='2.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', '*').split(','),
                   allow_methods=['*'], allow_headers=['*'], expose_headers=['Content-Disposition', 'X-Item-Count', 'X-AI-Provider'])
_hits = {}


def rate_limit(request: Request):
    ip = request.client.host if request.client else 'unknown'
    t = time.time()
    recent = [x for x in _hits.get(ip, []) if t - x < 60]
    if len(recent) >= int(os.getenv('AI_RATE_LIMIT', '120')):
        raise HTTPException(429, 'Too many AI requests, try again in a minute')
    _hits[ip] = recent + [t]


def get_or_404(db, model, obj_id):
    try:
        key = int(obj_id)
    except (ValueError, TypeError):
        raise HTTPException(404, f'{model.__name__} not found')
    obj = db.get(model, key)
    if obj is None:
        raise HTTPException(404, f'{model.__name__} not found')
    return obj


def related(db, model, ids):
    return list({obj.id: obj for obj in (get_or_404(db, model, key) for key in ids)}.values())


COLORS = {'#5B5BF0': 'indigo', '#E5484D': 'red', '#30A46C': 'green', '#F5A524': 'amber', '#8E8E93': 'gray'}


def named_out(obj, db):
    count = (db.scalar(select(func.count(Item.id)).where(Item.category_id == obj.id))
             if isinstance(obj, Category) else len(obj.items))
    return NamedOut(id=str(obj.id), name=obj.name, color=COLORS.get(obj.color, obj.color) if obj.color in COLORS or obj.color in ['gray','red','amber','green','teal','blue','indigo','violet','pink'] else 'indigo', itemCount=count)


def item_out(i):
    return ItemOut(id=str(i.id), title=i.title, prompt=i.prompt, response=i.response,
                   source=i.source.lower() if i.source.lower() in ['chatgpt','claude','gemini','other'] else 'other',
                   notes=i.notes, favorite=i.is_favorite, categoryId=str(i.category_id) if i.category_id else None,
                   tagIds=[str(t.id) for t in i.tags], collectionIds=[str(c.id) for c in i.collections],
                   createdAt=i.created_at, updatedAt=i.updated_at)


def col_out(c):
    return CollectionOut(id=str(c.id), name=c.name, description=c.description, createdAt=c.created_at, itemCount=len(c.items))


def apply_item(item, data, db):
    item.title, item.prompt, item.response = data.title, data.prompt, data.response
    item.source, item.notes, item.is_favorite = data.source, data.notes, data.favorite
    item.category_id = get_or_404(db, Category, data.categoryId).id if data.categoryId is not None else None
    item.tags = related(db, Tag, data.tagIds)
    item.collections = related(db, Collection, data.collectionIds)
    item.updated_at = now()


@app.get('/api/health')
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok'}


@app.get('/api/items', response_model=list[ItemOut])
def list_items(search: str | None = None, tagId: str | None = None, categoryId: str | None = None,
               collectionId: str | None = None, favorite: bool | None = None, source: str | None = None,
               sort: str = 'updated', db: Session = Depends(get_db)):
    stmt = select(Item)
    if search:
        like = f'%{search}%'
        stmt = stmt.where(or_(Item.title.ilike(like), Item.prompt.ilike(like), Item.response.ilike(like), Item.notes.ilike(like)))
    if tagId:
        stmt = stmt.where(Item.tags.any(Tag.id == get_or_404(db, Tag, tagId).id))
    if categoryId:
        stmt = stmt.where(Item.category_id == get_or_404(db, Category, categoryId).id)
    if collectionId:
        stmt = stmt.where(Item.collections.any(Collection.id == get_or_404(db, Collection, collectionId).id))
    if favorite is not None:
        stmt = stmt.where(Item.is_favorite == favorite)
    if source:
        stmt = stmt.where(func.lower(Item.source) == source.lower())
    order = {'updated': Item.updated_at.desc(), 'newest': Item.created_at.desc(),
             'oldest': Item.created_at.asc(), 'title': Item.title.asc()}.get(sort, Item.updated_at.desc())
    return [item_out(i) for i in db.scalars(stmt.order_by(order, Item.id)).all()]


@app.post('/api/items', response_model=ItemOut, status_code=201)
def create_item(data: ItemIn, db: Session = Depends(get_db)):
    item = Item()
    apply_item(item, data, db)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_out(item)


@app.post('/api/items/batch', response_model=list[ItemOut], status_code=201)
def create_items(data: BatchIn, db: Session = Depends(get_db)):
    items = []
    for input in data.items:
        item = Item()
        apply_item(item, input, db)
        db.add(item)
        items.append(item)
    db.commit()
    return [item_out(i) for i in items]


@app.patch('/api/items/bulk', response_model=list[ItemOut])
def bulk_update(data: BulkIn, db: Session = Depends(get_db)):
    items = related(db, Item, data.ids)
    tags = related(db, Tag, data.patch.addTagIds)
    cols = related(db, Collection, data.patch.addCollectionIds)
    remove = {c.id for c in related(db, Collection, data.patch.removeCollectionIds)}
    for item in items:
        if data.patch.favorite is not None:
            item.is_favorite = data.patch.favorite
        item.tags = list({t.id: t for t in item.tags + tags}.values())
        item.collections = [c for c in {c.id: c for c in item.collections + cols}.values() if c.id not in remove]
        item.updated_at = now()
    db.commit()
    return [item_out(i) for i in items]


@app.post('/api/items/bulk-delete', status_code=204)
def bulk_delete(data: ItemIdsIn, db: Session = Depends(get_db)):
    for item in related(db, Item, data.ids):
        db.delete(item)
    db.commit()
    return Response(status_code=204)


@app.get('/api/items/{item_id}', response_model=ItemOut)
def get_item(item_id: str, db: Session = Depends(get_db)):
    return item_out(get_or_404(db, Item, item_id))


@app.patch('/api/items/{item_id}', response_model=ItemOut)
def update_item(item_id: str, data: ItemPatch, db: Session = Depends(get_db)):
    item = get_or_404(db, Item, item_id)
    # Validate the merged record so explicit null only works for nullable categoryId.
    merged = item_out(item).model_dump(exclude={'id', 'createdAt', 'updatedAt'})
    merged.update(data.model_dump(exclude_unset=True))
    try:
        value = ItemIn.model_validate(merged)
    except Exception as exc:
        raise HTTPException(422, 'Invalid item update') from exc
    apply_item(item, value, db)
    db.commit()
    return item_out(item)


@app.delete('/api/items/{item_id}', status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Item, item_id))
    db.commit()
    return Response(status_code=204)


def name_taken(db, model, name, exclude_id=None):
    found = db.scalar(select(model).where(func.lower(model.name) == name.strip().lower()))
    return found is not None and found.id != exclude_id


def create_named(db, model, data):
    if name_taken(db, model, data.name):
        raise HTTPException(409, f'{model.__name__} already exists')
    obj = model(name=data.name, color=data.color)
    db.add(obj)
    db.commit()
    return named_out(obj, db)


def patch_named(db, model, key, data):
    obj = get_or_404(db, model, key)
    if data.name is not None:
        if name_taken(db, model, data.name, obj.id):
            raise HTTPException(409, f'{model.__name__} already exists')
        obj.name = data.name
    if data.color is not None:
        obj.color = data.color
    db.commit()
    return named_out(obj, db)


def merge_named(db, model, data):
    dst = get_or_404(db, model, data.targetId)
    sources = related(db, model, data.sourceIds)
    if dst in sources:
        raise HTTPException(400, 'Cannot merge into itself')
    for src in sources:
        if model is Tag:
            for item in list(src.items):
                if dst not in item.tags:
                    item.tags.append(dst)
                item.tags.remove(src)
                item.updated_at = now()
        else:
            db.execute(update(Item).where(Item.category_id == src.id).values(category_id=dst.id, updated_at=now()))
        db.delete(src)
    db.commit()
    db.refresh(dst)
    return named_out(dst, db)


@app.get('/api/tags', response_model=list[NamedOut])
def list_tags(db: Session = Depends(get_db)):
    return [named_out(t, db) for t in db.scalars(select(Tag).order_by(Tag.name)).all()]


@app.post('/api/tags', response_model=NamedOut, status_code=201)
def create_tag(data: NamedIn, db: Session = Depends(get_db)):
    return create_named(db, Tag, data)


@app.post('/api/tags/merge', response_model=NamedOut)
def merge_tags(data: MergeIn, db: Session = Depends(get_db)):
    return merge_named(db, Tag, data)


@app.patch('/api/tags/{tag_id}', response_model=NamedOut)
def patch_tag(tag_id: str, data: NamedPatch, db: Session = Depends(get_db)):
    return patch_named(db, Tag, tag_id, data)


@app.delete('/api/tags/{tag_id}', status_code=204)
def delete_tag(tag_id: str, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Tag, tag_id))
    db.commit()
    return Response(status_code=204)


@app.get('/api/categories', response_model=list[NamedOut])
def list_categories(db: Session = Depends(get_db)):
    return [named_out(c, db) for c in db.scalars(select(Category).order_by(Category.name)).all()]


@app.post('/api/categories', response_model=NamedOut, status_code=201)
def create_category(data: NamedIn, db: Session = Depends(get_db)):
    return create_named(db, Category, data)


@app.post('/api/categories/merge', response_model=NamedOut)
def merge_categories(data: MergeIn, db: Session = Depends(get_db)):
    return merge_named(db, Category, data)


@app.patch('/api/categories/{cat_id}', response_model=NamedOut)
def patch_category(cat_id: str, data: NamedPatch, db: Session = Depends(get_db)):
    return patch_named(db, Category, cat_id, data)


@app.delete('/api/categories/{cat_id}', status_code=204)
def delete_category(cat_id: str, db: Session = Depends(get_db)):
    cat = get_or_404(db, Category, cat_id)
    db.execute(update(Item).where(Item.category_id == cat.id).values(category_id=None, updated_at=now()))
    db.delete(cat)
    db.commit()
    return Response(status_code=204)


@app.get('/api/collections', response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return [col_out(c) for c in db.scalars(select(Collection).order_by(Collection.name)).all()]


@app.post('/api/collections', response_model=CollectionOut, status_code=201)
def create_collection(data: CollectionIn, db: Session = Depends(get_db)):
    col = Collection(name=data.name, description=data.description)
    db.add(col)
    db.commit()
    return col_out(col)


@app.get('/api/collections/{col_id}', response_model=CollectionOut)
def get_collection(col_id: str, db: Session = Depends(get_db)):
    return col_out(get_or_404(db, Collection, col_id))


@app.patch('/api/collections/{col_id}', response_model=CollectionOut)
def update_collection(col_id: str, data: CollectionPatch, db: Session = Depends(get_db)):
    col = get_or_404(db, Collection, col_id)
    values = {'name': col.name, 'description': col.description}
    values.update(data.model_dump(exclude_unset=True))
    try:
        value = CollectionIn.model_validate(values)
    except Exception as exc:
        raise HTTPException(422, 'Invalid collection update') from exc
    col.name, col.description = value.name, value.description
    db.commit()
    return col_out(col)


@app.delete('/api/collections/{col_id}', status_code=204)
def delete_collection(col_id: str, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Collection, col_id))
    db.commit()
    return Response(status_code=204)


@app.post('/api/export')
def export(data: ExportIn, db: Session = Depends(get_db)):
    cols = related(db, Collection, data.collectionIds)
    if not cols or all(not c.items for c in cols):
        raise HTTPException(400, 'Select at least one nonempty collection')
    headers = {'X-Item-Count': str(len({i.id for c in cols for i in c.items}))}
    if data.format == 'zip':
        headers['Content-Disposition'] = 'attachment; filename="promptshelf-export.zip"'
        return Response(build_zip(cols), media_type='application/zip', headers=headers)
    headers['Content-Disposition'] = 'attachment; filename="promptshelf-export.md"'
    return Response(build_single(cols), media_type='text/markdown; charset=utf-8', headers=headers)


def analyze(data, response):
    result = ai.analyze(data.prompt, data.response, data.locale)
    response.headers['X-AI-Provider'] = result['provider']
    return result


@app.post('/api/ai/suggest-titles', response_model=list[str], dependencies=[Depends(rate_limit)])
def suggest_titles(data: AnalyzeIn, response: Response):
    return [analyze(data, response)['title']]


@app.post('/api/ai/summarize', response_model=str, dependencies=[Depends(rate_limit)])
def summarize(data: AnalyzeIn, response: Response):
    return analyze(data, response)['summary']


@app.post('/api/ai/suggest-tags', response_model=list[str], dependencies=[Depends(rate_limit)])
def suggest_tags(data: AnalyzeIn, response: Response):
    return analyze(data, response)['tags']


@app.post('/api/ai/suggest-categories', response_model=list[str], dependencies=[Depends(rate_limit)])
def suggest_categories(data: AnalyzeIn, response: Response):
    return [analyze(data, response)['category']]


@app.post('/api/ai/improve-prompt', response_model=str, dependencies=[Depends(rate_limit)])
def improve_prompt(data: ImproveIn, response: Response):
    result = ai.improve(data.prompt, data.locale)
    response.headers['X-AI-Provider'] = result['provider']
    return result['improved']


@app.post('/api/ai/split-chat', dependencies=[Depends(rate_limit)])
def split_chat(data: ParseIn, response: Response):
    result = ai.parse_chat(data.raw, data.locale)
    response.headers['X-AI-Provider'] = result['provider']
    return [{**item, 'source': item.get('source', 'other').lower()} for item in result['items']]


@app.post('/api/ai/ask', dependencies=[Depends(rate_limit)])
def ask_library(data: AskIn, response: Response, db: Session = Depends(get_db)):
    words = [w for w in re.findall(r'\w+', data.question.lower()) if len(w) > 2][:8]
    scored = []
    for item in db.scalars(select(Item)).all():
        content = f'{item.title} {item.prompt} {item.response} {item.notes}'.lower()
        score = sum(w in content for w in words)
        if score:
            scored.append((score, item))
    scored.sort(key=lambda pair: -pair[0])
    items = [item for _, item in scored[:5]]
    result = ai.ask(data.question, items, data.locale)
    response.headers['X-AI-Provider'] = result['provider']
    cited = {str(key) for key in result['citations']}
    return {'answer': result['answer'], 'citations': [{'itemId': str(i.id), 'title': i.title} for i in items if str(i.id) in cited]}


# API routes precede the SPA fallback; unknown API endpoints must remain 404.
_static = Path(os.getenv('STATIC_DIR', 'static')).resolve()
if _static.is_dir():
    if (_static / 'assets').is_dir():
        app.mount('/assets', StaticFiles(directory=_static / 'assets'), name='assets')

    @app.get('/{path:path}', include_in_schema=False)
    def frontend_page(path: str):
        if path == 'api' or path.startswith('api/'):
            raise HTTPException(404, 'Not found')
        candidate = (_static / path).resolve()
        if candidate.is_relative_to(_static) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_static / 'index.html')
