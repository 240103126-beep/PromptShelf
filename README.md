# PromptShelf

Personal library for AI prompts and chats. Save prompts and responses from ChatGPT, Claude and Gemini, organize them with tags, categories and collections, find them in seconds, and export them as Markdown or ZIP.

**Live demo:** https://prompt-shelf-pcif.vercel.app

## Features
- Library with search, filters (category, collection, source, favorites) and list/grid views
- Item editor with AI actions: suggest title, summarize, tags, category, improve prompt
- Collections, tags and categories (rename, recolor, merge, delete)
- Import pasted chats and split them into items with AI
- AI assistant that answers questions about your library
- Export to .md and ZIP
- Interface in Kazakh, Russian and English, light and dark theme

## Stack
- Frontend: React, TypeScript, Vite (mock service for data)
- Backend: FastAPI, SQLAlchemy ORM, SQLite
- Contract: `openapi.yaml`

## Run locally
Frontend:

    cd frontend
    npm install
    npm run dev

Backend:

    cd backend
    source .venv/bin/activate
    pytest -q
    uvicorn app.main:app --reload

## Development process
Built in iterations: frontend with mock service, then `openapi.yaml` contract, then backend, then SQLite storage, then frontend + backend integration. Work is tracked in GitHub Issues (labels `mvp`, `post-mvp`, `user-test-bug`). Roles and process: `pm.md`, `qa.md`, `qa-engineer.md`, `docs/brainstorm.md`.

## Status
The deployed frontend uses mock data. The backend works separately and is covered by tests. Connecting them is tracked in the `post-mvp` issue.
