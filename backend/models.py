from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field, field_validator
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

class CandidateProfile(BaseModel):
    # Personal Info
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    language: str = "en"

    # Location & Mobility
    residence_country: str = ""
    city: str = ""
    target_country: str = ""
    remote_preference: str = ""
    availability: str = ""

    # Professional Identity
    current_role: str = ""
    current_company: str = ""
    target_role_primary: str = ""
    contract_type: str = ""
    bio: str = ""
    
    # Skills & Traits
    skills: List[str] = [] # [COHÉRENCE] Toujours un tableau pour éviter les bugs downstream
    qualities: List[str] = []
    flaws: List[str] = []
    interests: List[str] = []

    # Lists
    experiences: List[Experience] = []
    educations: List[Education] = []
    successes: List[Achievement] = []
    failures: List[Failure] = []

    # Unstructured Data
    free_text: str = ""
    
    # Generated Content (Optional, for printing/export)
    questions_list: Optional[List[Dict[str, Any]]] = None

    @field_validator('skills', mode='before')
    @classmethod
    def parse_skills(cls, v):
        # Transforme silencieusement une chaîne brute en liste si l'IA ou le Frontend envoie du texte
        if isinstance(v, str):
            return [s.strip() for s in v.split(',') if s.strip()]
        return v if isinstance(v, list) else []

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

# --- Request Models ---
class GenerateRequest(BaseModel):
    action: str
    data: Dict[str, Any]
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
    fields: Dict[str, Any]

class CVSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    title: str
    enabled: bool = True
    items: List[CVItem]

class CVFinal(BaseModel):
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    current_role: Optional[str] = None
    sections: List[CVSection]