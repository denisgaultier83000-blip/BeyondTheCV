import os
import json
import urllib.parse
from contextlib import asynccontextmanager, contextmanager
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()

def get_database_url():
    """
    Construit l'URL de connexion à la base de données.
    Utilise Secret Manager si DATABASE_SECRET_NAME est défini (Cloud Run).
    Sinon, se replie sur DATABASE_URL (Local).
    """
    # [DEBUG EXPERT] Affichage brut et inconditionnel de la variable pour lever le doute
    raw_secret = os.getenv("DATABASE_SECRET_NAME")
    print(f"[DEBUG DB] os.getenv('DATABASE_SECRET_NAME') retourne : {repr(raw_secret)}", flush=True)

    secret_name = os.getenv("DATABASE_SECRET_NAME")
    
    # [FIX EXPERT] Sécurité : Empêcher le fallback local si on est déployé sur Cloud Run
    if os.getenv("K_SERVICE") and not secret_name:
        raise RuntimeError("CRITICAL: Déploiement Cloud Run détecté, mais 'DATABASE_SECRET_NAME' est manquant. Ajoutez la variable d'environnement.")

    if secret_name:
        print(f"[DB] Configuration Cloud Run détectée. Récupération du secret: {secret_name}", flush=True)
        try:
            from google.cloud import secretmanager
            import google.auth
            
            # Initialisation du client Secret Manager
            client = secretmanager.SecretManagerServiceClient()
            _, project_id = google.auth.default()
            project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
            
            # Construction du chemin du secret (si le nom court est fourni)
            if "/" not in secret_name:
                name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
            else:
                name = secret_name
                
            response = client.access_secret_version(request={"name": name})
            secret_payload = response.payload.data.decode("UTF-8")
            
            # Analyse du JSON contenant les credentials
            credentials = json.loads(secret_payload)
            # [FIX EXPERT] Encodage URL obligatoire pour protéger les caractères spéciaux (@, ?, /, #)
            user = urllib.parse.quote(credentials.get("username", credentials.get("user", "")), safe="")
            password = urllib.parse.quote(credentials.get("password", ""), safe="")
            dbname = urllib.parse.quote(credentials.get("dbname", credentials.get("database", "beyondthecv")), safe="")
            instance = credentials.get("instance_connection_name", "beyondthecv:europe-west1:btcv-prod-db-france")
            
            # Construction de la chaîne de connexion pour Cloud SQL Auth Proxy
            return f"postgresql://{user}:{password}@/{dbname}?host=/cloudsql/{instance}"
        except Exception as e:
            print(f"[CRITICAL] Erreur lors de la récupération des secrets : {e}", flush=True)
            # [FIX EXPERT] Forcer un crash explicite au lieu d'un échec silencieux.
            # Si la récupération du secret échoue, l'application ne doit PAS continuer avec une URL vide.
            # En levant l'exception, le log Cloud Run montrera la VRAIE cause de l'échec (permission, secret introuvable, etc.).
            raise RuntimeError("CRITICAL: Failed to configure database from Secret Manager. Check logs above for the root cause.") from e

    # Fallback pour le développement local
    fallback_url = os.getenv("DATABASE_URL", "")
    if not fallback_url:
        print("[WARNING] Ni DATABASE_SECRET_NAME ni DATABASE_URL ne sont définis. Tentative de connexion par défaut (localhost).", flush=True)
    return fallback_url

DATABASE_URL = None # [FIX LIFECYCLE] L'URL est maintenant calculée et assignée dans le lifespan de main.py pour éviter les I/O à l'import.
try:
    import psycopg2
    print("[DB] Module 'psycopg2' loaded successfully.", flush=True)
except ImportError:
    psycopg2 = None
    print("[CRITICAL] Module 'psycopg2' not found. FIX: Run rebuild Docker", flush=True)

try:
    import asyncpg
    print("[DB] Module 'asyncpg' loaded successfully.", flush=True)
except ImportError:
    asyncpg = None
    print("[WARNING] Module 'asyncpg' not found. Will use psycopg2 for async operations.", flush=True)


