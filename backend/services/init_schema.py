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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

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