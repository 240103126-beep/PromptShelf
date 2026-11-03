import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Set TEST_DATABASE_URL to run this same suite against an isolated PostgreSQL DB.
_tmp = tempfile.TemporaryDirectory(prefix='promptshelf-test-')
os.environ['DATABASE_URL'] = os.getenv('TEST_DATABASE_URL', f'sqlite:///{Path(_tmp.name) / "test.db"}')
os.environ['GEMINI_API_KEY'] = ''
os.environ['SEED'] = '0'
os.environ['AI_RATE_LIMIT'] = '500'


@pytest.fixture(scope='session')
def client():
    from app.db import Base, engine
    from app.main import app
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(engine)
