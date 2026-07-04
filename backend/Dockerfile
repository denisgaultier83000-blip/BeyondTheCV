# Étape 1 : Image Python légère et officielle
FROM python:3.11-slim

# Étape 2 : Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    # [FIX PEP 668] Création et activation d'un environnement virtuel
    VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Étape 3 : Installation des dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    # Création de l'environnement virtuel
    && python3 -m venv $VIRTUAL_ENV \
    && rm -rf /var/lib/apt/lists/*

# Étape 4 : Dossier de travail
WORKDIR /app

# Étape 5 : Installation des dépendances Python dans le venv
COPY requirements.txt .
# L'activation du venv est déjà faite via la variable PATH
RUN pip install --no-cache-dir --no-deps -r requirements.txt

# Étape 6 : Copie du code
COPY . .

# Étape 7 : Lancement
EXPOSE $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]