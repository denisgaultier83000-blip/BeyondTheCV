# [OPTIMISATION] Utilisation d'une image plus légère et spécifique à Python 3.11
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# [OPTIMISATION] Installation des dépendances système dans une couche séparée
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    latexmk \
    lmodern \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# [OPTIMISATION] Copie et installation des dépendances Python dans leur propre couche.
# Cette couche ne sera reconstruite que si le fichier requirements.txt change.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# [OPTIMISATION] Création de l'utilisateur non-root AVANT de copier le code
RUN useradd -m appuser

# [OPTIMISATION] Copie du code source à la toute fin.
# Seule cette couche sera reconstruite lors des modifications de code.
COPY --chown=appuser:appuser ./backend ./backend

USER appuser

EXPOSE 8080
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]