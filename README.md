# PromptShelf

A personal library for AI prompts and chats from ChatGPT, Claude and Gemini. Save responses, organize items, search your library and export Markdown or ZIP collections.

- React + TypeScript + Vite frontend, served as static files by FastAPI in production
- SQLAlchemy backend with PostgreSQL in Docker Compose; SQLite supported for local development
- Kazakh, Russian and English; light and dark themes
- Item CRUD, favorites, tags, categories, collections, import/export and AI assistance
- AI uses Gemini when `GEMINI_API_KEY` is set, otherwise a deterministic local fallback

The earlier [Vercel preview](https://prompt-shelf-pcif.vercel.app/) is a frontend demonstration. It is not evidence of the complete PostgreSQL/Docker deployment.

## One-command full stack

Install Docker Desktop (Apple Silicon on M3) and start it. From this repository:

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD in .env to a new alphanumeric password.
docker compose up --build --wait
```

Open <http://localhost:8000>. The browser calls `/api` on the same origin; database data lives in the named `pgdata` volume. The frontend production build uses the real API. No Gemini key is needed to try the fallback AI actions.

```sh
curl --fail http://localhost:8000/api/health
docker compose logs --tail=100 app
docker compose down
```

`docker compose down` preserves the database. `docker compose down --volumes` deletes it permanently.

## Develop separately

Use Node 24 and Python 3.12. Start the backend:

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r backend/requirements.lock
cd backend
../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8091
```

In another terminal:

```sh
cd frontend
npm ci
VITE_USE_MOCK=false npm run dev
```

The Vite development proxy forwards `/api` to port 8091 on the backend. For a frontend-only demonstration, explicitly set `VITE_USE_MOCK=true`; that mode does not persist changes on the server.

## Verification

```sh
# Backend API tests (temporary SQLite database)
cd backend
../.venv/bin/python -m pytest -q

# Frontend tests and production typecheck/build (from repository root)
npm --prefix frontend test
VITE_USE_MOCK=false npm --prefix frontend run build

# Integration and browser checks against the running Compose stack
.venv/bin/python -m pytest -q tests/integration
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright scenarios and their feature coverage are in `e2e/`. GitHub Actions is responsible for building the complete PostgreSQL Compose stack and running integration and browser checks before deployment. Workflow logs, rather than this README, show which checks have actually passed for a given commit.

## Deployment

See [deployment instructions](docs/deployment.md) for the optional free Render preview and the AWS CloudFormation + Compose deployment, GitHub OIDC setup, health checks, rollback and cleanup. Cloud configurations are preparation only until an account owner creates the resources and records their deployed URL.

This is a single-user coursework app without authentication. A public demo should contain only sample prompts. Do not store private chats, tokens or personal data in a public deployment.

## Coursework tracking

Track changes and each separate Playwright feature test in [GitHub Issues](https://github.com/240103126-beep/PromptShelf/issues). Close issues only after recording the exact verification command and its result. The API contract is in `openapi.yaml`; project history and planning are in `brainstorm.md`, `pm.md`, `qa.md` and `qa-engineer.md`.
