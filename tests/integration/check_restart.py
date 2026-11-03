"""Prove data survives restarting the app service without resetting PostgreSQL."""
import subprocess
import time
import uuid
import httpx

with httpx.Client(base_url='http://127.0.0.1:8000') as client:
    response = client.post('/api/items', json={'title': 'restart-' + uuid.uuid4().hex, 'source': 'other'})
    response.raise_for_status()
    item = response.json()
    try:
        subprocess.run(['docker', 'compose', 'restart', 'app'], check=True)
        for attempt in range(60):
            try:
                response = client.get('/api/items/' + item['id'])
                response.raise_for_status()
                assert response.json()['title'] == item['title']
                print('PostgreSQL persistence after app restart: PASS')
                break
            except httpx.HTTPError:
                time.sleep(2)
        else:
            raise AssertionError('App did not recover after restart')
    finally:
        client.post('/api/items/bulk-delete', json={'ids': [item['id']]}).raise_for_status()
