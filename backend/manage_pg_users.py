"""
Nom : backend/manage_pg_users.py
But : Gérer les utilisateurs de test directement dans la base PostgreSQL.
Utilisation : 
  python manage_pg_users.py list
  python manage_pg_users.py seed
  python manage_pg_users.py clear
  python manage_pg_users.py init
"""
import os
import sys
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv
from passlib.context import CryptContext

# Tenter d'importer psycopg2
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ Erreur: Le module 'psycopg2' est requis. Installez-le avec 'pip install psycopg2-binary'.")
    sys.exit(1)

# Configuration
load_dotenv()
PG_DB_URL = os.getenv("DATABASE_URL")
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_connection():
    if not PG_DB_URL:
        print("❌ Variable d'environnement DATABASE_URL manquante dans le .env.")
        sys.exit(1)
    try:
        return psycopg2.connect(PG_DB_URL)
    except Exception as e:
        print(f"❌ Impossible de se connecter à PostgreSQL : {e}")
        sys.exit(1)

def init_db(conn):
    """Crée les tables nécessaires si elles n'existent pas."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                hashed_password TEXT,
                first_name TEXT,
                last_name TEXT,
                created_at TEXT,
                is_premium BOOLEAN DEFAULT FALSE
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                profile_data TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
    conn.commit()
    print("✅ Tables 'users' et 'user_profiles' vérifiées/créées avec succès.")

def clear_users(conn):
    """Supprime tous les utilisateurs de test."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM user_profiles")
        cur.execute("DELETE FROM users")
    conn.commit()
    print("🗑️ Tous les utilisateurs et profils ont été supprimés de PostgreSQL.")

def list_users(conn):
    """Affiche la liste des utilisateurs actuels."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id, email, first_name, last_name, is_premium FROM users")
        users = cur.fetchall()
        if not users:
            print("ℹ️ Aucun utilisateur dans la base de données.")
            return
        
        print(f"\n📋 {len(users)} utilisateur(s) trouvé(s) :")
        print("-" * 60)
        for u in users:
            premium_flag = "⭐ VIP" if u['is_premium'] else "Standard"
            print(f" 👤 {u['email']} | {u['first_name']} {u['last_name']} | {premium_flag}")
        print("-" * 60)

def seed_users(conn):
    """Injecte 5 utilisateurs de test standards."""
    init_db(conn)
    users_to_create = 5
    print(f"🌱 Injection de {users_to_create} profils de test...")
    
    with conn.cursor() as cur:
        for i in range(1, users_to_create + 1):
            email = f"test{i}@test.com"
            hashed_pw = pwd_context.hash(f"test{i}")
            user_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            try:
                cur.execute("""
                    INSERT INTO users (id, email, hashed_password, first_name, last_name, created_at, is_premium) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (user_id, email, hashed_pw, f"Candidat{i}", "Test", now, True))
                
                # Mock Data basique pour le profil
                mock_data = {
                    "form": {"first_name": f"Candidat{i}", "last_name": "Test", "email": email}
                }
                cur.execute("INSERT INTO user_profiles (user_id, profile_data) VALUES (%s, %s)", (user_id, json.dumps(mock_data)))
                print(f"   ✅ {email} créé (Mot de passe: test{i})")
            except psycopg2.IntegrityError:
                conn.rollback()
                print(f"   ⚠️ L'utilisateur {email} existe déjà.")
                continue
    conn.commit()
    print("🎉 Injection terminée !")

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1].lower() not in ["init", "seed", "clear", "list"]:
        print("⚠️ Utilisation : python manage_pg_users.py [action]")
        print("Actions disponibles :")
        print("  init  : Créer les tables si elles n'existent pas")
        print("  seed  : Ajouter des utilisateurs de test (test1@test.com...)")
        print("  list  : Afficher les utilisateurs existants")
        print("  clear : Vider TOUTE la table utilisateur (⚠️ DANGER)")
        sys.exit(1)
        
    action = sys.argv[1].lower()
    connection = get_connection()
    try:
        globals()[f"{action}_users" if action != "init" else "init_db"](connection)
    finally:
        connection.close()