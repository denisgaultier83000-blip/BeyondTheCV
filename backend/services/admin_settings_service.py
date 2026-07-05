
from fastapi import APIRouter, Depends
import os

from security import require_admin_user

router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)]
)

@router.get("/settings")
async def get_system_settings():
    """
    [NOUVEAU] Retourne la configuration système en lecture seule.
    Ces valeurs sont généralement lues depuis les variables d'environnement
    ou un fichier de configuration.
    """
    # Ces valeurs sont des exemples. Dans une vraie application, elles viendraient
    # d'un système de configuration plus robuste.
    settings = {
        "Modèle IA par défaut": os.getenv("DEFAULT_AI_MODEL", "Gemini"),
        "Version des prompts (Pitch)": "pitch_v1.3",
        "Version des prompts (Q/A)": "qa_v2.1",
        "Seuil d'alerte coûts": f"{os.getenv('COST_ALERT_THRESHOLD', '0.3')} (30% du prix)",
        "Mode Maintenance": os.getenv("MAINTENANCE_MODE", "Non"),
        "Email Support": os.getenv("SUPPORT_EMAIL", "support@beyondthecv.app"),
        "Langues disponibles": "FR, EN",
        "Délai expiration token (min)": os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"),
    }
    return {"settings": settings}
