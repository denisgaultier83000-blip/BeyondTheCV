import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

# Ajout du dossier parent au path pour trouver database.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import depuis la configuration centrale pour garantir la même connexion
try:
    from database import get_database_url
except ImportError:
    print("❌ Erreur : Impossible d'importer get_database_url depuis database.py.")
    sys.exit(1)

def initialize_schema():
    """
    Vérifie et crée les tables PostgreSQL nécessaires si elles n'existent pas.
    Ce script n'effectue AUCUNE migration de données.
    """
    db_url = get_database_url()
    if not db_url:
        print("❌ La variable DATABASE_URL n'est pas définie dans .env")
        sys.exit(1)
        
    print("🔌 Connexion à la base de données...")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"❌ Impossible de se connecter à PostgreSQL : {e}")
        sys.exit(1)

    try:
        print("🚀 Initialisation du schéma de la base de données...")
        
        # Création des tables requises pour les nouvelles fonctionnalités.
        print("   - Vérification de la table 'products'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                product_type TEXT,
                filename TEXT,
                title TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("   - Vérification de la table 'subscriptions'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE,
                plan_name TEXT,
                status TEXT,
                start_date TIMESTAMP,
                end_date TIMESTAMP
            )
        """)

        print("   - Vérification de la table 'evaluations'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                product_id TEXT,
                evaluator_name TEXT,
                rating TEXT,
                overall_satisfaction_score INTEGER,
                quality_score INTEGER,
                usability_score INTEGER,
                feature_completeness_score INTEGER,
                comments TEXT,
                improvements_suggested TEXT,
                would_recommend BOOLEAN,
                tags TEXT[],
                internal_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("   - Vérification de la table 'user_profiles'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                profile_data JSONB
            )
        """)
        
        print("   - Vérification de la table 'training_sessions'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                theme TEXT,
                question_type TEXT,
                question_text TEXT,
                user_answer TEXT,
                score INTEGER,
                strengths TEXT,
                weaknesses TEXT,
                improved_answer TEXT,
                tags JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;")

        print("   - Vérification de la table 'interview_sessions'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                application_id TEXT,
                question_text TEXT,
                user_answer TEXT,
                score INTEGER,
                feedback JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        print("   - Vérification de la table 'generation_cache'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS generation_cache (
                cache_key TEXT PRIMARY KEY,
                user_id TEXT,
                content_type TEXT,
                result JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("   - Vérification de la table 'job_offer_imports'...")
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_offer_imports_content_hash ON job_offer_imports(content_hash)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_job_offer_imports_provider ON job_offer_imports(provider)")

        print("   - Vérification de la table 'job_applications'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_applications (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                target_company TEXT,
                target_job TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_hash TEXT,
                tasks_map JSONB
            )
        """)
        try:
            cur.execute("ALTER TABLE job_applications ADD COLUMN session_hash TEXT")
            cur.execute("ALTER TABLE job_applications ADD COLUMN tasks_map JSONB")
        except Exception:
            conn.rollback()

        print("   - Vérification de la table 'feedbacks'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                feature TEXT,
                is_positive BOOLEAN,
                comments TEXT,
                job_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        print("   - Migration de la table 'users' (Ajout des quotas)...")
        try:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_pitch INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_qa INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_mes INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_negotiation INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_regeneration INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_update INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 30;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_ia_cost REAL DEFAULT 0.0;")
            # Quotas de ressources (entreprises suivies, offres analysées)
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_entreprises INTEGER DEFAULT 5;")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_offres INTEGER DEFAULT 15;")
            # Mode test global: tous les comptes existants sont alignés aux limites testeurs.
            cur.execute("""
                UPDATE users
                SET is_tester = TRUE,
                    credits = 30,
                    quota_pitch = 30,
                    quota_qa = 30,
                    quota_mes = 30,
                    quota_negotiation = 30,
                    quota_regeneration = 30,
                    quota_update = 30,
                    quota_entreprises = 5,
                    quota_offres = 15
            """)
        except Exception as e:
            conn.rollback()
            print(f"     ⚠️ Impossible d'altérer la table 'users' (elle n'existe peut-être pas encore) : {e}")

        print("   - Vérification de la table 'payments'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY, user_id TEXT, user_email TEXT, status TEXT, offer_name TEXT, 
                amount_paid REAL, currency TEXT, purchase_date TIMESTAMP, stripe_invoice_url TEXT
            )
        """)

        # -------------------------------------------------------
        # CACHES PARTAGÉS (cross-user, économies IA majeures)
        # -------------------------------------------------------
        print("   - Vérification de la table 'company_analysis_cache'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS company_analysis_cache (
                cache_key    TEXT PRIMARY KEY,
                company_name TEXT NOT NULL,
                industry     TEXT DEFAULT '',
                result       JSONB NOT NULL,
                cached_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                hit_count    INTEGER NOT NULL DEFAULT 0,
                last_hit_at  TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_company_cache_name ON company_analysis_cache (LOWER(company_name));")

        print("   - Vérification de la table 'job_offer_cache'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_offer_cache (
                cache_key  TEXT PRIMARY KEY,
                result     JSONB NOT NULL,
                cached_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                hit_count  INTEGER NOT NULL DEFAULT 0,
                last_hit_at TIMESTAMP
            )
        """)

        print("   - Vérification de la table 'job_market_cache'...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS job_market_cache (
                cache_key  TEXT PRIMARY KEY,
                job_title  TEXT NOT NULL,
                country    TEXT DEFAULT '',
                result     JSONB NOT NULL,
                cached_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                hit_count  INTEGER NOT NULL DEFAULT 0,
                last_hit_at TIMESTAMP
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_market_cache_title ON job_market_cache (LOWER(job_title));")

        # Enrichissement de user_profiles (cache profil candidat)
        print("   - Migration de la table 'user_profiles' (cv_signature, updated_at)...")
        try:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cv_signature TEXT DEFAULT '';")
            cur.execute("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
        except Exception:
            conn.rollback()

        print("   - Vérification de la table 'candidate_behavioral_data'...")
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
                updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        print("\n🎉 Schéma vérifié et fonctionnel pour les données à venir !")

    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur critique lors de l'initialisation du schéma: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    initialize_schema()