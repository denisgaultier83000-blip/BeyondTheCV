ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dépendances système (LaTeX)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    latexmk \
    lmodern \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Python deps (meilleur cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Code (version optimisée ownership)
COPY --chown=appuser:appuser backend/ .

# User non-root
RUN useradd -m appuser
USER appuser

EXPOSE 8080

# VPS version simple (sans $PORT dynamique)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]