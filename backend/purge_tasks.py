#!/usr/bin/env python3
"""
Nom : backend/purge_tasks.py
But : Purger manuellement la table des tâches et le cache IA pour repartir sur une base saine.
Utilisation :
  python purge_tasks.py failed   -> Supprime uniquement les tâches en statut 'FAILED'
  python purge_tasks.py old      -> Supprime les tâches de plus de 24h
  python purge_tasks.py cache    -> Vide TOTALEMENT le cache IA (sans toucher à l'historique des tâches)
  python purge_tasks.py all      -> Vide TOTALEMENT la table 'tasks' et la table 'generation_cache'
"""
import sys
import psycopg2
from database import DATABASE_URL

def purge(mode):
    if not DATABASE_URL:
        print("❌ La variable DATABASE_URL est introuvable. Vérifiez votre fichier .env.")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        if mode == "failed":
            print("🧹 Suppression des tâches échouées...")
            cur.execute("DELETE FROM tasks WHERE status = 'FAILED'")
            print(f"   ✅ {cur.rowcount} tâches supprimées.")
            
        elif mode == "old":
            print("🧹 Suppression des tâches de plus de 24h...")
            cur.execute("DELETE FROM tasks WHERE created_at < NOW() - INTERVAL '1 day'")
            print(f"   ✅ {cur.rowcount} tâches supprimées.")
            
        elif mode == "cache":
            print("🧠 Purge totale du Cache IA en cours...")
            cur.execute("DELETE FROM generation_cache")
            print(f"   ✅ {cur.rowcount} entrées de cache supprimées. Les prochaines requêtes solliciteront l'IA.")
            
        elif mode == "all":
            print("🧨 PURGE TOTALE EN COURS...")
            cur.execute("DELETE FROM tasks")
            tasks_deleted = cur.rowcount
            cur.execute("DELETE FROM generation_cache")
            cache_deleted = cur.rowcount
            print(f"   ✅ {tasks_deleted} tâches supprimées.")
            print(f"   ✅ {cache_deleted} entrées de cache supprimées.")
            
        else:
            print("⚠️ Mode inconnu. Utilisez : failed, old, cache, ou all.")
            return
            
        conn.commit()
        print("🎉 Opération terminée avec succès !")

    except Exception as e:
        print(f"❌ Erreur lors de la purge : {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    mode = sys.argv[1].lower() if len(sys.argv) > 1 else "failed"
    purge(mode)