import sqlite3
import os
import sys
from dotenv import load_dotenv

# Tenter d'importer psycopg2
try:
    import psycopg2
except ImportError:
    print("Erreur: Le module 'psycopg2' est requis. Installez-le avec 'pip install psycopg2-binary'.")
    sys.exit(1)

# Charger les variables d'environnement (.env)
load_dotenv()

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "storage.db")
PG_DB_URL = os.getenv("DATABASE_URL")

def migrate_data():
    """
    Migre les données de SQLite vers PostgreSQL.
    Suppose que le schéma PostgreSQL est déjà initialisé (via le lancement du backend).
    """
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ Base SQLite introuvable : {SQLITE_DB_PATH}")
        return

    if not PG_DB_URL:
        print("❌ Variable d'environnement DATABASE_URL manquante.")
        return
    print("🔄 Démarrage de la migration : SQLite -> PostgreSQL")
    print(f"   Source : {SQLITE_DB_PATH}")
    # Masquage partiel du mot de passe pour l'affichage
    safe_url = PG_DB_URL.split('@')[1] if '@' in PG_DB_URL else 'PostgreSQL'
    print(f"   Cible  : ...@{safe_url}")

    try:
        # Connexions
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        sqlite_conn.row_factory = sqlite3.Row # Permet l'accès par nom de colonne
        sqlite_cur = sqlite_conn.cursor()

        pg_conn = psycopg2.connect(PG_DB_URL)
        pg_cur = pg_conn.cursor()

        # Liste des tables à migrer
        tables = ["users", "documents", "tasks"]

        for table in tables:
            print(f"   Processing table '{table}'...")
            
            # 1. Lire les données SQLite
            try:
                sqlite_cur.execute(f"SELECT * FROM {table}")
                rows = sqlite_cur.fetchall()
            except sqlite3.OperationalError:
                print(f"   ⚠️ Table '{table}' introuvable dans SQLite. Ignorée.")
                continue

            if not rows:
                print(f"   ℹ️ Table '{table}' vide.")
                continue

            # 2. Préparer l'insertion Postgres dynamiquement
            # On récupère les noms de colonnes depuis la première ligne pour correspondre exactement
            first_row = dict(rows[0])
            columns = list(first_row.keys())
            columns_str = ", ".join(columns)
            # Psycopg2 utilise %s comme placeholder
            placeholders = ", ".join(["%s"] * len(columns))
            
            query = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"

            # 3. Insérer les données
            count = 0
            for row in rows:
                values = list(row)
                pg_cur.execute(query, values)
                count += 1
            
            print(f"   ✅ {count} lignes migrées pour '{table}'.")

        pg_conn.commit()
        print("\n🎉 Migration terminée avec succès !")

    except Exception as e:
        print(f"\n❌ Erreur critique pendant la migration : {e}")
        if 'pg_conn' in locals() and pg_conn:
            pg_conn.rollback()
    finally:
        if 'sqlite_conn' in locals() and sqlite_conn:
            sqlite_conn.close()
        if 'pg_conn' in locals() and pg_conn:
            pg_conn.close()

if __name__ == "__main__":
    migrate_data()