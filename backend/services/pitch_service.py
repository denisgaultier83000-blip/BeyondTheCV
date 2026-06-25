from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
import json
from typing import Dict

# Import des modules utilitaires et du service IA
from .utils import load_prompt, clean_ai_json_response
from .ai_generator import ai_service

router = APIRouter()

class PitchRequest(BaseModel):
    """
    Modèle de données pour la requête de génération de pitch.
    """
    candidate_data: Dict = Field(..., description="L'objet JSON complet des données du candidat.")
    target_language: str = Field(default="fr", description="La langue cible pour la génération (ex: 'fr', 'en').")

@router.post(
    "/api/pitch",
    tags=["AI Generation"],
    summary="Générer une matrice de pitchs stratégiques",
    description="Génère plusieurs versions d'un pitch (pour recruteur, direction, etc.) en se basant sur le profil du candidat et le prompt 'strategic_pitch_v2.md'."
)
async def generate_strategic_pitch(request: PitchRequest):
    """
    Génère une matrice de pitchs stratégiques en utilisant le prompt `strategic_pitch_v2.md`.
    """
    try:
        # 1. Charger le template du prompt
        prompt_template = load_prompt("strategic_pitch_v2.md")
        if not prompt_template:
            raise HTTPException(status_code=500, detail="Le template de prompt 'strategic_pitch_v2.md' est manquant ou vide.")

        # 2. Injecter les données du candidat et la langue dans le prompt
        candidate_json_str = json.dumps(request.candidate_data, indent=2, ensure_ascii=False)
        final_prompt = prompt_template.replace("{{CANDIDATE_DATA_JSON}}", candidate_json_str)
        final_prompt = final_prompt.replace("{{TARGET_LANGUAGE}}", request.target_language)

        # 3. Appeler le service d'IA
        raw_response = await ai_service.generate(final_prompt, system_instruction="Tu es un coach de carrière expert en génération de pitchs stratégiques.")

        # 4. Nettoyer et valider la réponse JSON
        pitch_matrix = clean_ai_json_response(raw_response)
        
        return pitch_matrix
    except Exception as e:
        print(f"Erreur lors de la génération du pitch : {e}")
        raise HTTPException(status_code=500, detail=f"Une erreur interne est survenue lors de la génération du pitch : {str(e)}")