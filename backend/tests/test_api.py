def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_item_crud_and_search(client):
    r = client.post("/api/items", json={"title": "Zebra prompt", "prompt": "Explain zebras"})
    assert r.status_code == 201
    item_id = r.json()["id"]
    assert any(i["id"] == item_id for i in client.get("/api/items?q=zebra").json())
    r = client.put(f"/api/items/{item_id}", json={"title": "Zebra v2", "prompt": "x"})
    assert r.json()["title"] == "Zebra v2"
    assert client.post(f"/api/items/{item_id}/favorite").json()["is_favorite"] is True
    assert client.delete(f"/api/items/{item_id}").status_code == 204
    assert client.get(f"/api/items/{item_id}").status_code == 404


def test_item_requires_title(client):
    assert client.post("/api/items", json={"title": "", "prompt": "x"}).status_code == 422


def test_tag_merge(client):
    a = client.post("/api/tags", json={"name": "merge-a"}).json()
    b = client.post("/api/tags", json={"name": "merge-b"}).json()
    assert client.post("/api/tags", json={"name": "MERGE-A"}).status_code == 409
    item = client.post("/api/items", json={"title": "T", "prompt": "p", "tag_ids": [a["id"]]}).json()
    assert client.post(f"/api/tags/{a['id']}/merge", json={"into_id": b["id"]}).status_code == 200
    tags = client.get(f"/api/items/{item['id']}").json()["tags"]
    assert [t["name"] for t in tags] == ["merge-b"]


def test_collection_export(client):
    item = client.post("/api/items", json={"title": "Exportable", "prompt": "hello"}).json()
    col = client.post("/api/collections", json={"name": "Export me"}).json()
    empty = client.post("/api/collections", json={"name": "Empty"}).json()
    client.post(f"/api/collections/{col['id']}/items", json={"item_ids": [item["id"]]})
    r = client.post("/api/export", json={"collection_ids": [col["id"]], "mode": "single"})
    assert r.status_code == 200 and "## Prompt" in r.text and 'title: "Exportable"' in r.text
    r = client.post("/api/export", json={"collection_ids": [col["id"]], "mode": "zip"})
    assert r.headers["content-type"] == "application/zip"
    r = client.post("/api/export", json={"collection_ids": [empty["id"]], "mode": "single"})
    assert r.status_code == 400


def test_ai_fallback(client):
    r = client.post("/api/ai/analyze", json={"prompt": "Explain python decorators", "lang": "en"})
    assert r.json()["title"] and r.json()["provider"] == "fallback"
    r = client.post("/api/ai/improve-prompt", json={"prompt": "write a poem"})
    assert "Task:" in r.json()["improved"]
    r = client.post("/api/ai/ask", json={"question": "python error"})
    assert "answer" in r.json()


def test_import_parse(client):
    r = client.post("/api/import/parse", json={"raw": "User: hi there\nAssistant: hello!"})
    items = r.json()["items"]
    assert len(items) == 1 and items[0]["prompt"] == "hi there"
