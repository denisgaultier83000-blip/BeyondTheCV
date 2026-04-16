from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator
import uuid

class Experience(BaseModel):
    id: Union[int, str, float]
    role: str = ""
    company: str = ""
    start_date: str = ""
    end_date: str = ""

class Education(BaseModel):
    id: Union[int, str, float]
    degree: str = ""
    school: str = ""
    year: str = ""

class Achievement(BaseModel):
    id: Union[int, str, float]
    description: str = ""
    metric: str = ""

class Failure(BaseModel):
    id: Union[int, str, float]
    description: str = ""
    lesson: str = ""

# --- Auth Models ---
class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def email_to_lower_and_strip(cls, v: str) -> str:
        return v.lower().strip()

class UserRegister(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""

    @field_validator('email')
    @classmethod
    def email_to_lower_and_strip(cls, v: str) -> str:
        return v.lower().strip()

# --- CV Generator & AI Services Models ---

class ExperienceRequest(BaseModel):
    role: str = Field(..., description="Intitulé du poste")
    company: str = Field(..., description="Nom de l'entreprise")
    description: str = Field(..., description="Description brute des tâches effectuées")
    provider: Optional[str] = Field(None, description="Choix du modèle IA: 'openai' ou 'gemini'")
    target_language: Optional[str] = "fr"

class SummaryRequest(BaseModel):
    target_job: str
    skills: List[str]
    years_of_experience: int
    provider: Optional[str] = None
    target_language: Optional[str] = "fr"

class SkillExtractionRequest(BaseModel):
    raw_text: str
    provider: Optional[str] = None
    target_language: Optional[str] = "fr"

class SimulationRequest(BaseModel):
    candidate_data: Dict[str, Any]
    simulation_action: str
    provider: Optional[str] = None

class SituationSimulationRequest(BaseModel):
    scenario_id: str
    scenario_context: Dict[str, Any]
    candidate_profile: Dict[str, Any]
    user_answer: str

class PersonalInfo(BaseModel):
    first_name: Optional[str] = Field(None, description="Prénom du candidat")
    last_name: Optional[str] = Field(None, description="Nom de famille")
    email: Optional[str] = Field(None, description="Email professionnel", pattern=r"^(?:[^@\s]+@[^@\s]+\.[^@\s]+)?$")
    phone: Optional[str] = Field(None, description="Numéro de téléphone", pattern=r"^(?:\+?[0-9\s\-\(\).]{6,25})?$")
    address: Optional[str] = Field(None, description="Adresse postale (facultative)")
    city: Optional[str] = Field(None, description="Ville de résidence")
    country: Optional[str] = Field(None, description="Pays de résidence")
    linkedin: Optional[str] = Field(None, description="URL profil LinkedIn")
    bio: Optional[str] = Field(None, description="Résumé ou Bio")

class FullCVData(BaseModel):
    """Modèle représentant les données complètes du candidat collectées via le formulaire."""
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    experiences: Any = []
    educations: Any = []
    skills: Any = []
    work_style: Any = []
    relational_style: Any = []
    professional_approach: Any = []
    qualities: Any = []
    flaws: Any = []
    interests: Any = []
    languages: Any = []
    clarifications: Any = []
    target_job: Optional[str] = ""
    target_company: Optional[str] = None
    target_industry: Optional[str] = None
    job_description: Optional[str] = Field(None, description="Description brute de l'offre d'emploi")
    research_data: Optional[Dict[str, Any]] = Field(None, description="Données de recherche marché et entreprise")
    gap_analysis: Optional[Dict[str, Any]] = Field(None, description="Données en cache de l'analyse d'écarts")
    target_country: Optional[str] = Field(None, description="Pays visé pour l'analyse de marché")
    remote_preference: Optional[str] = Field(None, description="full, hybrid, onsite")
    availability: Optional[str] = Field(None, description="Disponibilité du candidat")
    contract_type: Optional[str] = Field(None, description="Type de contrat visé (CDI, Freelance...)")
    provider: Optional[str] = None
    target_language: Optional[str] = "French"
    is_partial_start: bool = False
    design_variant: Optional[str] = Field("1", description="Variante de design du CV (1, 2, 3)")
    preview: bool = Field(False, description="Mode prévisualisation")
    renderer: Optional[str] = Field("pdf", description="Format de sortie: 'pdf' ou 'json'")

# --- Request Models ---
class GenerateRequest(BaseModel):
    action: str = "CV"
    data: Dict[str, Any] = Field(default_factory=dict)
    renderer: str = "latex"
    preview: bool = False
    skip_ai: bool = False

class TextAnalysisRequest(BaseModel):
    text: str

class ResearchRequest(BaseModel):
    target_company: str
    target_industry: Optional[str] = None
    force_search: bool = False
    candidate_data: Dict[str, Any] = {}

class DisambiguationRequest(BaseModel):
    company_name: str

class FeedbackRequest(BaseModel):
    feature: str
    is_positive: bool = True
    comments: Optional[str] = None
    feedback: Optional[str] = ""
    reason: Optional[str] = ""
    job_type: Optional[str] = ""

class PaymentIntentRequest(BaseModel):
    amount: int
    currency: str = "usd"

class DocumentMetadata(BaseModel):
    id: str
    filename: str
    type: str
    created_at: str # datetime serialized

# --- CV Validation Models ---
class CVItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    enabled: bool = True
    fields: Dict[str, Any] = Field(default_factory=dict)

class CVSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    title: str
    enabled: bool = True
    items: List[CVItem] = Field(default_factory=list)

class CVFinal(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    linkedin: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    current_role: Optional[str] = None
    sections: List[CVSection] = Field(default_factory=list)