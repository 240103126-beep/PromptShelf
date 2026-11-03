import pytest
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Category, Collection, Item, Tag
from migrate_data import copy_database


def test_database_migration_preserves_library_and_refuses_overwrite(tmp_path):
    source = create_engine(f'sqlite:///{tmp_path / "source.db"}')
    target = create_engine(f'sqlite:///{tmp_path / "destination.db"}')
    Base.metadata.create_all(source)
    with Session(source) as db:
        category = Category(id=15, name='Original category', color='blue')
        tag = Tag(id=22, name='Original tag', color='red')
        item = Item(id=41, title='Original prompt', prompt='Source text', category=category, tags=[tag])
        collection = Collection(id=9, name='Original collection', items=[item])
        db.add_all([item, collection])
        db.commit()
    # Simulate the previously shipped SQLite schema.
    with source.begin() as connection:
        connection.execute(text('ALTER TABLE collections DROP COLUMN created_at'))
    counts = copy_database(source, target)
    assert counts['items'] == 1 and counts['item_tags'] == 1 and counts['collection_items'] == 1
    with Session(target) as db:
        item = db.get(Item, 41)
        assert item.prompt == 'Source text' and item.category.id == 15
        assert item.tags[0].id == 22 and item.collections[0].id == 9
        assert item.collections[0].created_at is not None
    with pytest.raises(ValueError, match='not empty'):
        copy_database(source, target)
    with source.connect() as connection:
        assert connection.scalar(text('SELECT title FROM items WHERE id=41')) == 'Original prompt'
