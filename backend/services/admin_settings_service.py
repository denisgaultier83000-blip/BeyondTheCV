
from fastapi import APIRouter, Depends
import os
from datetime import datetime, timezone

from security import require_admin_user

router = APIRouter(
    prefix="/admin",
    tags=["Administration"],
    dependencies=[Depends(require_admin_user)]
)


@router.get("/settings")
async def get_system_settings():
    """Retourne la configuration système au format attendu par le dashboard admin."""
    maintenance_raw = str(os.getenv("MAINTENANCE_MODE", "off")).strip().lower()
    maintenance_mode = maintenance_raw in {"1", "true", "on", "yes"}

    return {
        "environment": os.getenv("ENVIRONMENT", "staging"),
        "frontend_version": os.getenv("FRONTEND_VERSION", "dev"),
        "backend_version": os.getenv("BACKEND_VERSION", "dev"),
        "last_git_commit": os.getenv("GIT_COMMIT_SHA", "local-dev"),
        "last_deployment_at": os.getenv("LAST_DEPLOYMENT_AT", datetime.now(timezone.utc).isoformat()),
        "maintenance_mode": maintenance_mode,
        "active_offers": [
            {"name": "Starter", "price": "29€", "quotas": "Pitch + Q/A", "duration": "30 jours"},
            {"name": "Strategic", "price": "59€", "quotas": "Complet", "duration": "90 jours"}
        ],
        "ai_models_by_module": [
            {"module": "pitch", "model_name": os.getenv("DEFAULT_AI_MODEL", "Gemini")},
            {"module": "questions", "model_name": os.getenv("DEFAULT_AI_MODEL", "Gemini")},
            {"module": "scenarios", "model_name": os.getenv("DEFAULT_AI_MODEL", "Gemini")}
        ],
        "active_prompts": [
            {"module": "pitch", "prompt_version": "strategic_pitch_v4"},
            {"module": "questions", "prompt_version": "interview_questions"},
            {"module": "scenarios", "prompt_version": "custom_scenarios"}
        ],
        "ia_cost_alert_threshold": float(os.getenv("COST_ALERT_THRESHOLD", "0.3")) * 100
    }
