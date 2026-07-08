"""
# Migration Script : 001_consolidate_credits.py
#
# Objectif :
# 1. Consolider les anciennes colonnes `quota_*` dans la colonne unique `credits`.
# 2. Préparer la suppression des anciennes colonnes de quotas.
#
# IMPORTANT : Sauvegardez votre base de données avant d'exécuter ce script.
#
# Utilisation :
# 1. Assurez-vous que votre environnement est configuré (via .env).
# 2. Exécutez : python backend/migrations/001_consolidate_credits.py
# 3. Vérifiez la sortie.
# 4. (Optionnel) Exécutez manuellement les requêtes DROP COLUMN sur votre base de données.
"""
import os
import sys

# Assurer que le script peut trouver le module 'database' depuis la racine du projet
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

try:
    from backend.database import db, get_database_url
except ImportError as e:
    print(f"❌ Erreur: Import impossible depuis la racine du projet: {e}")
    sys.exit(1)

QUOTA_COLUMNS = [
    "quota_pitch",
    "quota_qa",
    "quota_mes",
    "quota_negotiation",
    "quota_regeneration",
    "quota_update",
]

async def run_migration():
    """Exécute la migration pour consolider les crédits."""
    print("🚀 Démarrage de la migration des crédits...")

    # [FIX] Initialiser manuellement la configuration de la base de données
    # car ce script s'exécute en dehors du cycle de vie de FastAPI.
    try:
        print("   - Configuration de l'URL de la base de données...")
        db_url = get_database_url()
        if not db_url:
            raise RuntimeError("L'URL de la base de données est vide. Vérifiez votre .env ou la configuration de Secret Manager.")
        db.database_url = db_url
        print("   - URL configurée.")
    except Exception as e:
        print(f"❌ ERREUR CRITIQUE lors de la configuration de la DB : {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    try:
        async with db.get_connection() as conn:
            # Étape 1: Vérifier quelles colonnes de quota existent réellement
            print("   - Vérification des colonnes de quotas existantes...")
            try:
                cursor = await db.execute(conn, "SELECT * FROM users LIMIT 1")
                existing_cols_raw = await cursor.fetchone()
                if not existing_cols_raw:
                    print("   - Table 'users' vide. Aucune migration de données nécessaire.")
                    return
                
                # `keys()` fonctionne pour les dictionnaires (psycopg) et les Row-like objects (sqlite)
                existing_cols = list(existing_cols_raw.keys())

            except Exception as e:
                print(f"   - ERREUR: Impossible de lire la table 'users'. La table existe-t-elle ? ({e})")
                return

            cols_to_migrate = [col for col in QUOTA_COLUMNS if col in existing_cols]

            if not cols_to_migrate:
                print("✅ Aucune colonne 'quota_*' à migrer. La base de données semble déjà à jour.")
                return

            print(f"   - Colonnes à migrer : {', '.join(cols_to_migrate)}")

            # Étape 2: Construire et exécuter la requête de consolidation
            coalesce_parts = [f"COALESCE({col}, 0)" for col in cols_to_migrate]
            sum_of_quotas = " + ".join(coalesce_parts)
            
            update_query = f"""
                UPDATE users
                SET credits = COALESCE(credits, 0) + ({sum_of_quotas});
            """
            
            print("   - Consolidation des quotas dans la colonne 'credits'...")
            await db.execute(conn, update_query)
            
            print("✅ Migration des données terminée avec succès !")
            print("-" * 50)
            print("Pensez à supprimer les anciennes colonnes de la table 'users'.")
            print("Exécutez les commandes SQL suivantes manuellement si vous le souhaitez :\n")
            
            for col in cols_to_migrate:
                print(f"ALTER TABLE users DROP COLUMN {col};")
            
            print("\n" + "-" * 50)

    except Exception as e:
        print(f"❌ ERREUR CRITIQUE lors de la migration : {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    # `db.get_connection()` est asynchrone, nous devons donc l'exécuter dans une boucle d'événements.
    asyncio.run(run_migration())
