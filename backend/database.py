import os
from contextlib import asynccontextmanager, contextmanager
from dotenv import load_dotenv
import asyncio

# Load environment variables
load_dotenv()

# Déterminer le type de base de données
DATABASE_URL = os.getenv("DATABASE_URL", "")

print("[DB] PostgreSQL mode strictly enforced", flush=True)
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
        self.database_url = DATABASE_URL
        
        # [FIX EXPERT] L'initialisation ne doit pas se faire lors de l'import du module.
        # Elle est désormais déléguée exclusivement au gestionnaire 'lifespan' de FastAPI (main.py).

    def _init_db(self):
        """Initialize the database and create tables if they don't exist."""
        try:
            # Import and run migrations
            from migrations import create_tables, insert_default_subscription_plans
            
            print("[DB] Running PostgreSQL migrations...", flush=True)
            create_tables()
            insert_default_subscription_plans()
            print("[DB] PostgreSQL migrations completed successfully", flush=True)
        except Exception as e:
            print(f"[DB] Error initializing PostgreSQL: {e}", flush=True)
            raise

    @asynccontextmanager
    async def get_connection(self):
        """Get async database connection."""
        if asyncpg:
            # Use asyncpg for PostgreSQL async connections
            conn = await asyncpg.connect(self.database_url)
            try:
                yield conn
            finally:
                await conn.close()
        else:
            # Fallback: use psycopg2 if asyncpg not available
            # This is not ideal for async but will work
            conn = psycopg2.connect(self.database_url)
            try:
                yield conn
            finally:
                conn.close()

    @contextmanager
    def get_sync_connection(self):
        """Get synchronous database connection."""
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