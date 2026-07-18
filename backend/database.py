import os
import json
import urllib.parse
from contextlib import asynccontextmanager, contextmanager, suppress
from dotenv import load_dotenv
import asyncio
import threading

# Chargement robuste du .env (Docker vs Local)
current_dir = os.path.dirname(__file__)
env_paths = [os.path.join(current_dir, '.env'), os.path.join(current_dir, '..', '.env')]
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)
        break

def get_database_url():
    """
    Construit l'URL de connexion à la base de données.
    Utilise Secret Manager si DATABASE_SECRET_NAME est défini (Cloud Run).
    Sinon, se replie sur DATABASE_URL (Local).
    """
    print("[DB-DEBUG] Entrée dans get_database_url.", flush=True)
    secret_name = os.getenv("DATABASE_SECRET_NAME")
    is_cloud_run = os.getenv("K_SERVICE")

    print(f"[DB-DEBUG] Is Cloud Run (K_SERVICE is set): {is_cloud_run is not None}", flush=True)
    print(f"[DB-DEBUG] DATABASE_SECRET_NAME: {secret_name}", flush=True)

    # [FIX EXPERT] Sécurité : Empêcher le fallback local si on est déployé sur Cloud Run
    if is_cloud_run and not secret_name:
        raise RuntimeError("CRITICAL: Déploiement Cloud Run détecté, mais 'DATABASE_SECRET_NAME' est manquant. Ajoutez la variable d'environnement.")

    if secret_name:
        print(f"[DB] Configuration Cloud Run détectée. Tentative de récupération du secret: {secret_name}", flush=True)
        try:
            from google.cloud import secretmanager
            
            with suppress(ImportError):
                import google.auth
            
            client = secretmanager.SecretManagerServiceClient()
            
            # Tenter de récupérer le project_id
            try:
                _, project_id = google.auth.default()
            except (google.auth.exceptions.DefaultCredentialsError, AttributeError):
                project_id = None # Gérer le cas où les credentials ne sont pas trouvés

            project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
            print(f"[DB-DEBUG] Project ID déterminé: {project_id}", flush=True)
            
            if not project_id and "/" not in secret_name:
                raise ValueError("Impossible de déterminer le 'project_id' Google Cloud. Veuillez définir GOOGLE_CLOUD_PROJECT ou fournir le chemin complet du secret.")
            
            if "/" not in secret_name:
                name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
            else:
                name = secret_name
            
            print(f"[DB-DEBUG] Accès au nom complet du secret: {name}", flush=True)
            response = client.access_secret_version(request={"name": name})
            secret_payload = response.payload.data.decode("UTF-8")
            
            credentials = json.loads(secret_payload)
            print(f"[DB-DEBUG] Clés trouvées dans le secret JSON: {list(credentials.keys())}", flush=True)

            raw_user = credentials.get("username") or credentials.get("user") or ""
            raw_password = credentials.get("password") or ""
            raw_dbname = credentials.get("dbname") or credentials.get("database") or "beyondthecv"
            
            user = urllib.parse.quote(str(raw_user), safe="")
            password = urllib.parse.quote(str(raw_password), safe="")
            dbname = urllib.parse.quote(str(raw_dbname), safe="")
            
            db_host = credentials.get("host")
            db_port = credentials.get("port", "5432")
            instance = credentials.get("instance_connection_name")
            
            if instance:
                print(f"[DB-DEBUG] Méthode de connexion: Cloud SQL Instance ({instance})", flush=True)
                encoded_host = urllib.parse.quote(f"/cloudsql/{instance}", safe="")
                return f"postgresql://{user}:{password}@/{dbname}?host={encoded_host}"
            elif db_host:
                print(f"[DB-DEBUG] Méthode de connexion: TCP ({db_host}:{db_port})", flush=True)
                return f"postgresql://{user}:{password}@{db_host}:{db_port}/{dbname}"
            else:
                raise ValueError("Le secret JSON doit contenir soit 'instance_connection_name' (Cloud SQL) soit 'host' (TCP).")
        except Exception as e:
            import traceback
            print(f"[CRITICAL] Erreur détaillée lors de la récupération des secrets : {e}", flush=True)
            traceback.print_exc()
            raise RuntimeError(f"CRITICAL: Failed to configure database from Secret Manager. Root cause: {type(e).__name__}. Check logs above.") from e

    # Fallback pour le développement local
    fallback_url = os.getenv("DATABASE_URL", "")
    if fallback_url:
        print("[DB-DEBUG] Utilisation du fallback DATABASE_URL (développement local).", flush=True)
    else:
        print("[WARNING] Ni DATABASE_SECRET_NAME ni DATABASE_URL ne sont définis. Tentative de connexion par défaut (chaîne vide).", flush=True)
        
    return fallback_url

