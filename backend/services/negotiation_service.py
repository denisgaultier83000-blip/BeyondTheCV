
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from services.cv_services import require_active_subscription 

# Placeholder for AI service
class AIService:
    async def generate_valid_json(self, prompt: str, provider: str = "openai", system_instruction: str = "") -> Dict[str, Any]:
        if "preparation" in prompt:
            return {
                "market_salary": {"min": 68000, "max": 75000},
                "company_budget_estimation": 72000,
                "target_salary": 70000,
                "minimum_acceptable": 66000,
                "walk_away_point": 64000,
                "top_arguments": [
                    "12 ans d'expérience dans le domaine",
                    "Management d'une équipe de 80 personnes",
                    "Expertise rare en cybersécurité",
                    "Certifications de haut niveau",
                    "Résultats chiffrés démontrant l'impact"
                ]
            }
        elif "tactical" in prompt:
            return {
                "recruiter_objections": [
                    "Votre salaire est trop élevé pour notre grille.",
                    "Nous avons une grille interne stricte.",
                    "Nous verrons après la période d'essai.",
                    "Nous privilégions le variable.",
                    "Vous n'avez pas encore fait vos preuves chez nous."
                ]
            }
        elif "briefing" in prompt:
            return {
                "negotiation_briefing": {
                    "opening_salary": 74000,
                    "target_agreement": 70000,
                    "walk_away_point": 66000,
                    "alternative_negotiation_points": [
                        "Négociation du variable (primes, bonus)",
                        "Deux jours de télétravail par semaine",
                        "Budget de formation personnalisé"
                    ]
                }
            }
        elif "scenario" in prompt:
            variation = prompt.split("VARIATION:")[1].strip()
            if variation == "difficult":
                return {
                    "budget": 62000,
                    "recruiter_prompt": "Franchement, vos prétentions à 70k€ sont totalement hors sol par rapport à nos budgets. Le marché regorge de profils similaires au vôtre pour bien moins cher. Notre offre maximale est de 62k€, à prendre ou à laisser. Qu'en dites-vous ?"
                }
            elif variation == "dg":
                return {
                    "budget": 75000,
                    "recruiter_prompt": "En tant que Directeur Général, je cherche un retour sur investissement immédiat. 70k€ c'est un budget important. Si je vous accorde ce salaire, comment allez-vous justifier ce coût par rapport aux résultats de l'entreprise d'ici 6 mois ?"
                }
            elif variation == "startup":
                return {
                    "budget": 58000,
                    "recruiter_prompt": "Nous adorons votre profil, mais en tant que startup en pleine croissance, nous devons faire attention à notre cash-flow. Notre budget maximum est de 58k€. En revanche, nous pouvons discuter d'BSPCE (stock-options) et d'un rôle clé dans l'aventure. Qu'en pensez-vous ?"
                }
            elif variation == "grand_groupe":
                return {
                    "budget": 66000,
                    "recruiter_prompt": "Votre profil correspond parfaitement, mais notre grille interne pour ce niveau de poste bloque à 66k€. Nous ne pouvons pas faire d'exception pour ne pas créer d'iniquité. Comment pouvons-nous avancer sur cette base ?"
                }
            else: # standard
                return {
                    "budget": 68000,
                    "recruiter_prompt": "Votre profil est très intéressant, mais vos prétentions salariales sont un peu au-dessus de notre grille. Notre budget maximum pour ce poste est de 68k€. Qu'en pensez-vous ?"
                }
        return {}

ai_service = AIService()

class NegotiationPreparation(BaseModel):
    market_salary: Dict[str, int]
    company_budget_estimation: int
    target_salary: int
    minimum_acceptable: int
    walk_away_point: int
    top_arguments: List[str]

class TacticalCards(BaseModel):
    recruiter_objections: List[str]

class NegotiationBriefing(BaseModel):
    negotiation_briefing: Dict[str, Any]

class NegotiationScenario(BaseModel):
    budget: int
    recruiter_prompt: str

class CandidateProfile(BaseModel):
    job_title: str
    experience_years: int
    skills: List[str]

class ScenarioRequest(BaseModel):
    candidate_profile: CandidateProfile
    variation: str

router = APIRouter()

class NegotiationService:
    async def get_preparation_data(self, candidate_profile: Dict[str, Any]) -> NegotiationPreparation:
        prompt = f"Generate negotiation preparation data for the following candidate profile: {json.dumps(candidate_profile)}"
        response = await ai_service.generate_valid_json(prompt, system_instruction="You are a career coach. Generate data for salary negotiation preparation in French.")
        return NegotiationPreparation(**response)

    async def get_tactical_cards(self, candidate_profile: Dict[str, Any]) -> TacticalCards:
        prompt = f"Generate tactical cards for salary negotiation for the following candidate profile: {json.dumps(candidate_profile)}"
        response = await ai_service.generate_valid_json(prompt, system_instruction="You are a career coach. Generate tactical cards for salary negotiation in French.")
        return TacticalCards(**response)

    async def get_personalized_briefing(self, candidate_profile: Dict[str, Any]) -> NegotiationBriefing:
        prompt = f"Generate a personalized negotiation briefing for the following candidate: {json.dumps(candidate_profile)}"
        response = await ai_service.generate_valid_json(prompt, system_instruction="You are a strategic career advisor. Generate a personalized negotiation briefing in French.")
        return NegotiationBriefing(**response)

    async def get_scenario(self, candidate_profile: Dict[str, Any], variation: str) -> NegotiationScenario:
        prompt = f"Generate a recruitment scenario for negotiation.\nCANDIDATE: {json.dumps(candidate_profile)}\nVARIATION: {variation}"
        response = await ai_service.generate_valid_json(prompt, system_instruction="You are a professional HR creating negotiation simulation scenarios in French.")
        return NegotiationScenario(**response)

negotiation_service = NegotiationService()

@router.post("/negotiation/preparation", response_model=NegotiationPreparation)
async def get_preparation(candidate_profile: CandidateProfile, current_user: dict = Depends(require_active_subscription)):
    try:
        return await negotiation_service.get_preparation_data(candidate_profile.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/negotiation/tactical-cards", response_model=TacticalCards)
async def get_tactical_cards(candidate_profile: CandidateProfile, current_user: dict = Depends(require_active_subscription)):
    try:
        return await negotiation_service.get_tactical_cards(candidate_profile.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/negotiation/briefing", response_model=NegotiationBriefing)
async def get_briefing(candidate_profile: CandidateProfile, current_user: dict = Depends(require_active_subscription)):
    try:
        return await negotiation_service.get_personalized_briefing(candidate_profile.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/negotiation/scenario", response_model=NegotiationScenario)
async def get_scenario(request: ScenarioRequest, current_user: dict = Depends(require_active_subscription)):
    try:
        return await negotiation_service.get_scenario(request.candidate_profile.dict(), request.variation)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
