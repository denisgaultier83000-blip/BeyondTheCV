import os
import sys
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

# Import depuis la configuration centrale pour garantir la même connexion
try:
    from database import DATABASE_URL
except ImportError:
    print("❌ Erreur : Impossible d'importer DATABASE_URL depuis database.py. Assurez-vous d'être dans le dossier backend.")
    sys.exit(1)

def run_migration():
    if not DATABASE_URL:
        print("❌ La variable DATABASE_URL n'est pas définie dans .env")
        sys.exit(1)
        
    print(f"🔌 Connexion à la base de données...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
    except Exception as e:
        print(f"❌ Impossible de se connecter à PostgreSQL : {e}")
        sys.exit(1)

    try:
        print("🚀 Début de la migration des données...")
        
        # 1. Création des nouvelles tables (sécurité si elles n'existent pas encore)
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
        
        # 2. Migration des Documents existants vers la nouvelle table Products
        print("📦 Migration des documents vers products...")
        cur.execute("""
            SELECT id, user_id, type, filename, created_at 
            FROM documents 
            WHERE id NOT IN (SELECT id FROM products)
        """)
        documents = cur.fetchall()
        for doc in documents:
            cur.execute("""
                INSERT INTO products (id, user_id, product_type, filename, title, description, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                doc['id'],
                doc['user_id'],
                doc['type'],
                doc['filename'],
                f"Document {doc['type']}",
                "Document migré depuis l'ancienne table",
                doc['created_at']
            ))
        print(f"   ✅ {len(documents)} documents migrés.")

        # 3. Migration du flag is_premium de la table Users vers Subscriptions
        print("💳 Migration des statuts premium vers subscriptions...")
        cur.execute("""
            SELECT id, is_premium, created_at 
            FROM users 
            WHERE is_premium = TRUE AND id NOT IN (SELECT user_id FROM subscriptions)
        """)
        premium_users = cur.fetchall()
        for user in premium_users:
            start_date = user['created_at'] if isinstance(user['created_at'], datetime) else datetime.now()
            end_date = start_date + timedelta(days=90) # Allocation par défaut (3 mois)
            
            cur.execute("""
                INSERT INTO subscriptions (id, user_id, plan_name, status, start_date, end_date)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                user['id'],
                "Premium",
                "active",
                start_date,
                end_date
            ))
        print(f"   ✅ {len(premium_users)} abonnements créés.")

        conn.commit()
        print("🎉 Migration terminée avec succès !")

    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur critique lors de la migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()