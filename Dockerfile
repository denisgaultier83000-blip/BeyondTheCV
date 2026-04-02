# Utilisation d'une image de base officielle Python légère (Debian Slim)
FROM python:3.11-slim

# Variables d'environnement pour optimiser Python dans Docker
# PYTHONDONTWRITEBYTECODE=1 : Empêche Python d'écrire des fichiers .pyc
# PYTHONUNBUFFERED=1 : Force les logs à sortir directement dans la console (utile pour Docker logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Définition du répertoire de travail
WORKDIR /app

# Installation des dépendances système et de LaTeX
# Nous installons une version "medium" de TeX Live pour avoir les polices et packages courants pour les CV
# sans télécharger les 4Go de la distribution complète.
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    latexmk \
    lmodern \
    && rm -rf /var/lib/apt/lists/*

# Copie du fichier de dépendances
COPY requirements.txt .

# Installation des dépendances Python
# --no-cache-dir réduit la taille de l'image
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copie du code source de l'application (dossier backend)
COPY backend/ .

# Création d'un utilisateur non-root pour la sécurité
RUN useradd -m appuser && \
    chown -R appuser /app

# Bascule sur l'utilisateur non-root
USER appuser

# Exposition du port par défaut de FastAPI
EXPOSE 8080

# Commande de démarrage
# [FIX EXPERT] On utilise sh -c pour interpréter dynamiquement la variable $PORT
# injectée par Cloud Run. En local, cela retombera automatiquement sur 8080.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]