DATABASE_URL = None # [FIX LIFECYCLE] L'URL est maintenant calculée et assignée dans le lifespan de main.py pour éviter les I/O à l'import.
try:
    import psycopg2
    from psycopg2 import pool as psycopg2_pool
    print("[DB] Module 'psycopg2' loaded successfully.", flush=True)
except ImportError:
    psycopg2 = None
    psycopg2_pool = None
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
        self._async_pool = None
        self._sync_pool = None
        self._async_lock = asyncio.Lock()
        self._sync_lock = threading.Lock()
        
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

    async def close_pools(self):
        """Ferme proprement les pools de connexions."""
        if self._async_pool:
            await self._async_pool.close()
            self._async_pool = None
        if self._sync_pool:
            self._sync_pool.closeall()
            self._sync_pool = None

    @asynccontextmanager
    async def get_connection(self):
        """Get async database connection."""
        if not self.database_url:
            raise RuntimeError("Database not configured. Lifespan may have failed.")
        if asyncpg:
            if not self._async_pool:
                async with self._async_lock:
                    if not self._async_pool:
                        # [OPTIMISATION] Pool asynchrone pour encaisser un pic de trafic
                        self._async_pool = await asyncpg.create_pool(self.database_url, min_size=5, max_size=50, command_timeout=60, timeout=30)
            async with self._async_pool.acquire() as conn:
                yield conn
        else:
            # [FIX ROBUSTESSE] Encapsulation de la connexion synchrone dans un try/except
            # pour intercepter les erreurs de bas niveau (ex: socket cassé) avant qu'elles ne fassent crasher le processus.
            conn = None
            try:
                conn = await asyncio.to_thread(self._get_sync_conn)
                yield conn
            except Exception as e:
                print(f"[DB CRITICAL] Failed to connect with psycopg2 fallback: {e}", flush=True)
                raise  # On relève l'exception pour que l'appelant puisse la gérer.
            finally:
                if conn:
                    # On rend la connexion au pool plutôt que de la détruire
                    await asyncio.to_thread(self._release_sync_conn, conn)
                    
    def _get_sync_conn(self):
        if not self._sync_pool:
            with self._sync_lock:
                if not self._sync_pool:
                    if not psycopg2_pool:
                        raise RuntimeError("psycopg2.pool n'est pas disponible.")
                    
                    # [FIX] Ajout d'un timeout de connexion robuste pour psycopg2
                    dsn = self.database_url
                    if 'connect_timeout' not in dsn:
                        dsn += "&connect_timeout=30" if '?' in dsn else "?connect_timeout=30"

                    self._sync_pool = psycopg2_pool.ThreadedConnectionPool(5, 50, dsn=dsn)
        return self._sync_pool.getconn()
        
    def _release_sync_conn(self, conn):
        if self._sync_pool and conn:
            self._sync_pool.putconn(conn)

    @contextmanager
    def get_sync_connection(self):
        """Get synchronous database connection."""
        if not self.database_url:
            raise RuntimeError("Database not configured. Lifespan may have failed.")
        conn = self._get_sync_conn()
        try:
            yield conn
        finally:
            self._release_sync_conn(conn)

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
            
            is_write = safe_query.strip().upper().startswith(("INSERT", "UPDATE", "DELETE"))

            async with conn.transaction():
                if is_write and 'RETURNING' not in safe_query.upper():
                    await conn.execute(safe_query, *params)
                    rows = []
                else:
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