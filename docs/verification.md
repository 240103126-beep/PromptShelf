# Verification record — 3 November 2026

Tested implementation: `4ab2e75d705bd30d6d64f2157ace3296a1b5ae2d`.

[GitHub Actions run — SUCCESS](https://github.com/240103126-beep/PromptShelf/actions/runs/41570607499)

| Requirement | Evidence | Result |
|---|---|---|
| Frontend tests | `npm --prefix frontend test` | 9 passed |
| Frontend types + production build | `VITE_USE_MOCK=false npm --prefix frontend run build` | Passed |
| Backend API and migration regression tests | `cd backend && python -m pytest -q` | 11 passed |
| CloudFormation syntax/resource lint | `cfn-lint deploy/cloudformation.yaml` | Passed |
| Single image containing UI + API | CI: `docker compose up -d --build --wait --wait-timeout 180` | Passed |
| PostgreSQL + app health | Compose db/app healthchecks and `/api/health` | Passed |
| Stack integration tests | `pytest -q tests/integration` | 2 passed |
| Each app feature through Chromium | `npm run test:e2e` against Compose/PostgreSQL | 28 passed (19.4s) |
| Database survival across app restart | `python tests/integration/check_restart.py` | PASS |
| Container publication | CI `image` job | GHCR SHA image published |

Playwright uses the real API, with no network interception. See [feature issue mapping](e2e-issues.json). CI retains browser reports and Compose logs as downloadable artifacts.

## Additional local PostgreSQL migration verification

An isolated PostgreSQL 18.1 instance on port 55432 was created for verification and stopped afterward. The backend suite passed against it: 11 passed. This Mac needed `PSYCOPG_IMPL=python` because loading the native driver stalled; Linux CI used the normal binary driver successfully.

A read-only SQLite backup was imported with `backend/migrate_data.py`. All six table counts matched: 5 categories, 2 collections, 9 tags, 6 items, 4 collection memberships, 7 item-tag relationships. A new item received an ID above the imported maximum. A second import was refused because the destination was nonempty. These were isolated verification databases, not deployed production data.

## Not yet completed

- First hosting provider: no Render/Railway account is connected, so there is no new deployed full-stack URL.
- AWS: no account is connected and no CloudFormation stack has been created. Template lint is preparation, not a deployment result.
- Automatic redeployment: workflow jobs exist, but are deliberately disabled until the owner supplies the deployment configuration. CI reports both deployment jobs as skipped.
- Public GHCR image visibility must be set in GitHub package settings before AWS can pull without credentials. The existing CLI token lacks package-read scope; package visibility was not verified.
- Local Docker Desktop files were copied, but application startup could not be verified on this macOS. The full container stack was verified on GitHub's Linux runner.

Render Blueprint uses a Docker image and managed PostgreSQL. Render does not execute Compose natively; that preview alone cannot be represented as satisfying a literal Compose-only first-host requirement. AWS configuration runs the same root Compose file used by CI.
