import io
import zipfile


def post(client, path, payload):
    response = client.post('/api/' + path, json=payload)
    assert response.status_code in (200, 201), response.text
    return response.json()


def item(client, **fields):
    return post(client, 'items', {'title': 'Saved prompt', 'prompt': 'Explain Python decorators', **fields})


def test_health(client):
    assert client.get('/api/health').json() == {'status': 'ok'}


def test_item_crud_contract_and_persistence(client):
    saved = item(client, title='Zebra prompt', source='claude', notes='Some notes')
    assert isinstance(saved['id'], str)
    assert saved['categoryId'] is None and saved['tagIds'] == []
    assert saved['createdAt'] and saved['updatedAt']
    assert saved['favorite'] is False
    saved_id = saved['id']
    r = client.patch(f'/api/items/{saved_id}', json={'title': 'Zebra updated'})
    assert r.status_code == 200 and r.json()['prompt'] == 'Explain Python decorators'
    assert client.get(f'/api/items/{saved_id}').json()['title'] == 'Zebra updated'
    assert any(i['id'] == saved_id for i in client.get('/api/items?search=zebra').json())
    assert client.delete(f'/api/items/{saved_id}').status_code == 204
    assert client.get(f'/api/items/{saved_id}').status_code == 404


def test_input_validation(client):
    for title in ['', '   ']:
        assert client.post('/api/items', json={'title': title}).status_code == 422
    assert client.post('/api/items', json={'title': 'x', 'source': 'INVALID'}).status_code == 422
    assert client.post('/api/items', json={'title': 'x', 'categoryId': '999999'}).status_code == 404
    assert client.get('/api/items/not-an-id').status_code == 404
    assert client.post('/api/tags', json={'name': '   '}).status_code == 422


def test_tag_crud_merge_and_counts(client):
    a = post(client, 'tags', {'name': 'merge-a', 'color': 'red'})
    b = post(client, 'tags', {'name': 'merge-b'})
    assert a['color'] == 'red' and a['itemCount'] == 0
    assert client.post('/api/tags', json={'name': 'MERGE-A'}).status_code == 409
    saved = item(client, tagIds=[a['id'], b['id']])
    r = post(client, 'tags/merge', {'sourceIds': [a['id']], 'targetId': b['id']})
    assert r['itemCount'] == 1
    assert client.get(f"/api/items/{saved['id']}").json()['tagIds'] == [b['id']]
    r = client.patch(f"/api/tags/{b['id']}", json={'name': 'renamed-tag', 'color': 'green'})
    assert r.json()['name'] == 'renamed-tag'
    assert client.delete(f"/api/tags/{b['id']}").status_code == 204
    assert client.get(f"/api/items/{saved['id']}").json()['tagIds'] == []


def test_category_merge_clear_and_counts(client):
    a = post(client, 'categories', {'name': 'Category A', 'color': 'blue'})
    b = post(client, 'categories', {'name': 'Category B'})
    saved = item(client, categoryId=a['id'])
    r = post(client, 'categories/merge', {'sourceIds': [a['id']], 'targetId': b['id']})
    assert r['itemCount'] == 1
    assert client.get(f"/api/items/{saved['id']}").json()['categoryId'] == b['id']
    r = client.patch(f"/api/items/{saved['id']}", json={'categoryId': None})
    assert r.json()['categoryId'] is None
    client.patch(f"/api/items/{saved['id']}", json={'categoryId': b['id']})
    assert client.delete(f"/api/categories/{b['id']}").status_code == 204
    assert client.get(f"/api/items/{saved['id']}").json()['categoryId'] is None