class Database:
    def __init__(self):
        self.db_type = "postgres"
        self.database_url = None # Sera configuré par le lifespan dans main.py
        
        # [FIX EXPERT] L'initialisation ne doit pas se faire lors de l'import du module.
        # Elle est désormais déléguée exclusivement au gestionnaire 'lifespan' de FastAPI (main.py).

    def _init_db(self):
        """Initialize the database and create tables if they don't exist."""
        try:
            # Import and run migrations
            from migrations import create_tables, insert_default_subscription_plans
            
            print("[DB] Running PostgreSQL migrations...", flush=True)
            if not create_tables():
                raise RuntimeError("Échec de la création des tables PostgreSQL.")
            if not insert_default_subscription_plans():
                raise RuntimeError("Échec de l'insertion des plans d'abonnement par défaut.")
            print("[DB] PostgreSQL migrations completed successfully", flush=True)
        except Exception as e:
            print(f"[DB] Error initializing PostgreSQL: {e}", flush=True)
            raise

    @asynccontextmanager
    async def get_connection(self):
        """Get async database connection."""
        if not self.database_url:
            raise RuntimeError("Database not configured. Lifespan may have failed.")
        if asyncpg:
            # Use asyncpg for PostgreSQL async connections
            conn = await asyncpg.connect(self.database_url)
            try:
                yield conn
            finally:
                await conn.close()
        else:
            # [FIX ROBUSTESSE] Encapsulation de la connexion synchrone dans un try/except
            # pour intercepter les erreurs de bas niveau (ex: socket cassé) avant qu'elles ne fassent crasher le processus.
            conn = None
            try:
                conn = await asyncio.to_thread(psycopg2.connect, self.database_url)
                yield conn
            except Exception as e:
                print(f"[DB CRITICAL] Failed to connect with psycopg2 fallback: {e}", flush=True)
                raise  # On relève l'exception pour que l'appelant puisse la gérer.
            finally:
                if conn:
                    # La fermeture de la connexion est aussi une opération bloquante.
                    await asyncio.to_thread(conn.close)

    @contextmanager
    def get_sync_connection(self):
        """Get synchronous database connection."""
        if not self.database_url:
            raise RuntimeError("Database not configured. Lifespan may have failed.")
        conn = psycopg2.connect(self.database_url)
        try:
            yield conn
        finally:
            conn.close()

    async def execute(self, conn, query, params=()):
        """Helper robuste pour exécuter des requêtes (conversion SQLite (?) vers PostgreSQL native)."""
        # Conversion automatique de la syntaxe SQLite (?) vers PostgreSQL (%s)
        safe_query = query.replace('?', '%s')
        
        if hasattr(conn, 'cursor') and not hasattr(conn, 'fetch'):
            # Mode psycopg2 (synchrone wrappé en asynchrone, ne possède pas de méthode fetch direct sur la connection)
            def _run_query():
                from psycopg2.extras import RealDictCursor
                cur = conn.cursor(cursor_factory=RealDictCursor)
                cur.execute(safe_query, params)
                if safe_query.strip().upper().startswith(("INSERT", "UPDATE", "DELETE")):
                    conn.commit()
                return cur
                
            # [FIX PERFORMANCE] Ne bloque pas l'event loop ASGI
            cur = await asyncio.to_thread(_run_query)
            
            class AsyncCursor:
                def __init__(self, c): self.c = c
                async def fetchone(self): return self.c.fetchone()
                async def fetchall(self): return self.c.fetchall()
            return AsyncCursor(cur)
        else:
            # Mode asyncpg (natif asynchrone)
            if '%s' in safe_query:
                parts = safe_query.split('%s')
                safe_query = parts[0]
                for i in range(1, len(parts)): safe_query += f"${i}" + parts[i]
            
            rows = await conn.fetch(safe_query, *params)
            class AsyncpgCursor:
                def __init__(self, r): self.r = r; self.i = 0
                async def fetchone(self):
                    res = dict(self.r[self.i]) if self.i < len(self.r) else None
                    if res: self.i += 1
                    return res
                async def fetchall(self): return [dict(row) for row in self.r]
            return AsyncpgCursor(rows)

# Singleton
db = Database()

# Helper function for main.py (backward compatibility)
def init_db():
    db._init_db()