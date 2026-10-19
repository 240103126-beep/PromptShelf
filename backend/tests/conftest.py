import os
import pathlib

os.environ["DATABASE_URL"] = "sqlite:///./data/test.db"
os.environ["GEMINI_API_KEY"] = ""
pathlib.Path("data").mkdir(exist_ok=True)
pathlib.Path("data/test.db").unlink(missing_ok=True)

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:
        yield c
