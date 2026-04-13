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
    texlive-xetex \
    && rm -rf /var/lib/apt/lists/*

# Étape 4 : Création du dossier de travail
WORKDIR /app

# Étape 5 : Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Étape 6 : Copie du code source
COPY . .

# Étape 7 : Exposition du port et lancement de Uvicorn
EXPOSE $PORT

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]