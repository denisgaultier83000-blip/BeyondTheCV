from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from schemas.admin import UserAdminView
from models.user import User # Supposant que vous avez un modèle User (ex: SQLAlchemy)
from security import get_current_active_admin_user # Une fonction de sécurité à créer

# --- ANALYSE DE L'EXPERT ---
# Ce routeur est le cœur de la fonctionnalité.
# Il est préfixé par `/admin` et tagué pour une documentation claire.
#
# La dépendance `get_current_active_admin_user` est le point de sécurité le plus
# important. Elle doit vérifier que l'utilisateur faisant la requête :
# 1.  Possède un token JWT valide.
# 2.  Est marqué comme `is_active = TRUE` dans la base de données.
# 3.  Est marqué comme `is_admin = TRUE` dans la base de données.
#
# Si l'une de ces conditions échoue, la fonction doit lever une exception
# HTTPException, empêchant l'exécution du code de la route.

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_active_admin_user)] # Sécurité appliquée à toutes les routes de ce fichier
)

@router.get("/users", response_model=List[UserAdminView])
async def list_users():
    """
    Récupère la liste de tous les utilisateurs pour le panneau d'administration.
    
    Cette route est protégée et accessible uniquement par les utilisateurs administrateurs.
    Elle retourne une liste d'utilisateurs formatée selon le schéma `UserAdminView`,
    excluant ainsi les données sensibles comme les mots de passe.
    """
    try:
        # Note : Ceci est un exemple avec un ORM comme SQLAlchemy.
        # Il faudrait l'adapter à votre méthode d'accès à la base de données.
        users = await User.all() # Exemple avec un ORM comme Tortoise-ORM ou GINO
        return users
    except Exception as e:
        # Log l'erreur pour le débogage
        print(f"Erreur lors de la récupération des utilisateurs admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur interne est survenue lors de la récupération des utilisateurs."
        )