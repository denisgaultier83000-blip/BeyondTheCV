# syntax=docker/dockerfile:1
# Etape 1 : Builder (Compilation des dépendances)
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Installation des outils de compilation uniquement dans le builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Installation dans le répertoire utilisateur pour faciliter la copie
RUN pip install --user --no-warn-script-location -r requirements.txt

# Etape 2 : Image finale (Runtime)
FROM python:3.11-slim

WORKDIR /app

# Ajout du chemin des binaires Python utilisateur
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# Installation des dépendances système Runtime (LaTeX)
# Cette étape est longue mais sera bien mise en cache car elle est avant les COPY
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    lmodern \
    cm-super \
    && rm -rf /var/lib/apt/lists/*

# Copie des dépendances Python depuis le builder
COPY --from=builder /root/.local /root/.local

# Copie du code source
COPY . .

# Création des dossiers nécessaires
RUN mkdir -p temp output ai/prompts

EXPOSE 8080

# Lancement via le script main.py pour qu'il puisse récupérer le port
# dynamiquement depuis la variable d'environnement $PORT injectée par Cloud Run.
CMD ["python", "main.py"]
