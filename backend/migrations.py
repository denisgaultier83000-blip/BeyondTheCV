
import os
import psycopg2
import database # [FIX EXPERT] On importe le module entier, pas la variable isolée.

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

        # [FIX CRITIQUE] Création sécurisée des types ENUM sans destruction
        cur.execute("SELECT 1 FROM pg_type WHERE typname = 'product_type';")
        if not cur.fetchone():
            cur.execute("CREATE TYPE product_type AS ENUM ('cv_ats', 'report', 'document', 'other');")
            print("✅ Type 'product_type' created")
            
        cur.execute("SELECT 1 FROM pg_type WHERE typname = 'subscription_status';")
        if not cur.fetchone():
            cur.execute("CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'extended');")
            print("✅ Type 'subscription_status' created")
            
        conn.commit()

        # Create tables
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_premium BOOLEAN DEFAULT FALSE,
                subscription_status subscription_status DEFAULT 'active',
                subscription_start_date TIMESTAMP,
                subscription_expiration_date TIMESTAMP,
                subscription_extension_count INTEGER DEFAULT 0,
                last_extension_date TIMESTAMP,
                deleted_at TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """)
        print("✅ Table 'users' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                profile_data JSONB
            )
        """)
        print("✅ Table 'user_profiles' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_type product_type NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT,
                file_size INTEGER,
                mime_type TEXT,
                title TEXT,
                description TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                downloaded_count INTEGER DEFAULT 0,
                printed_count INTEGER DEFAULT 0,
                last_downloaded_at TIMESTAMP,
                last_printed_at TIMESTAMP,
                is_archived BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP
            )
        """)
        print("✅ Table 'products' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id TEXT PRIMARY KEY,
                plan_name TEXT NOT NULL,
                duration_days INTEGER NOT NULL,
                price_cents INTEGER NOT NULL,
                currency TEXT DEFAULT 'USD',
                description TEXT,
                features JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'subscription_plans' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_extensions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
                extension_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                new_expiration_date TIMESTAMP NOT NULL,
                price_paid_cents INTEGER,
                payment_status TEXT,
                transaction_id TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'subscription_extensions' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                feature TEXT,
                feedback TEXT NOT NULL,
                reason TEXT,
                job_type TEXT,
                is_positive BOOLEAN,
                sentiment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'feedbacks' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                status TEXT,
                task_type TEXT,
                result TEXT,
                error_message TEXT,
                progress_percent INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                metadata JSONB
            )
        """)
        print("✅ Table 'tasks' created")

        # Create indexes for performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_subscription_expiry ON users(subscription_expiration_date)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)")
        print("✅ Indexes created")

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
