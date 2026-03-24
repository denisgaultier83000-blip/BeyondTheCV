import sys
import os

# Chemins absolus
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend_dir = os.path.join(project_root, 'backend')

# Ajoute 'backend' en premier pour que les imports internes (ex: 'from database import ...') fonctionnent
sys.path.insert(0, backend_dir)
# Ajoute la racine pour les imports qualifiés (ex: 'from backend.services import ...')
sys.path.insert(0, project_root)