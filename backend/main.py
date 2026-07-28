from dotenv import load_dotenv
import os

# Chargement robuste du .env (Docker vs Local)
current_dir = os.path.dirname(__file__)
env_paths = [os.path.join(current_dir, '.env'), os.path.join(current_dir, '..', '.env')]
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)
        break

print("--- ENV VARS (Python) ---")
print(f"OPENAI_API_KEY loaded: {os.getenv('OPENAI_API_KEY') is not None}")
print(f"GEMINI_API_KEY loaded: {os.getenv('GEMINI_API_KEY') is not None}")
print(f"SERPER_API_KEY loaded: {os.getenv('SERPER_API_KEY') is not None}")
print("--------------------------")

import time
import socket
import random
import os
import subprocess
import json
import re

# [FIX] Forcer l'IPv4 pour résoudre les timeouts (60s) de l'API Google Gemini sous Docker
old_getaddrinfo = socket.getaddrinfo
def new_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    return [response for response in responses if response[0] == socket.AF_INET]
socket.getaddrinfo = new_getaddrinfo

from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from typing import Dict, List

from database import init_db, db, get_database_url
import database as database_module

# [CONFIG] Chargement de la configuration globale de l'application
def load_app_config():
    try:
        config_path = os.path.join(os.path.dirname(__file__), "data", "app_config.json")
        
        if not os.path.exists(config_path):
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            default_config = {
                "rate_limit_window": 60,
                "rate_limit_max_requests": 100,
                "required_templates": ["cv_ats.tex"]
            }
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=4)
            return default_config
            
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARNING] Could not load app_config.json: {e}", flush=True)
        return {}

APP_CONFIG = load_app_config()


