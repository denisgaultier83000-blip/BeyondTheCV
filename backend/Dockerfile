# Étape 1 : Image Python légère et officielle
FROM python:3.11-slim

# Étape 2 : Variables d'environnement pour optimiser Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Étape 3 : Installation des dépendances système (si besoin pour PostgreSQL ou LaTeX)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

# Étape 4 : Création du dossier de travail
WORKDIR /app

# Étape 5 : Installation des dépendances Python
# [FIX] Copie du requirements.txt depuis le contexte racine (../) vers le dossier de travail /app
COPY ../requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Étape 6 : Copie du code source
# [FIX] Copie du code dans un sous-dossier 'backend' pour le transformer en package Python
# et aligner la structure avec les imports relatifs (ex: from .database).
COPY . /app/backend

# Étape 7 : Exposition du port et lancement de Uvicorn
EXPOSE $PORT

# [FIX] Le WORKDIR final doit être /app pour que le PYTHONPATH inclue bien le package 'backend'
WORKDIR /app
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]