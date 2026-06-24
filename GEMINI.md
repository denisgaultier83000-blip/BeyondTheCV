# Beyond The CV — Team Guidelines & Instructions

Welcome to the **Beyond The CV** workspace. This file serves as the primary technical reference for all agents and developers contributing to this project. Please respect these guidelines to ensure consistency, safety, and high-quality software engineering.

---

## 1. Stack & Architecture

### Frontend
- **Framework:** React 18 (TypeScript) styled with Bootstrap CSS / custom CSS adhering to the product Design System.
- **Icons:** `lucide-react`
- **Build Tool:** Vite
- **Testing:** Vitest (`front/package.json`)
- **Key Features:** Internationalization (i18next/react-i18next with support for 10 languages), "War Room" candidate dashboard, multi-page acquisition form (8 pages) storing a global JSON.

### Backend
- **Framework:** FastAPI (Python) with fully asynchronous background tasks/threads.
- **Database:** PostgreSQL (Production) / SQLite (Development).
- **APIs & AI:**
  - OpenAI (`OPENAI_API_KEY`)
  - Google GenAI / Gemini (`GEMINI_API_KEY`)
  - Serper API (`SERPER_API_KEY`) for real-time web search.
- **Testing:** Pytest

---

## 2. Project Layout

- `/front` — React single page application (SPA) with Vite & TypeScript.
- `/backend` — FastAPI application containing API endpoints, database connections, AI services, and background workers.
- `/tests` — Main testing suites (including integration, backend, and frontend tests).
- `project_specifications.md` — Detailed product & business rules (8-page form, strategic coaching posture, multi-lang).
- `DATABASE_SCHEMA.md` — Complete database schema and relationships.

---

## 3. Style & Design System Guidelines

Adhere strictly to the defined Palette:
- **Dark Blue:** `#0F2650`
- **Medium Blue:** `#446285`
- **Light Blue:** `#6DBEF7`
- **White (Logo):** `#F7FAFC`

Make components highly visual, professional, and resembling a military "War Room" / Tactical Command Post rather than a standard CV editor.

---

## 4. Key Development Commands

### Root Commands (npm workspaces)
- Install frontend dependencies: `npm install`
- Start frontend dev server: `npm run dev`

### Frontend Commands (inside `/front`)
- Run Vite Dev: `npm run dev`
- Build / Typecheck: `npm run build`
- Run Vitest tests: `npm run test`
- Check coverage: `npm run coverage`

### Backend Commands (inside `/backend` or with virtual environment active)
- Install dependencies: `pip install -r backend/requirements.txt`
- Start server (standard FastAPI): `uvicorn backend.main:app --reload` (or the corresponding wrapper scripts).

### Testing Commands (from workspace root)
- Run python tests: `pytest`

---

## 5. Coding & Contribution Rules

1. **Async by Default:** Any long-running API call (e.g., enterprise research, market research triggered during step submission) must be offloaded to asynchronous background jobs.
2. **Explicit Composition:** Prefer modular components and services. Avoid monolithic state files; modularize form state where possible.
3. **Robust Safety:** Never log or commit environment variables or credentials. Use GCP Secret Manager or standard `.env` configuration keys.
4. **Clean Code & Conventions:** Match the existing styling and naming patterns (English or French where already established in the codebase).
