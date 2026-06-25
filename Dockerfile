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
# [FIX] Copy code into a 'backend' subdirectory to make it a package.
COPY --chown=appuser:appuser backend/ ./backend

# User non-root
RUN useradd -m appuser
USER appuser

EXPOSE 8080

# [FIX] Update the command to use the package path 'backend.main'.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]