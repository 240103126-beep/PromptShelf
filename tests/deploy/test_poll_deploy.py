"""Exercise the deployment trust boundary without network requests or host changes."""
from copy import deepcopy
import importlib.util
from pathlib import Path
import subprocess
from unittest.mock import Mock

import pytest

spec = importlib.util.spec_from_file_location('poll_deploy', Path(__file__).parents[2] / 'deploy/poll-deploy.py')
poller = importlib.util.module_from_spec(spec)
spec.loader.exec_module(poller)
CURRENT = 'a' * 40
NEW = 'b' * 40


def successful_run():
    return {'workflow_runs': [{
        'event': 'push', 'status': 'completed', 'conclusion': 'success',
        'head_branch': 'main', 'path': '.github/workflows/ci.yml', 'head_sha': NEW,
        'repository': {'full_name': '240103126-beep/PromptShelf'},
        'head_repository': {'full_name': '240103126-beep/PromptShelf'},
    }]}


@pytest.mark.parametrize(('key', 'value'), [
    ('event', 'pull_request'), ('event', 'workflow_dispatch'),
    ('status', 'in_progress'), ('status', 'queued'),
    ('conclusion', 'failure'), ('conclusion', 'cancelled'), ('conclusion', None),
    ('head_branch', 'feature/unsafe'), ('path', '.github/workflows/other.yml'),
    ('repository', {'full_name': 'attacker/PromptShelf'}),
    ('head_repository', {'full_name': 'attacker/PromptShelf'}),
    ('head_repository', None), ('head_sha', 'b' * 7),
    ('head_sha', NEW + ';echo unsafe'), ('head_sha', NEW + '\n'),
])
def test_untrusted_run_never_executes_deploy(tmp_path, monkeypatch, key, value):
    payload = successful_run()
    payload['workflow_runs'][0][key] = value
    current = tmp_path / 'current-revision'
    current.write_text(CURRENT + '\n')
    monkeypatch.setattr(poller, 'fetch_runs', lambda: payload)
    execute = Mock()
    monkeypatch.setattr(poller.subprocess, 'run', execute)
    assert poller.poll(current, '/trusted/deploy.sh') is None
    execute.assert_not_called()


def test_current_successful_revision_is_not_redeployed(tmp_path, monkeypatch):
    current = tmp_path / 'current-revision'
    current.write_text(NEW + '\n')
    monkeypatch.setattr(poller, 'fetch_runs', successful_run)
    execute = Mock()
    monkeypatch.setattr(poller.subprocess, 'run', execute)
    assert poller.poll(current, '/trusted/deploy.sh') is None
    execute.assert_not_called()


def test_successful_main_revision_invokes_only_trusted_script_with_full_sha(tmp_path, monkeypatch):
    current = tmp_path / 'current-revision'
    current.write_text(CURRENT + '\n')
    payload = successful_run()
    payload['workflow_runs'][0]['head_sha'] = NEW.upper()
    monkeypatch.setattr(poller, 'fetch_runs', lambda: payload)
    execute = Mock()
    monkeypatch.setattr(poller.subprocess, 'run', execute)
    assert poller.poll(current, '/trusted/deploy.sh') == NEW
    execute.assert_called_once_with(['/trusted/deploy.sh', NEW], check=True, timeout=600)
    assert current.read_text() == CURRENT + '\n'  # Only healthchecked deploy.sh updates this file.


def test_failed_deploy_does_not_record_new_revision(tmp_path, monkeypatch):
    current = tmp_path / 'current-revision'
    current.write_text(CURRENT + '\n')
    monkeypatch.setattr(poller, 'fetch_runs', successful_run)
    monkeypatch.setattr(poller.subprocess, 'run', Mock(side_effect=subprocess.CalledProcessError(1, 'deploy.sh')))
    with pytest.raises(subprocess.CalledProcessError):
        poller.poll(current, '/trusted/deploy.sh')
    assert current.read_text() == CURRENT + '\n'


def test_api_error_never_executes_deploy(tmp_path, monkeypatch):
    fetch = Mock(side_effect=OSError('API unavailable'))
    execute = Mock()
    monkeypatch.setattr(poller, 'fetch_runs', fetch)
    monkeypatch.setattr(poller.subprocess, 'run', execute)
    with pytest.raises(OSError):
        poller.poll(tmp_path / 'current-revision', '/trusted/deploy.sh')
    execute.assert_not_called()


@pytest.mark.parametrize('payload', [None, [], {}, {'workflow_runs': []}, {'workflow_runs': [None]}])
def test_missing_or_invalid_workflow_response_never_selects_revision(payload):
    assert poller.select_revision(deepcopy(payload), CURRENT) is None
