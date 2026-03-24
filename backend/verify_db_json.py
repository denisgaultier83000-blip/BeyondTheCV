"""
Nom : backend/verify_db_json.py
But : Vérifier l'intégrité JSON de la colonne 'result' dans la table 'tasks' de PostgreSQL.
"""
import psycopg2
import json
import os
import sys
from dotenv import load_dotenv

def verify_db():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    if not DATABASE_URL:
        print("❌ Variable DATABASE_URL introuvable.")
        return

    print(f"🔍 Audit de la base de données PostgreSQL...")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # 2. Vérifier la structure
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name='tasks'")
        if not cursor.fetchone():
            print("❌ La table 'tasks' n'existe pas.")
            return

        # 3. Analyser les résultats
        cursor.execute("SELECT id, status, result FROM tasks")
        rows = cursor.fetchall()
        
        print(f"📊 {len(rows)} tâches trouvées.")
        
        errors = 0
        valid = 0
        nulls = 0
        
        for task_id, status, result_str in rows:
            if result_str is None:
                nulls += 1
                continue
                
            try:
                json.loads(result_str)
                valid += 1
            except json.JSONDecodeError as e:
                errors += 1
                print(f"   ❌ Tâche {task_id} ({status}) : JSON Invalide !")
                print(f"      Erreur : {e}")
                print(f"      Début du contenu : {result_str[:100]}...")

        print("\n--- Bilan ---")
        print(f"✅ Valides : {valid}")
        print(f"⚪ Vides   : {nulls} (En cours ou Failed sans résultat)")
        
        if errors > 0:
            print(f"❌ Erreurs : {errors}")
            print("⚠️ La base de données contient des JSON corrompus.")
        else:
            print("🎉 Intégrité JSON parfaite.")

    except Exception as e:
        print(f"❌ Erreur critique : {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    verify_db()