# ==============================================================================
# STAGE 1: Build du Frontend (React/Vite)
# =================================e==============================================
FROM node:20-slim as frontend-builder

WORKDIR /app

# Copie des fichiers de dépendances pour tirer parti du cache Docker
COPY package.json package-lock.json ./
COPY front/package.json ./front/

# Installation des dépendances pour le workspace "front"
RUN npm install

# Copie du code source du frontend
COPY front/ ./front/

# Build de l'application frontend
RUN npm run build --prefix front

# ==============================================================================
# STAGE 2: Build du Backend et image finale
# ==============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Installation des dépendances système (Python et LaTeX)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    latexmk \
    lmodern \
    # Nettoyage
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie du code du backend
COPY backend/ .

# [NOUVEAU] Copie des fichiers statiques du frontend depuis le premier stage
COPY --from=frontend-builder /app/front/dist ./static

EXPOSE 8080

# Note: Assurez-vous que votre application FastAPI (main.py) est configurée
# pour servir les fichiers statiques depuis le dossier "/app/static".
# Exemple: app.mount("/static", StaticFiles(directory="static"), name="static")

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]