def cleanup_system():
    """
    [ROBUSTESSE] Nettoyage automatique des ressources obsolètes.
    Supprime les fichiers temporaires > 24h et les PDF générés > 7 jours.
    """
    print("[MAINTENANCE] Starting system cleanup...", flush=True)
    from datetime import datetime, timedelta
    now = time.time()
    
    # 1. Nettoyage du dossier temp (Fichiers > 24h)
    temp_dir = "temp"
    if os.path.exists(temp_dir):
        for f in os.listdir(temp_dir):
            path = os.path.join(temp_dir, f)
            if os.path.isfile(path) and os.stat(path).st_mtime < now - 86400:
                try:
                    os.remove(path)
                    print(f"[CLEANUP] Removed old temp file: {f}")
                except Exception as e:
                    print(f"[CLEANUP] Error removing {f}: {e}")

    # 2. Nettoyage des tâches échouées ou très vieilles dans la DB (> 3 jours)
    # Empêche l'inflation de la table `tasks` causée par le stockage des gros JSON IA.
    try:
        from database import db
        with db.get_sync_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tasks WHERE created_at < NOW() - INTERVAL '3 days'")
            conn.commit()
        print("[CLEANUP] Purged old tasks (> 3 days) from database.", flush=True)
    except Exception as e:
        print(f"[CLEANUP] DB cleanup error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        os.makedirs("temp", exist_ok=True)
        os.makedirs("output", exist_ok=True)
        os.makedirs(os.path.join(os.path.dirname(__file__), "ai", "prompts"), exist_ok=True)
        os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
        print("Backend directories initialized.")

        print("✅ Critical packages verification skipped (handled by Dockerfile).", flush=True)

        # [LOG] Check active AI Provider
        gemini_key = os.getenv("GEMINI_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        default_provider = os.getenv("DEFAULT_AI_PROVIDER", "gemini").lower()
        
        if default_provider == "openai" and openai_key:
            print("🤖 AI Provider: OpenAI (Active Default)", flush=True)
        elif default_provider == "gemini" and gemini_key:
            print("🤖 AI Provider: Google Gemini (Active Default)", flush=True)
        elif openai_key or gemini_key:
            print(f"🤖 AI Provider: Fallback mode (Keys found, but default is {default_provider})", flush=True)
        else:
            print("⚠️ AI Provider: None (Simulation Mode)", flush=True)

        # Check for required templates
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        required_templates = APP_CONFIG.get("required_templates", ["cv_ats.tex"])
        for template in required_templates:
            if not os.path.exists(os.path.join(template_dir, template)):
                print(f"WARNING: Required template '{template}' not found in {template_dir}")

        # [FIX LIFECYCLE] Initialisation de la base de données au bon moment.
        # L'URL de la base de données (qui peut nécessiter un appel réseau à Secret Manager)
        # est maintenant calculée ici, et non plus à l'import du module.
        try:
            # 1. Calculer l'URL de manière sécurisée après le démarrage de l'app.
            db_url = get_database_url()
            
            # 2. Configurer l'instance et le module de base de données avec l'URL obtenue.
            database_module.DATABASE_URL = db_url
            db.database_url = db_url
            
            # [DEBUG DB] Log ajouté pour confirmer l'URL injectée juste avant la connexion
            print(f"[DEBUG DB] DATABASE_URL utilisée pour la connexion: {db.database_url}", flush=True)
            
            # 3. Lancer les migrations maintenant que la connexion est possible.
            init_db()
            
            print("[DB] Database initialized successfully.", flush=True)
        except Exception as e:
            print(f"[DB CRITICAL] Database initialization failed: {e}", flush=True)
            raise RuntimeError("FATAL: Database initialization failed") from e
        
        # [LOG] Network Info - Affiche l'IP réelle pour configurer le Frontend
        current_ip = get_local_ip()
        is_docker = os.path.exists("/.dockerenv")
        port = int(os.environ.get("PORT", 8080))

        print("----------------------------------------------------------------", flush=True)
        print("🚀 BACKEND READY", flush=True)
        print("⚠️  AUTHENTICATION DISABLED (Test Mode)", flush=True)
        if is_docker:
            print("🐳 Docker Environment Detected", flush=True)
            print(f"   Container IP: {current_ip} (Internal)", flush=True)
            print(f"   Host Access:  http://localhost:{port} (If ports are mapped)", flush=True)
        else:
            print(f"📡 Network Access: http://{current_ip}:{port}", flush=True)
            print(f"🏠 Local Access:   http://127.0.0.1:{port}", flush=True)
        print("----------------------------------------------------------------", flush=True)
        
        # Lancement du nettoyage au démarrage
        cleanup_system()
    except Exception as e:
        print(f"[FATAL STARTUP ERROR] {e}", flush=True)
        # [FIX EXPERT] On re-lève l'exception globale pour FORCER le crash de FastAPI.
        raise
    
    yield
    
    # --- Shutdown Phase ---
    print("[SHUTDOWN] Fermeture des pools de connexions à la base de données...", flush=True)
    try:
        await db.close_pools()
        print("[SHUTDOWN] ✅ Pools de connexions fermés avec succès.", flush=True)
    except Exception as e:
        print(f"[SHUTDOWN ERROR] ❌ Impossible de fermer proprement les pools : {e}", flush=True)

# --- Rate Limiting (Anti-Abuse) ---
RATE_LIMIT_WINDOW = APP_CONFIG.get("rate_limit_window", 60)
# [FIX] Forcé à 1000 (même si le fichier config indique 100) pour supporter le polling simultané des tâches IA
RATE_LIMIT_MAX_REQUESTS = max(APP_CONFIG.get("rate_limit_max_requests", 1000), 1000)
MAX_TRACKED_IPS = 10000 # [ANTI-OOM] Limite absolue du nombre d'IPs suivies en RAM
request_history: Dict[str, List[float]] = defaultdict(list)
_last_cleanup_time = time.time()

def get_local_ip():
    """Récupère l'adresse IP locale de la machine sur le réseau."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            # Fallback pour les réseaux locaux sans internet
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

async def rate_limiter(request: Request):
    """
    Simple in-memory rate limiter to prevent abuse.
    """
    global _last_cleanup_time
    # Allow health check without limit
    if request.url.path == "/":
        return

    # [SÉCURITÉ & RÉSEAU] Récupérer la vraie IP derrière un proxy/Docker
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
        
    now = time.time()
    
    # [OPTIMISATION] Nettoyage temporel prédictible (toutes les 60s) au lieu d'aléatoire (1%).
    # Évite de bloquer l'Event Loop de manière imprévisible lors des pics de trafic.
    if now - _last_cleanup_time > 60:
        _last_cleanup_time = now
        stale_ips = [ip for ip, timestamps in request_history.items() if not timestamps or now - timestamps[-1] > RATE_LIMIT_WINDOW]
        for ip in stale_ips:
            del request_history[ip]
            
    # [SÉCURITÉ ANTI-OOM] Limite stricte de taille. Empêche un attaquant de forger
    # des milliers de faux "X-Forwarded-For" pour faire exploser la RAM du serveur.
    if len(request_history) > MAX_TRACKED_IPS:
        request_history.clear() # O(1) flush : sauve le serveur du crash
        print("[SECURITY WARNING] Rate limiter memory flushed due to massive unique IP volume (DDoS).", flush=True)

    # Clean up old timestamps for the current IP (Sliding Window)
    request_history[client_ip] = [t for t in request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]

    if len(request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        print(f"[SECURITY] Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    request_history[client_ip].append(now)

# [FIX SECURITE] Activation du Rate Limiter sur toutes les routes de l'API
from fastapi import Depends
app = FastAPI(title="BeyondTheCV API", lifespan=lifespan, dependencies=[Depends(rate_limiter)])

# --- [FIX EXPERT] INCLUSION DES ROUTEURS ---
# C'est l'étape critique qui rend les endpoints accessibles. Sans cela, l'application ne connaît pas les routes et renvoie des erreurs 404.
# Les imports sont maintenant standardisés depuis le dossier 'services'.

from services.auth import router as auth_router # [FIX] Import depuis services.auth
from services.cv_services import router as cv_router
from routes_products import router as products_router
from services.admin_service import router as admin_router
from services.profile import router as profile_router # [FIX] Import du nouveau routeur de profil

# [FIX EXPERT] Centralisation de la gestion du préfixe "/api".
# Tous les sous-routeurs sont maintenant inclus sous ce préfixe unique.
# Cela garantit que toutes les URLs sont cohérentes et résout les erreurs 404.
api_router = FastAPI()
api_router.include_router(auth_router)
api_router.include_router(cv_router)
api_router.include_router(profile_router)
api_router.include_router(products_router)
api_router.include_router(admin_router)

app.mount("/api", api_router)

# --- Health Check Endpoint ---
@app.get("/", tags=["Health"])
async def read_root():
    """Health check endpoint."""
    return {"status": "ok"}


# --- CORS CONFIGURATION ---

# [FIX EXPERT] Configuration CORS robuste pour gérer les environnements multiples.
# Cela résout le problème "No 'Access-Control-Allow-Origin' header is present".

# 1. On lit la variable d'environnement qui contient les URLs du frontend, séparées par des virgules.
#    Exemple: "http://localhost:5173,https://staging.beyondthecv.app,https://beyondthecv.app"
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")

# 2. On transforme la chaîne en une liste propre.
origins = [origin.strip() for origin in allowed_origins_str.split(',')]

print(f"CORS: Allowing origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Permet aux cookies d'être inclus dans les requêtes
    allow_methods=["*"],     # Autorise toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],     # Autorise tous les en-têtes
)
