#!/usr/bin/env python3
"""Reconcile dev with tested main and prod with the manually promoted OCI manifest."""

import fcntl
import json
import os
from pathlib import Path
import re
import runpy
import subprocess
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
CONFIG = Path(os.environ.get('PROMPTSHELF_CONFIG_DIR', ROOT.parent / '.environments'))
PACKAGE = '240103126-beep/promptshelf'
IMAGE = f'ghcr.io/{PACKAGE}'
DIGEST = re.compile(r'sha256:[0-9a-f]{64}')
ACCEPT = ', '.join((
    'application/vnd.oci.image.index.v1+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.docker.distribution.manifest.v2+json',
))


def registry_image(tag, token, missing_ok=False):
    request = Request(
        f'https://ghcr.io/v2/{PACKAGE}/manifests/{tag}',
        method='HEAD',
        headers={'Authorization': f'Bearer {token}', 'Accept': ACCEPT},
    )
    try:
        with urlopen(request, timeout=12) as result:
            digest = result.headers.get('Docker-Content-Digest', '')
    except HTTPError as error:
        if missing_ok and error.code == 404:
            return None
        raise
    if not DIGEST.fullmatch(digest):
        raise ValueError('GHCR did not return a SHA-256 manifest digest')
    return f'{IMAGE}@{digest}'


def apply(target, image, revision=None):
    receipt = CONFIG / f'{target}.release'
    current = receipt.read_text().split() if receipt.exists() else []
    if current and current[0] == image:
        return
    subprocess.run(['docker', 'pull', '--quiet', image], check=True, timeout=180)
    label = subprocess.check_output([
        'docker', 'image', 'inspect', '--format',
        '{{index .Config.Labels "org.opencontainers.image.revision"}}', image,
    ], text=True, timeout=15).strip()
    if not re.fullmatch(r'[0-9a-f]{40}', label) or (revision and label != revision):
        raise ValueError('The container label does not match the expected Git revision')
    command = [str(ROOT / 'environments.sh'), target, 'up']
    try:
        subprocess.run([*command, image], check=True, timeout=230)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        if current:
            subprocess.run([*command, current[0]], check=True, timeout=230)
        raise
    temporary = receipt.with_suffix('.tmp')
    temporary.write_text(f'{image} {label}\n')
    temporary.replace(receipt)
    print(f'{target}: deployed {label} ({image})', flush=True)


def main():
    ci = runpy.run_path(str(ROOT / 'poll-deploy.py'))
    with (CONFIG / 'reconcile.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        query = urlencode({'service': 'ghcr.io', 'scope': f'repository:{PACKAGE}:pull'})
        with urlopen(f'https://ghcr.io/token?{query}', timeout=12) as response:
            token = json.load(response)['token']

        failures = []
        for target in ('prod', 'dev'):
            if not (CONFIG / f'{target}.env').is_file():
                continue
            try:
                if target == 'dev':
                    revision = ci['select_revision'](ci['fetch_runs'](), None)
                    if revision:
                        apply(target, registry_image(revision, token), revision)
                else:
                    approved = registry_image('production', token, missing_ok=True)
                    if approved:
                        apply(target, approved)
            except Exception as error:
                # Either environment can still reconcile when the other is unavailable.
                failures.append(error)
                print(f'{target}: reconciliation failed: {type(error).__name__}', flush=True)
        if failures:
            raise RuntimeError('One or more environments could not reconcile') from failures[0]


if __name__ == '__main__':
    main()
