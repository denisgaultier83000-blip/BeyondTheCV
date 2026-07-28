
import os
import psycopg2
import database # [FIX EXPERT] On importe le module entier, pas la variable isolée.
from dotenv import load_dotenv

# Chargement robuste du .env (Docker vs Local)
current_dir = os.path.dirname(__file__)
env_paths = [os.path.join(current_dir, '.env'), os.path.join(current_dir, '..', '.env')]
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)
        break

# [FIX LIFECYCLE] Initialisation de la base de données au bon moment.
# L'URL de la base de données (qui peut nécessiter un appel réseau à Secret Manager)
# est maintenant calculée ici, et non plus à l'import du module.
try:
    # 1. Calculer l'URL de manière sécurisée après le démarrage de l'app.
    db_url = database.get_database_url()
    
    # 2. Configurer l'instance et le module de base de données avec l'URL obtenue.
    database.DATABASE_URL = db_url
    
    # [DEBUG DB] Log ajouté pour confirmer l'URL injectée juste avant la connexion
    print(f"[DEBUG DB] DATABASE_URL utilisée pour la connexion: {database.DATABASE_URL}", flush=True)

except Exception as e:
    print(f"[DB CRITICAL] Database initialization failed: {e}", flush=True)
    raise RuntimeError("FATAL: Database initialization failed") from e


def get_postgres_connection():
    """Creates a direct synchronous connection to PostgreSQL using the correct URL."""
    # [FIX EXPERT] Lecture dynamique de la variable depuis le module.
    # Cela garantit qu'on lit bien l'URL générée dans le lifespan, et non le 'None' initial.
    if not database.DATABASE_URL:
        # This provides a clearer error if the URL is missing for any reason.
        raise ConnectionError("[DB MIGRATION] DATABASE_URL is not set. Cannot connect.")
    if "sqlite" in database.DATABASE_URL:
        raise ConnectionError(f"[DB MIGRATION] SQLite n'est plus supporté. Veuillez configurer une DATABASE_URL PostgreSQL dans votre .env. Actuel: {database.DATABASE_URL}")
    return psycopg2.connect(database.DATABASE_URL)

def create_tables():
    """Create all required tables in PostgreSQL."""
    conn = None
    cur = None
    
    try:
        # This now calls the corrected function within this file.
        conn = get_postgres_connection()
        cur = conn.cursor()

        print("[MIGRATE] Applying incremental migrations...")

        # --- MIGRATIONS POUR LA TABLE 'users' ---
        # Ce script ne crée plus la table, il s'assure que les colonnes existent.
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ia_cost REAL DEFAULT 0.0;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT FALSE;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_pitch INTEGER DEFAULT 10;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_qa INTEGER DEFAULT 25;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_mes INTEGER DEFAULT 6;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_negotiation INTEGER DEFAULT 4;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_regeneration INTEGER DEFAULT 3;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_update INTEGER DEFAULT 1;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 100;")
        print("✅ Table 'users' migrated.")

        # --- MIGRATIONS POUR LA TABLE 'documents' ---
        cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS application_id TEXT REFERENCES job_applications(id) ON DELETE SET NULL;")
        print("✅ Table 'documents' migrated.")

        # --- MIGRATIONS POUR LA TABLE 'tasks' ---
        cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS application_id TEXT REFERENCES job_applications(id) ON DELETE CASCADE;")
        cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS duration_ms INTEGER;")
        cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_cost REAL;")
        cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS model_used TEXT;")
        cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS prompt_version TEXT;")
        print("✅ Table 'tasks' migrated.")

        # --- MIGRATIONS POUR LA TABLE 'job_applications' ---
        cur.execute("ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS session_hash TEXT;")
        cur.execute("ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS tasks_map JSONB;")
        print("✅ Table 'job_applications' migrated.")

        conn.commit()
        return True

    except Exception as e:
        print(f"\n❌ Error creating tables: {e}")
        if conn:
            conn.rollback()
        raise e # Relève l'erreur pour que Pytest affiche la vraie cause
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def insert_default_subscription_plans():
    """Insert default subscription plans."""
    conn = None
    cur = None
    
    try:
        # This also calls the corrected function.
        conn = get_postgres_connection()
        cur = conn.cursor()
        
        plans = [
            ("plan_1_month", "1 Month", 30, 999, "One month extension"),
            ("plan_3_months", "3 Months", 90, 2499, "Three months extension"),
            ("plan_6_months", "6 Months", 180, 4499, "Six months extension"),
            ("plan_1_year", "1 Year", 365, 7999, "One year extension"),
        ]
        
        for plan_id, name, days, price_cents, desc in plans:
            cur.execute("""
                INSERT INTO subscription_plans 
                (id, plan_name, duration_days, price_cents, currency, description, is_active)
                VALUES (%s, %s, %s, %s, 'USD', %s, TRUE)
                ON CONFLICT (id) DO NOTHING
            """, (plan_id, name, days, price_cents, desc))
        
        conn.commit()
        print("✅ Default subscription plans inserted")
        return True
    except Exception as e:
        print(f"❌ Error inserting subscription plans: {e}")
        if conn:
            conn.rollback()
        raise e
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def verify_connection():
    """Verify PostgreSQL connection."""
    # This also calls the corrected function.
    try:
        conn = get_postgres_connection()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"✅ PostgreSQL connection successful: {version[0][:50]}...")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

if __name__ == "__main__":
    print("[MIGRATIONS] Starting database initialization...")
    print("-" * 60)
    
    if verify_connection():
        create_tables()
        insert_default_subscription_plans()
    else:
        print("\n❌ Cannot proceed without database connection")
