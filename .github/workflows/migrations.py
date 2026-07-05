import os
import sys
from alembic.config import Config
from alembic import command

# --- ANALYSE DE L'EXPERT ---
# Le problème original est que ce script, lorsqu'il est exécuté,
# termine par un `sys.exit(0)`. Si une fonction de ce module est
# accidentellement importée et appelée par l'application web (FastAPI),
# cela provoque une exception `SystemExit` qui fait planter le worker.
#
# La correction consiste à encapsuler la logique d'exécution dans une fonction `main()`
# et à protéger l'appel à cette fonction avec `if __name__ == "__main__":`.
# Ainsi, le code ne s'exécutera que si le script est appelé directement
# depuis la ligne de commande (comme dans le Dockerfile ou le workflow CI/CD),
# et non lorsqu'il est importé.
# L'appel à `sys.exit()` est également supprimé pour permettre aux scripts
# appelants de gérer les codes de sortie.

def run_migrations():
    """Exécute les migrations Alembic."""
    print("--- Running Database Migrations ---")
    # Le chemin est relatif à l'endroit où le script est exécuté
    alembic_cfg = Config("alembic.ini")
    try:
        command.upgrade(alembic_cfg, "head")
        print("--- Migrations completed successfully. ---")
        return True
    except Exception as e:
        print(f"!!! An error occurred during migrations: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if not run_migrations():
        sys.exit(1) # On ne quitte avec un code d'erreur que si les migrations échouent