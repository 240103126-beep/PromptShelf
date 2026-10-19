# Brainstorming & Idea Generation: PromptShelf

## 1. Choosing the idea (based on TrustMRR / Carry)

- **Idea:** PromptShelf is a platform for developers and content creators to save, smartly organize, tag and generate AI prompts.
- **Why this idea:** It solves a real problem: managing the context of chats with LLMs (ChatGPT, Claude). It lets users quickly find the prompts they need and export them to Markdown.

## 2. Discussion of key functionality (MVP)

- Multi-page interface (Home, Prompt Library, AI Generator/Improver, Settings).
- Real-time language switching (Kazakh, Russian, English).
- AI integration for optimizing prompt text.
- Persistent storage on SQLite using an ORM.

## 3. Architecture and stack

- **Frontend:** React / Vite + Tailwind CSS (minimalist UI/UX, dark/light theme).
- **Backend:** FastAPI (Python) + SQLite + SQLAlchemy (ORM).
- **Deploy:** Ready to publish on Render / Vercel.
