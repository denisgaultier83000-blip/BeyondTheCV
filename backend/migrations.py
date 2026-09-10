
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

        # --- MIGRATIONS POUR LA TABLE 'interview_debriefs' ---
        cur.execute("ALTER TABLE interview_debriefs ADD COLUMN IF NOT EXISTS analysis_result JSONB;")
        cur.execute("ALTER TABLE interview_debriefs ADD COLUMN IF NOT EXISTS analysis_created_at TIMESTAMPTZ;")
        print("✅ Table 'interview_debriefs' migrated.")

        # --- CRÉATION TABLE 'interview_question_intelligence' (base mutualisée et anonymisée) ---
        cur.execute("""
            CREATE TABLE IF NOT EXISTS interview_question_intelligence (
                id TEXT PRIMARY KEY,
                normalized_question TEXT NOT NULL,
                raw_question TEXT,
                company_name TEXT,
                sector TEXT,
                job_family TEXT,
                seniority TEXT,
                interview_stage TEXT,
                themes JSONB DEFAULT '[]'::jsonb,
                difficulty INTEGER,
                candidate_struggled BOOLEAN DEFAULT FALSE,
                occurrence_count INTEGER DEFAULT 1,
                first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                source_debrief_id TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_qint_company ON interview_question_intelligence(company_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_qint_sector ON interview_question_intelligence(sector)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_qint_job_family ON interview_question_intelligence(job_family)")
        print("✅ Table 'interview_question_intelligence' migrated.")

        # --- CRÉATION TABLE 'candidate_behavioral_data' ---
        cur.execute("""
            CREATE TABLE IF NOT EXISTS candidate_behavioral_data (
                user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                flaws                   JSONB DEFAULT '[]'::jsonb,
                motivations             TEXT,
                work_style              JSONB DEFAULT '[]'::jsonb,
                relational_style        JSONB DEFAULT '[]'::jsonb,
                professional_approach   JSONB DEFAULT '[]'::jsonb,
                coaching_style          TEXT,
                fears                   TEXT,
                clarification_insights  JSONB DEFAULT '{}'::jsonb,
                stress_level            TEXT,
                current_situation       TEXT,
                salary_expectations     TEXT,
                remote_preference       TEXT,
                off_cv_text             TEXT,
                updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("ALTER TABLE candidate_behavioral_data ADD COLUMN IF NOT EXISTS off_cv_text TEXT;")
        print("✅ Table 'candidate_behavioral_data' migrated.")

        # --- TABLES MARQUEURS DIFFÉRENCIANTS ET MESSAGES CLÉS ---
        cur.execute("""
            CREATE TABLE IF NOT EXISTS candidate_differentiators (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                fact TEXT NOT NULL,
                proof TEXT NOT NULL,
                interpretation TEXT NOT NULL,
                interview_usage TEXT NOT NULL,
                oral_phrasing TEXT,
                source TEXT DEFAULT 'manual',
                raw_user_story TEXT,
                category TEXT DEFAULT 'general',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_cand_diff_user ON candidate_differentiators(user_id)")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS application_key_messages (
                id TEXT PRIMARY KEY,
                application_id TEXT NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                differentiator_id TEXT REFERENCES candidate_differentiators(id) ON DELETE SET NULL,
                priority_level TEXT NOT NULL DEFAULT 'priority',
                headline TEXT NOT NULL,
                supporting_fact TEXT NOT NULL,
                oral_pitch TEXT,
                target_situation TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_app_key_msg_app ON application_key_messages(application_id)")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS interview_message_delivery (
                id TEXT PRIMARY KEY,
                debrief_id TEXT NOT NULL REFERENCES interview_debriefs(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                application_id TEXT REFERENCES job_applications(id) ON DELETE SET NULL,
                key_message_id TEXT REFERENCES application_key_messages(id) ON DELETE SET NULL,
                headline TEXT,
                delivered BOOLEAN DEFAULT FALSE,
                reason_if_not_delivered TEXT,
                candidate_comment TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_msg_deliv_debrief ON interview_message_delivery(debrief_id)")
        print("✅ Tables 'candidate_differentiators', 'application_key_messages', 'interview_message_delivery' migrated.")

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
