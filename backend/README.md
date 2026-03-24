# BeyondTheCV Backend (Python/FastAPI)

This is a Python FastAPI service that:
- Orchestrates AI generation using OpenAI API.
- Parses CVs (PDF/Docx).
- Generates documents (PDF via LaTeX, Docx).
- Manages candidate data processing.

Endpoints:
- GET / (Health Check)
- POST /api/parse-cv
- POST /api/generate
- POST /api/login
