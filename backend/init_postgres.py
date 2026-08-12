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
    
    # [FIX EXPERT] Détection d'une mauvaise configuration locale.
    # Si le script est lancé localement (pas dans Docker) mais que l'URL pointe vers 'db', on lève une erreur claire.
    if "://db:" in db_url or "@db:" in db_url and not os.path.exists("/.dockerenv"):
        raise ConnectionError("ERREUR DE CONFIGURATION : Votre DATABASE_URL pointe vers l'hôte 'db', qui n'est accessible que depuis Docker. Pour un développement local, veuillez utiliser 'localhost' (ex: postgresql://user:pass@localhost:5432/dbname).")

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
        
        # Create tables - [FIX] Remplacement de DROP TABLE par CREATE TABLE IF NOT EXISTS pour la robustesse
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                is_premium BOOLEAN DEFAULT FALSE,
                subscription_status subscription_status DEFAULT 'active',
                subscription_start_date TIMESTAMPTZ,
                subscription_expiration_date TIMESTAMPTZ,
                subscription_extension_count INTEGER DEFAULT 0,
                last_extension_date TIMESTAMPTZ,                
                -- Columns from migrations.py
                last_login TIMESTAMPTZ,
                total_ia_cost REAL DEFAULT 0.0,
                is_admin BOOLEAN DEFAULT FALSE,
                is_tester BOOLEAN DEFAULT FALSE,
                quota_pitch INTEGER DEFAULT 30,
                quota_qa INTEGER DEFAULT 30,
                quota_mes INTEGER DEFAULT 30,
                quota_negotiation INTEGER DEFAULT 30,
                quota_regeneration INTEGER DEFAULT 30,
                quota_update INTEGER DEFAULT 30,
                quota_entreprises INTEGER DEFAULT 5,
                quota_offres INTEGER DEFAULT 15,
                credits INTEGER DEFAULT 30,
                deleted_at TIMESTAMPTZ,
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
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                session_hash TEXT,
                tasks_map JSONB
            )
        """)
        print("✅ Table 'job_applications' created")

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
                -- [FIX] metadata column was missing from products table
                metadata JSONB, 
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                downloaded_count INTEGER DEFAULT 0,
                printed_count INTEGER DEFAULT 0,
                last_downloaded_at TIMESTAMPTZ,
                last_printed_at TIMESTAMPTZ,
                is_archived BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMPTZ
            )
        """)
        print("✅ Table 'products' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                path TEXT,
                type TEXT,
                -- [FIX] media_type column was missing from documents table
                media_type TEXT, 
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'subscription_plans' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_extensions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
                extension_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                new_expiration_date TIMESTAMPTZ NOT NULL,
                price_paid_cents INTEGER,
                payment_status TEXT,
                transaction_id TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
                tags JSONB DEFAULT '[]'::jsonb,
                application_id TEXT REFERENCES job_applications(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'training_sessions' created")
        cur.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;")
        print("✅ Column 'training_sessions.tags' ensured")

        # Interview debriefs table (used by debrief_service.py)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS interview_debriefs (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                company_name TEXT,
                job_title TEXT,
                interview_date TIMESTAMPTZ,
                interview_format TEXT,
                interlocutor_type TEXT,
                interlocutor_name TEXT,
                interlocutor_role TEXT,
                ambiance JSONB,
                positive_signals JSONB,
                red_flags JSONB,
                questions_asked TEXT,
                difficult_questions TEXT,
                learnings TEXT,
                preparation_points TEXT,
                interest_level INTEGER,
                analysis_result JSONB,
                analysis_created_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'interview_debriefs' created")
        cur.execute("ALTER TABLE interview_debriefs ADD COLUMN IF NOT EXISTS analysis_result JSONB")
        cur.execute("ALTER TABLE interview_debriefs ADD COLUMN IF NOT EXISTS analysis_created_at TIMESTAMPTZ")
        print("✅ Columns 'interview_debriefs.analysis_*' ensured")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS generation_cache (
                cache_key TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                content_type TEXT,
                result JSONB,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'generation_cache' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_offer_imports (
                normalized_url TEXT PRIMARY KEY,
                source_url TEXT NOT NULL,
                provider TEXT DEFAULT '',
                content_hash TEXT NOT NULL,
                title TEXT,
                company TEXT,
                location TEXT,
                industry TEXT,
                employment_type TEXT,
                date_posted TEXT,
                description TEXT,
                preview_json JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Table 'job_offer_imports' created")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_offer_imports_content_hash ON job_offer_imports(content_hash)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_offer_imports_provider ON job_offer_imports(provider)")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                status TEXT,
                task_type TEXT,
                result TEXT,
                error_message TEXT,                
                -- Columns from migrations.py
                duration_ms INTEGER,
                estimated_cost REAL,
                model_used TEXT,
                prompt_version TEXT,
                progress_percent INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ,
                metadata JSONB,
                application_id TEXT REFERENCES job_applications(id) ON DELETE CASCADE
            )
        """)
        print("✅ Table 'tasks' created")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS admin_audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
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

        # --- MIGRATION COLONNES MANQUANTES + RECHARGEMENT TESTEURS ---
        # Ajout des colonnes quota_entreprises et quota_offres si absentes
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_entreprises INTEGER DEFAULT 5;")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_offres INTEGER DEFAULT 15;")

        # Rechargement inconditionnel de tous les comptes à 30 crédits (mode testeur)
        cur.execute("""
            UPDATE users SET
                credits          = 30,
                quota_pitch      = 30,
                quota_qa         = 30,
                quota_mes        = 30,
                quota_negotiation = 30,
                quota_regeneration = 30,
                quota_update     = 30,
                quota_entreprises = 5,
                quota_offres     = 15,
                is_tester        = TRUE
            WHERE deleted_at IS NULL
        """)
        print(f"✅ Tous les comptes existants rechargés à 30 crédits (mode testeur)")

        conn.commit()
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
