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

from database import init_db

# [CONFIG] Chargement de la configuration globale de l'application
def load_app_config():
    try:
        config_path = os.path.join(os.path.dirname(__file__), "data", "app_config.json")
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

        # [DEBUG] Vérification des dépendances critiques
        try:
            result = subprocess.run(["pip", "freeze"], capture_output=True, text=True)
            installed = result.stdout.lower()
            missing = [p for p in ["pypdf", "fastapi", "psycopg2-binary"] if p not in installed]
            if missing: 
                print(f"⚠️ MISSING PACKAGES: {missing}", flush=True)
                print("🔧 Attempting AUTO-FIX (pip install)...", flush=True)
                subprocess.run(["pip", "install", *missing], check=True)
                print("✅ Packages installed. Ready.", flush=True)
            else:
                print("✅ Critical packages verified (pypdf, fastapi, psycopg2-binary).", flush=True)
        except Exception as e: 
            print(f"⚠️ Auto-install failed: {e}", flush=True)

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

        # Initialisation de la DB
        try:
            init_db()
            print("[DB] Database initialized successfully.", flush=True)
        except Exception as e:
            print(f"[DB CRITICAL] Database initialization failed: {e}", flush=True)
        
        # [LOG] Network Info - Affiche l'IP réelle pour configurer le Frontend
        current_ip = get_local_ip()
        is_docker = os.path.exists("/.dockerenv")

        print("----------------------------------------------------------------", flush=True)
        print("🚀 BACKEND READY", flush=True)
        print("⚠️  AUTHENTICATION DISABLED (Test Mode)", flush=True)
        if is_docker:
            print("🐳 Docker Environment Detected", flush=True)
            print(f"   Container IP: {current_ip} (Internal)", flush=True)
            print("   Host Access:  http://localhost:8000 (If ports are mapped)", flush=True)
        else:
            print(f"📡 Network Access: http://{current_ip}:8000", flush=True)
            print("🏠 Local Access:   http://127.0.0.1:8000", flush=True)
        print("----------------------------------------------------------------", flush=True)
        
        # Lancement du nettoyage au démarrage
        cleanup_system()
    except Exception as e:
        print(f"Error initializing directories: {e}", flush=True)
    yield

# --- Rate Limiting (Anti-Abuse) ---
RATE_LIMIT_WINDOW = APP_CONFIG.get("rate_limit_window", 60)
RATE_LIMIT_MAX_REQUESTS = APP_CONFIG.get("rate_limit_max_requests", 100)
request_history: Dict[str, List[float]] = defaultdict(list)

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
    # Allow health check without limit
    if request.url.path == "/":
        return

    try:
        client_ip = request.client.host if request.client else "unknown"
    except AttributeError:
        client_ip = "unknown"
    now = time.time()
    
    # Clean up old timestamps for the current IP (Sliding Window)
    request_history[client_ip] = [t for t in request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    # [ROBUSTESSE] Garbage Collection: On 1% of requests, clean up the whole dict to prevent memory leaks from old IPs
    if random.random() < 0.01:
        stale_ips = [ip for ip, timestamps in request_history.items() if not timestamps or now - timestamps[-1] > RATE_LIMIT_WINDOW]
        for ip in stale_ips:
            del request_history[ip]
        if stale_ips:
            print(f"[CLEANUP] Purged {len(stale_ips)} stale IPs from rate limiter history.")

    if len(request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        print(f"[SECURITY] Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    request_history[client_ip].append(now)

app = FastAPI(title="BeyondTheCV API", lifespan=lifespan)

# [DEBUG] Middleware pour tracer les requêtes entrantes (Confirme la connexion réseau)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # [ROBUSTESSE] Catch-all pour éviter le crash "Exception in ASGI application"
    try:
        response = await call_next(request)
    except Exception as e:
        print(f"[CRITICAL] Uncaught Exception in {request.url.path}: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error": str(e)})

    process_time = (time.time() - start_time) * 1000
    try:
        client_ip = request.client.host if request.client else "unknown"
        print(f"[NET] {request.method} {request.url.path} - {response.status_code} ({process_time:.2f}ms) - IP: {client_ip}", flush=True)
    except Exception as e:
        print(f"[NET LOG ERROR] Could not log request: {e}", flush=True)
    return response

# Note: rate_limiter dependency can be added globally or per router
# app = FastAPI(..., dependencies=[Depends(rate_limiter)])

# --- CORS CONFIGURATION ---
cors_origins = [
    "http://localhost:3000",  # Frontend URL (React/Next.js)
    "http://localhost:5173",  # Frontend URL (Vite)
    "http://127.0.0.1:3000",
    "https://www.beyondthecv.app", # Allow production domain (www)
    "https://beyondthecv.app"      # Allow production domain (apex)
]

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Disposition", "X-CV-Analysis"], # CRUCIAL pour la barre de progression et le score
)

# [ROBUSTESSE] Chargement défensif des routeurs
# Si un fichier plante (ex: erreur de syntaxe ou d'import), l'API démarre quand même.
def include_safe_router(module_name, from_services=True):
    try:
        # Import dynamique
        if from_services:
            mod = __import__(f"services.{module_name}", fromlist=["router"]) # was: from services import cv
        else:
            mod = __import__(module_name, fromlist=["router"])
        app.include_router(mod.router)
        print(f"[ROUTER] ✅ Loaded: {module_name}", flush=True)
    except Exception as e:
        print(f"[ROUTER] ❌ FAILED loading {module_name}: {e}", flush=True)
        # On pourrait ajouter un routeur "placeholder" qui retourne l'erreur 500 pour les routes de ce module

include_safe_router("auth")
include_safe_router("cv_services")
include_safe_router("dashboard")
include_safe_router("documents")
include_safe_router("payment")
# New routes for products, evaluations, and subscriptions
include_safe_router("routes_products", from_services=False)

# [HEALTH] Endpoint racine pour vérifier la connectivité facilement depuis le navigateur
@app.get("/")
def health_check():
    return {"status": "online", "ip": get_local_ip(), "message": "Backend is reachable"}

if __name__ == "__main__":
    current_ip = get_local_ip()
    print("🚀 BACKEND IS STARTING...", flush=True)
    print(f"📡 Network Access: http://{current_ip}:8000", flush=True)
    print("🏠 Local Access:   http://127.0.0.1:8000", flush=True)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
