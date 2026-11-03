"""Black-box checks against the running Docker Compose application."""
import os
import uuid
import httpx

BASE = os.getenv("TEST_BASE_URL", "http://127.0.0.1:8000")


def test_static_and_spa():
    for path in ["/", "/app/library", "/about"]:
        response = httpx.get(BASE + path)
        assert response.status_code == 200
        assert '<div id="root">' in response.text
    assert httpx.get(BASE + "/api/not-a-route").status_code == 404


def test_persistent_database_roundtrip():
    with httpx.Client(base_url=BASE) as client:
        assert client.get("/api/health").status_code == 200
        title = "integration-" + uuid.uuid4().hex
        response = client.post("/api/items", json={"title": title, "prompt": "Persist through SQLAlchemy", "source": "other"})
        assert response.status_code in (200, 201), response.text
        item = response.json()
        try:
            assert client.get(f"/api/items/{item['id']}").json()["title"] == title
            assert any(i["id"] == item["id"] for i in client.get("/api/items", params={"search": title}).json())
        finally:
            assert client.post("/api/items/bulk-delete", json={"ids": [item["id"]]}).status_code in (200, 204)
