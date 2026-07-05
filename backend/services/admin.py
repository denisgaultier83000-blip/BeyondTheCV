from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List

from schemas.admin import PaginatedUsersResponse
from services.admin_service import admin_list_users
from security import get_current_active_admin_user

# --- ANALYSE DE L'EXPERT ---
# Ce routeur est le cœur de la fonctionnalité d'administration.
#
# 1.  **Sécurité d'Abord :** La dépendance `get_current_active_admin_user` est appliquée
#     à l'ensemble du routeur. Aucune route ici ne sera accessible sans être
#     un administrateur authentifié et actif.
#
# 2.  **Intégration du Service :** La route `list_users` ne contient aucune logique métier.
#     Elle délègue tout le travail à `admin_list_users` dans la couche de service.
#     C'est une bonne pratique qui sépare les responsabilités (routing vs. business logic).
#
# 3.  **Pagination Robuste :** Les paramètres `limit` et `offset` sont gérés avec
#     des valeurs par défaut et des contraintes de validation (Query), ce qui
#     prévient les abus et garantit des requêtes saines.
#
# 4.  **Contrat de Données :** Le `response_model=PaginatedUsersResponse` garantit que la
#     sortie de l'API sera toujours conforme à la structure attendue par le frontend,
#     évitant les erreurs d'incohérence des données.

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_active_admin_user)]
)

@router.get("/users", response_model=PaginatedUsersResponse)
async def list_users(
    limit: int = Query(50, ge=1, le=200), 
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, description="Recherche par email, nom ou prénom"),
    status: str | None = Query(None, description="Filtre par statut d'abonnement (active, expired, etc.)"),
    offer: str | None = Query(None, description="Filtre par type d'offre (plan_id)")
):
    """
    Récupère une liste paginée des utilisateurs pour le panneau d'administration.
    Accessible uniquement par les administrateurs.
    """
    # Délègue la logique de récupération et de comptage au service dédié.
    # [MISE À JOUR] On passe les nouveaux filtres au service.
    user_data = await admin_list_users(limit=limit, offset=offset, search=search, status=status, offer=offer)
    return user_data