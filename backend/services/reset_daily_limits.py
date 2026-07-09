import os
import sys
from datetime import datetime

# Ajout du dossier parent au path pour trouver les modules du projet
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    # On utilise la configuration centralisée de la base de données
    from database import get_database_url
    import psycopg2
except ImportError:
    print("Erreur : Impossible d'importer les modules nécessaires. Assurez-vous d'exécuter ce script depuis le bon environnement.")
    sys.exit(1)

def reset_daily_generation_counts():
    """
    Se connecte à la base de données et réinitialise le compteur
    'daily_generations_count' de tous les utilisateurs à 0.
    """
    db_url = get_database_url()
    if not db_url:
        print(f"[{datetime.now()}] ERREUR: La variable DATABASE_URL n'est pas définie.")
        return

    conn = None
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print(f"[{datetime.now()}] Connexion à la base de données pour réinitialiser les limites quotidiennes...")
        
        # La commande SQL qui met à jour les utilisateurs
        cur.execute("UPDATE users SET daily_generations_count = 0 WHERE daily_generations_count > 0;")
        
        updated_rows = cur.rowcount
        conn.commit()
        
        print(f"[{datetime.now()}] SUCCÈS : Limite de génération réinitialisée pour {updated_rows} utilisateurs.")
        
    except Exception as e:
        print(f"[{datetime.now()}] ERREUR CRITIQUE : Échec de la réinitialisation des limites. Erreur : {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    reset_daily_generation_counts()