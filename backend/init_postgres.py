#!/usr/bin/env python3
"""
PostgreSQL Database Initialization Script
Creates all required tables and indexes for BeyondTheCV
"""
import psycopg2
import os

# [FIX EXPERT] Importe DATABASE_URL depuis le module centralisé
# pour garantir une source de vérité unique pour la connexion.
# (Résout le crash si exécuté sur Cloud Run)
from database import get_database_url

def get_postgres_connection():
    db_url = get_database_url()
    if not db_url:
        raise ValueError("DATABASE_URL n'est pas défini. Veuillez le configurer dans votre fichier .env (ex: DATABASE_URL=postgresql://user:password@localhost:5432/dbname).")
    return psycopg2.connect(db_url)


def main():
    print("[MIGRATIONS] Starting PostgreSQL initialization...")
    print("-" * 60)
    
    conn = None
    cur = None

    try:
        conn = get_postgres_connection()
        cur = conn.cursor()
        print("✅ PostgreSQL connection successful")
        
        # Drop types if exist (reset)
        cur.execute("DROP TYPE IF EXISTS product_type CASCADE;")
        cur.execute("DROP TYPE IF EXISTS subscription_status CASCADE;")
        
        # Create types
        cur.execute("CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'extended');")
        cur.execute("CREATE TYPE product_type AS ENUM ('cv_ats', 'report', 'document', 'other');")
        print("✅ ENUM types created")
        
        # Create tables
        cur.execute("""
            DROP TABLE IF EXISTS users CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE users (
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
            CREATE TABLE IF NOT EXISTS job_applications (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                target_company TEXT,
                target_job TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_hash TEXT,
                tasks_map JSONB
            )
        """)
        print("✅ Table 'job_applications' created")

        cur.execute("""
            DROP TABLE IF EXISTS products CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE products (
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
            DROP TABLE IF EXISTS documents CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                path TEXT,
                type TEXT,
                media_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                application_id TEXT REFERENCES job_applications(id) ON DELETE CASCADE
            )
        """)
        print("✅ Table 'documents' created")

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
                user_id TEXT, -- Peut être NULL si l'utilisateur est supprimé
                feature TEXT NOT NULL, -- Le module concerné (ex: 'pitch', 'gap_analysis')
                is_positive BOOLEAN NOT NULL, -- true pour 👍, false pour 👎
                comments TEXT, -- Le commentaire textuel de l'utilisateur
                job_type TEXT, -- Le contexte du poste (ex: 'Product Manager')
                status TEXT DEFAULT 'new', -- Statut du feedback (new, read, processing, resolved, archived)
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        print("✅ Table 'feedbacks' created")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                application_id TEXT REFERENCES job_applications(id) ON DELETE CASCADE,
                question_text TEXT,
                user_answer TEXT,
                score INTEGER,
                feedback JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'interview_sessions' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                theme TEXT,
                question_type TEXT,
                question_text TEXT,
                user_answer TEXT,
                score INTEGER,
                strengths TEXT,
                weaknesses TEXT,
                improved_answer TEXT,
                application_id TEXT REFERENCES job_applications(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'training_sessions' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS generation_cache (
                cache_key TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                content_type TEXT,
                result JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'generation_cache' created")

        cur.execute("""
            DROP TABLE IF EXISTS tasks CASCADE;
        """)
        
        cur.execute("""
            CREATE TABLE tasks (
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
                metadata JSONB,
                application_id TEXT REFERENCES job_applications(id) ON DELETE CASCADE
            )
        """)
        print("✅ Table 'tasks' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                admin_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                admin_user_email TEXT,
                action TEXT NOT NULL,
                target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                target_user_email TEXT,
                details JSONB,
                ip_address TEXT
            );
        """)
        print("✅ Table 'admin_audit_logs' created")

        # Commit tables creation before creating indexes
        conn.commit()

        # Create indexes AFTER all tables are created
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        # cur.execute("CREATE INDEX IF NOT EXISTS idx_users_subscription_expiry ON users(subscription_expiration_date)")  # Commented out for now
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_application_id ON tasks(application_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_applications_user_session ON job_applications(user_id, session_hash)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_generation_cache_user_type ON generation_cache(user_id, content_type)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON admin_audit_logs(target_user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON admin_audit_logs(timestamp)")
        print("✅ Indexes created")

        # Insert default subscription plans
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
        
        print("✅ Default subscription plans inserted")

        conn.commit()
        print("\n🎉 PostgreSQL migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    main()
