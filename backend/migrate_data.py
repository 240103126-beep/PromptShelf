"""Copy an existing SQLite library into an EMPTY PostgreSQL database.

Usage (from backend/):
  DATABASE_URL='postgresql://...' python migrate_data.py --source ./data/promptshelf.db

The source is read only. The destination import is one transaction and refuses to
merge into existing data. DATABASE_URL is read from the environment, never logged.
"""
import argparse
import os
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select, text

from app.db import Base
from app import models  # register table metadata


def normalize_url(url):
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql+psycopg://', 1)
    if url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg://', 1)
    return url


def copy_database(source_engine, target_engine):
    """Transactional copy; return table counts, preserving IDs and relationships."""
    counts = {}
    with source_engine.connect() as source, target_engine.begin() as target:
        Base.metadata.create_all(target)
        for table in Base.metadata.sorted_tables:
            if target.scalar(select(func.count()).select_from(table)):
                raise ValueError('Destination is not empty. Use a new database; no rows were imported.')
        existing = set(inspect(source).get_table_names())
        for table in Base.metadata.sorted_tables:
            if table.name not in existing:
                counts[table.name] = 0
                continue
            # Reflect SQLite's original schema so old collections without created_at
            # receive the new model's default rather than requiring a source mutation.
            columns = {col['name'] for col in inspect(source).get_columns(table.name)}
            selected = [col for col in table.columns if col.name in columns]
            rows = [dict(row) for row in source.execute(select(*selected)).mappings()]
            if rows:
                target.execute(table.insert(), rows)
            counts[table.name] = len(rows)
        if target.dialect.name == 'postgresql':
            for table in Base.metadata.sorted_tables:
                if 'id' in table.c:
                    # Table names come only from trusted model metadata.
                    maximum = target.scalar(select(func.max(table.c.id)))
                    target.execute(text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :next_id, false)"),
                                   {'table_name': table.name, 'next_id': (maximum or 0) + 1})
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True, help='Existing SQLite database file')
    args = parser.parse_args()
    destination = normalize_url(os.getenv('DATABASE_URL', ''))
    if not args.source.is_file():
        parser.error('Source SQLite file does not exist')
    if not destination.startswith('postgresql+psycopg://'):
        parser.error('DATABASE_URL must point to an empty PostgreSQL database')
    # mode=ro ensures that the original library cannot be modified.
    source = create_engine(f'sqlite:///file:{args.source.resolve()}?mode=ro&uri=true')
    target = create_engine(destination)
    try:
        counts = copy_database(source, target)
    except ValueError as exc:
        parser.exit(1, str(exc) + '\n')
    except Exception:
        parser.exit(1, 'Migration failed; destination transaction rolled back. Check database connectivity and schema.\n')
    finally:
        source.dispose()
        target.dispose()
    for table, count in counts.items():
        print(f'{table}: {count} rows copied')
    print('Migration committed. Source database was not changed.')


if __name__ == '__main__':
    main()