def test_batch_bulk_filters_and_delete(client):
    tag = post(client, 'tags', {'name': 'batch-tag'})
    cat = post(client, 'categories', {'name': 'Batch category'})
    col = post(client, 'collections', {'name': 'Batch collection'})
    saved = post(client, 'items/batch', {'items': [
        {'title': 'Batch Z', 'source': 'gemini', 'categoryId': cat['id']},
        {'title': 'Batch A', 'source': 'claude'},
    ]})
    ids = [i['id'] for i in saved]
    changed = client.patch('/api/items/bulk', json={'ids': ids, 'patch': {
        'favorite': True, 'addTagIds': [tag['id']], 'addCollectionIds': [col['id']],
    }})
    assert changed.status_code == 200
    assert all(i['favorite'] and i['collectionIds'] == [col['id']] for i in changed.json())
    for query in [f'tagId={tag["id"]}', f'collectionId={col["id"]}', 'favorite=true']:
        assert set(ids) <= {i['id'] for i in client.get('/api/items?' + query).json()}
    filtered = client.get(f'/api/items?categoryId={cat["id"]}&source=gemini').json()
    assert [i['id'] for i in filtered] == [ids[0]]
    ordered = client.get('/api/items?search=Batch&sort=title').json()
    assert [i['title'] for i in ordered] == ['Batch A', 'Batch Z']
    r = client.patch('/api/items/bulk', json={'ids': ids, 'patch': {'favorite': False, 'removeCollectionIds': [col['id']]}})
    assert all(not i['favorite'] and not i['collectionIds'] for i in r.json())
    assert client.post('/api/items/bulk-delete', json={'ids': ids}).status_code == 204
    assert all(client.get('/api/items/' + i).status_code == 404 for i in ids)


def test_collection_crud_export_markdown_and_zip(client):
    col = post(client, 'collections', {'name': 'Export me', 'description': 'description'})
    assert col['createdAt'] and col['itemCount'] == 0
    client.patch(f"/api/collections/{col['id']}", json={'name': 'Renamed collection'})
    assert client.get(f"/api/collections/{col['id']}").json()['description'] == 'description'
    saved = item(client, title='Exportable', collectionIds=[col['id']])
    assert client.get(f"/api/collections/{col['id']}").json()['itemCount'] == 1
    r = client.post('/api/export', json={'collectionIds': [col['id']], 'format': 'md'})
    assert r.status_code == 200 and '## Prompt' in r.text and 'title: "Exportable"' in r.text
    assert r.headers['x-item-count'] == '1'
    r = client.post('/api/export', json={'collectionIds': [col['id']], 'format': 'zip'})
    assert r.headers['content-type'] == 'application/zip'
    with zipfile.ZipFile(io.BytesIO(r.content)) as archive:
        item_files = [name for name in archive.namelist() if name != 'README.md']
        assert len(item_files) == 1
        markdown = archive.read(item_files[0]).decode()
        assert markdown.startswith('---\n')
        import yaml
        metadata = yaml.safe_load(markdown.split('---\n')[1])
        assert metadata['title'] == 'Exportable'
        assert '## Prompt' in markdown
        assert 'Renamed collection' in archive.read('README.md').decode()
    assert client.delete(f"/api/collections/{col['id']}").status_code == 204
    assert client.get(f"/api/items/{saved['id']}").json()['collectionIds'] == []
    assert client.post('/api/export', json={'collectionIds': [], 'format': 'md'}).status_code == 400


def test_ai_contract_fallback_and_citations(client):
    saved = item(client, title='Python reference', prompt='Python decorator guide')
    payload = {'prompt': 'Explain python decorators', 'response': 'A decorator wraps a function', 'locale': 'ru'}
    for path in ['suggest-titles', 'suggest-tags', 'suggest-categories']:
        r = client.post('/api/ai/' + path, json=payload)
        assert isinstance(r.json(), list) and r.json()
        assert r.headers['x-ai-provider'] == 'fallback'
    assert isinstance(post(client, 'ai/summarize', payload), str)
    assert 'Task:' in post(client, 'ai/improve-prompt', {'prompt': 'write a poem', 'locale': 'kk'})
    r = post(client, 'ai/ask', {'question': 'Python decorator', 'history': [], 'locale': 'en'})
    assert r['answer'] and any(c['itemId'] == saved['id'] and c['title'] == saved['title'] for c in r['citations'])
    assert post(client, 'ai/ask', {'question': 'zzzzunknown'})['citations'] == []


def test_import_parse_and_batch_save(client):
    r = post(client, 'ai/split-chat', {'raw': 'User: hi there\nChatGPT: hello!\nUser: second question\nClaude: second answer'})
    assert len(r) == 2 and r[0]['prompt'] == 'hi there' and r[0]['source'] == 'chatgpt'
    saved = post(client, 'items/batch', {'items': r})
    assert len(saved) == 2 and saved[1]['source'] == 'claude'


def test_batch_is_atomic_on_invalid_reference(client):
    before = len(client.get('/api/items?search=Atomic').json())
    r = client.post('/api/items/batch', json={'items': [
        {'title': 'Atomic valid'}, {'title': 'Atomic invalid', 'tagIds': ['999999']},
    ]})
    assert r.status_code == 404
    assert len(client.get('/api/items?search=Atomic').json()) == before
