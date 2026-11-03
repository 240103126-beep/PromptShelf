#!/usr/bin/env python3
"""Pull only completed successful main-push builds from the public CI workflow."""
import json
import logging
from pathlib import Path
import re
import subprocess
from urllib.request import Request, urlopen

REPOSITORY = '240103126-beep/PromptShelf'
WORKFLOW_PATH = '.github/workflows/ci.yml'
RUNS_URL = (
    f'https://api.github.com/repos/{REPOSITORY}/actions/workflows/ci.yml/runs'
    '?branch=main&event=push&status=success&per_page=1'
)
CURRENT_REVISION = Path('/opt/promptshelf/current-revision')
DEPLOY_SCRIPT = Path('/opt/promptshelf/deploy.sh')
LOG = logging.getLogger('promptshelf-autodeploy')


def normalize_sha(value):
    """Accept only a complete Git object ID, with no shell syntax or whitespace."""
    if isinstance(value, str) and re.fullmatch(r'[0-9a-fA-F]{40}', value):
        return value.lower()
    return None


def _expected_repository(value):
    name = value.get('full_name') if isinstance(value, dict) else None
    return isinstance(name, str) and name.casefold() == REPOSITORY.casefold()


def select_revision(payload, current_revision):
    """Filters in the request are conveniences; validate the response independently."""
    if not isinstance(payload, dict):
        return None
    runs = payload.get('workflow_runs')
    if not isinstance(runs, list) or not runs or not isinstance(runs[0], dict):
        return None
    run = runs[0]
    if not (
        run.get('event') == 'push'
        and run.get('status') == 'completed'
        and run.get('conclusion') == 'success'
        and run.get('head_branch') == 'main'
        and run.get('path') == WORKFLOW_PATH
        and _expected_repository(run.get('repository'))
        and _expected_repository(run.get('head_repository'))
    ):
        return None
    revision = normalize_sha(run.get('head_sha'))
    if not revision or revision == normalize_sha(current_revision):
        return None
    return revision


def fetch_runs():
    request = Request(RUNS_URL, headers={
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'PromptShelf-course-autodeploy',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    with urlopen(request, timeout=15) as response:
        body = response.read(1_048_577)
    if len(body) > 1_048_576:
        raise ValueError('Unexpectedly large workflow response')
    return json.loads(body)


def poll(current_revision_path=CURRENT_REVISION, deploy_script=DEPLOY_SCRIPT):
    try:
        current = Path(current_revision_path).read_text().strip()
    except FileNotFoundError:
        current = None
    revision = select_revision(fetch_runs(), current)
    if revision is None:
        return None
    LOG.info('Deploying successful main push %s', revision)
    # No shell is used; deploy.sh also validates the SHA and holds the deploy lock.
    subprocess.run([str(deploy_script), revision], check=True, timeout=600)
    LOG.info('Deployment health checks passed for %s', revision)
    return revision


def main():
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    try:
        poll()
    except Exception:
        LOG.exception('Automatic deployment failed; the next timer run will retry')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
