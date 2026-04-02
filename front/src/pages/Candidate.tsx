import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import DiagnosticDashboard from "../components/DiagnosticDashboard";
import { API_BASE_URL } from "../config";
import Questionnaire from "../components/Questionnaire";
import PitchEditor from "../components/PitchEditor";
import PitchMissingInfo from "../components/PitchMissingInfo";
import Toast from "../components/Toast";
import DebugModal from "../components/DebugModal";
import ResearchModal from "../components/ResearchModal";
import GapAnalysisModal from "../components/GapAnalysisModal";
import DocumentsModal from "../components/DocumentsModal";
import SalaryModal from "../components/SalaryModal";
import { CareerRadar } from "../components/CareerRadar";
import Gauge from "../components/Gauge";
import { JobDecoder } from "../components/JobDecoder";
import { HiddenMarket } from "../components/HiddenMarket";
import { RecruiterView } from "../components/RecruiterView"; // [NEW] Import
import { CareerGPS } from "../components/CareerGPS"; // [NEW] Import
import { CareerSimulator } from "../components/CareerSimulator"; // [NEW] Import
import { CareerRealityCheck } from "../components/CareerRealityCheck"; // [NEW] Import
import { CompanyAnalysisCard } from "../components/CompanyAnalysisCard";
import { MarketAnalysisCard } from "../components/MarketAnalysisCard";
import FlawCoaching from "../components/FlawCoaching";
import { Search, Plus, Building } from "lucide-react";
import {
  StepProfile,
  StepTarget,
  StepEducation,
  StepExperience,
  StepQualitiesFlaws,
  StepFreeText,
  StepClarification,
  StepReview,
} from "../components/CandidateSteps";
import { useAiActions } from "../hooks/useAiActions";
import { isAuthenticated, authenticatedFetch, getUser } from "../utils/auth";
import AuthScreen from "../components/AuthScreen";
import { useTranslation } from "react-i18next"; // [NEW] Remplacer l'import statique
import { LoadingScreen } from "../components/LoadingScreen";

interface CandidateProps {
  globalLang?: string; // Langue de l'interface (ex: "FR", "EN")
}

export default function Candidate({ globalLang }: CandidateProps = {}): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [showPitch, setShowPitch] = useState(false);
  const [showFlawCoaching, setShowFlawCoaching] = useState(false);
  const [flawCoachingResult, setFlawCoachingResult] = useState<any>(null);
  const [pitchData, setPitchData] = useState<any>(null);
  const [clarifications, setClarifications] = useState<any[]>([]);
  const [showPitchMissingInfo, setShowPitchMissingInfo] = useState(false);
  const [missingPitchFields, setMissingPitchFields] = useState<string[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [activeResearch, setActiveResearch] = useState<string | null>(null);
  const [researchData, setResearchData] = useState<any>(null);
  const [isResearching, setIsResearching] = useState(false); // [FIX] État de chargement local pour la recherche
  const [showResearchOverlay, setShowResearchOverlay] = useState(false); // [NEW] État pour l'overlay bloquant
  const isMounted = useRef(true); // [FIX] Sécurité pour éviter les updates sur composant démonté
  const [researchModalMode, setResearchModalMode] = useState<'company' | 'market'>('company');
  
  const [view, setView] = useState<'stepper' | 'dashboard' | 'review'>((location.state as any)?.view || 'stepper');
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null); // [NEW] State Validation
  const [radarResult, setRadarResult] = useState<any>(null); // [NEW] State pour le Radar
  const [decoderResult, setDecoderResult] = useState<any>(null); // [NEW] State pour Job Decoder
  const [hiddenMarketResult, setHiddenMarketResult] = useState<any>(null); // [NEW] State pour Hidden Market
  const [recruiterResult, setRecruiterResult] = useState<any>(null); // [NEW] State pour Recruiter View
  const [gpsResult, setGpsResult] = useState<any>(null); // [NEW] State pour Career GPS
  const [realityResult, setRealityResult] = useState<any>(null); // [NEW] State pour Reality Check
  const [showGapAnalysisModal, setShowGapAnalysisModal] = useState(false);
  const [cvMode, setCvMode] = useState<"ATS" | "Human" | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isAnalyzingCompleteness, setIsAnalyzingCompleteness] = useState(false);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(""); // Pour uniformiser les messages d'attente
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);
  const [completenessTaskId, setCompletenessTaskId] = useState<string | null>(null);
  
  const [premiumLoading, setPremiumLoading] = useState({
    radar: false,
    decoder: false,
    hiddenMarket: false,
    recruiter: false,
    gps: false,
    reality: false,
    research: false
  });

  // [NEW] État pour gérer les erreurs individuelles des cartes premium
  const [premiumErrors, setPremiumErrors] = useState({
    radar: false,
    decoder: false,
    hiddenMarket: false,
    recruiter: false,
    gps: false,
    reality: false,
    research: false
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // [NEW] Définition dynamique des étapes en fonction de la langue
  const { t, i18n } = useTranslation();
  const langCode = i18n.language;

  const STEPS = [
    { id: 1, title: t('profile') },
    { id: 2, title: t('target') },
    { id: 3, title: t('education') },
    { id: 4, title: t('experience') },
    { id: 5, title: t('qualities') },
    { id: 6, title: t('free_text') },
    { id: 7, title: t('clarification') }
  ];

  // Global form state
  const [form, setForm] = useState<any>({
    language: i18n.language || "fr",
    target_language: i18n.language || "fr",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    linkedin: "",
    residence_country: "",
    city: "",
    current_role: "",
    current_company: "",
    target_role_primary: "",
    contract_type: "",
    target_country: "",
    job_description: "",
    target_company: "",
    target_industry: "",
    birth_date: "",
    birth_place: "",
    family_situation: "",
    remote_preference: "",
    bio: "",
    qualities: [] as string[],
    work_style: [] as string[],
    relational_style: [] as string[],
    professional_approach: [] as string[],
    flaws: [] as string[],
    interests: [] as string[],
    skills: "",
    free_text: "",
    photo: "",
  });

  // Dynamic fields state (Experiences)
  const [experiences, setExperiences] = useState([
    { id: 1, role: "", company: "", start_date: "", end_date: "", description: "" },
  ]);
  const [educations, setEducations] = useState([
    { id: 1, degree: "", school: "", year: "" },
  ]);

  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // --- UTILISATION DU HOOK PERSONNALISÉ ---
  const { 
    loading, progress, currentAction, cvAnalysis, 
    handleAction, handleFinalGeneration, handlePreview 
  } = useAiActions({
    form, experiences, educations,
    cvMode, setCvMode, setView, setToast,
    setQuestionsList, setShowQuestionnaire,
    setPitchData, setShowPitch, setMissingPitchFields, setShowPitchMissingInfo,
    setResearchData, setActiveResearch, researchData,
    setGapAnalysis, setShowGapAnalysisModal,
    setSalaryData, setShowSalaryModal
  } as any); // [FIX] Cast to any to bypass strict type checking for missing properties

  // [FIX] Ref pour accéder à l'état courant du formulaire dans les closures asynchrones
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // [NEW] Fonction pour charger les données du dashboard de diagnostic
  const fetchDiagnosticSummary = async () => {
    if (isLoadingDiagnostic) return;
    
    // [VALIDATION] Pas d'analyse si pas de poste visé
    if (!form.target_role_primary) {
        console.warn("Diagnostic skipped: No target role defined.");
        return;
    }

    setIsLoadingDiagnostic(true);
    setToast({ type: "info", message: "Génération de votre rapport de carrière..." });
    try {
      const payload = formatPayload(form);
      console.log("[Dashboard] Sending payload for summary:", payload); // DEBUG LOG
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch diagnostic summary");
      }
      const summaryData = await response.json();
      setDiagnosticData(summaryData);
      setToast({ type: "success", message: "Rapport de carrière prêt !" });
    } catch (e: any) {
      console.error("Failed to fetch diagnostic summary", e);
      setToast({ type: "error", message: e.message || "Could not generate career report." });
      // En cas d'erreur, on affiche quand même un dashboard vide pour ne pas bloquer l'utilisateur
      // [FIX] On injecte un objet factice pour débloquer le LoadingScreen
      setDiagnosticData({ error: true, matchScore: 0, analysis_stats: { skills_detected: 0, requirements_analyzed: 0, gaps_identified: 0 } });
      setView('dashboard'); 
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  // [FIX] Helper pour structurer les données selon le modèle FullCVData du backend
  const formatPayload = (formData: any) => {
    // Conversion robuste des skills en tableau
    const skillsArray = typeof formData.skills === 'string'
        ? formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : (Array.isArray(formData.skills) ? formData.skills : []);

    // Helper pour traiter les champs optionnels vides (évite erreur regex Pydantic sur email/phone)
    const optionalString = (val: any) => (val && typeof val === 'string' && val.trim() !== "") ? val : null;

    // Construction explicite du payload pour correspondre au modèle Pydantic FullCVData
    return {
        personal_info: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: optionalString(formData.email),
            phone: optionalString(formData.phone),
            linkedin: optionalString(formData.linkedin),
            city: formData.city,
            country: formData.residence_country,
            birth_date: formData.birth_date,
            photo: optionalString(formData.photo),
            bio: formData.bio,
            address: "" // Champ requis par le modèle mais souvent vide
        },
        experiences: experiences,
        educations: educations,
        skills: skillsArray,
        work_style: formData.work_style || [],
        relational_style: formData.relational_style || [],
        professional_approach: formData.professional_approach || [],
        qualities: formData.qualities || [],
        flaws: formData.flaws || [],
        interests: formData.interests || [],
        languages: Array.isArray(formData.languages) 
            ? formData.languages.map((l: any) => typeof l === 'string' ? { language: l, level: '' } : l)
            : [],
        clarifications: clarifications,
        gap_analysis: gapAnalysis, // [FIX] Transmission du cache pour éviter le recalcul du score
        target_job: formData.target_role_primary, // [FIX] Mapping du nom de champ
        target_company: formData.target_company,
        job_description: formData.job_description, // [FIX] Transmission de l'offre d'emploi
        research_data: researchData || (isResearching ? { status: "pending" } : null), // [CRITIQUE] Empêche le backend d'écraser la tâche en cours
        target_industry: formData.target_industry,
        target_country: formData.target_country,
        remote_preference: formData.remote_preference,
        contract_type: formData.contract_type,
        provider: "gemini", // ou une valeur dynamique
        target_language: formData.target_language || 'fr',
        // Les champs suivants sont pour la génération, pas forcément pour le summary
        is_partial_start: false,
        design_variant: "1",
        preview: false,
        renderer: "pdf"
    };
  };

  // Wrapper pour le debug qui n'est pas dans le hook
  const handleActionWrapper = async (action: string) => {
      console.log("[Candidate] Action triggered:", action);
      if (action === "Debug") {
          setDebugData({ ...form, experiences, educations });
          setShowDebug(true);
      } else if (action === "Review CV") {
          // [FIX] Bascule vers la vue de revue pour voir l'aperçu et les templates
          setCvMode("Human"); // Par défaut
          setView('review');
      } else if (action === "Company Research" || action === "Market Research") { // [FIX] Câblage du bouton Market
          await handleDashboardResearch();
      } else if (action === "View Company Report") {
          setResearchModalMode('company');
          setShowResearchModal(true);
      } else if (action === "View Market Report") {
          setResearchModalMode('market');
          setShowResearchModal(true);
      } else if (action === "View Salary") {
          setShowSalaryModal(true);
      } else if (action === "View Gap Analysis") {
          if (gapAnalysis) {
              setShowGapAnalysisModal(true);
          } else {
              handleActionWrapper("Gap Analysis");
          }
      } else if (action === "Pitch") {
          // [FIX] Utilise les données asynchrones pré-calculées si elles existent
          if (pitchData && pitchData.accroche) {
              setShowPitch(true);
              return;
          }
          setShowResearchOverlay(true);
          setLoadingMessage(`Génération de votre Pitch...`);
          try {
              await handleAction(action);
          } catch (e: any) {
              console.error(`Action ${action} failed:`, e);
              setToast({ type: "error", message: e.message || `${action} generation failed.` });
          } finally {
              if (isMounted.current) {
                  setShowResearchOverlay(false);
                  setLoadingMessage("");
              }
          }
      } else if (action === "Flaw Coaching") {
          if (flawCoachingResult) {
              setShowFlawCoaching(true);
          } else {
              setToast({ type: 'info', message: 'Analyse des défauts en cours, veuillez patienter...' });
          }
      } else if (action === "Questionnaire") {
          // [FIX] Utilise les données asynchrones pré-calculées si elles existent
          if (questionsList && questionsList.length > 0) {
              setShowQuestionnaire(true);
              return;
          }
          setShowResearchOverlay(true);
          setLoadingMessage(`Génération de votre Questionnaire...`);
          try {
              // On délègue l'appel API et la gestion du résultat au hook
              await handleAction(action);
          } catch (e: any) {
              console.error(`Action ${action} failed:`, e);
              setToast({ type: "error", message: e.message || `${action} generation failed.` });
          } finally {
              // L'overlay est masqué, que l'action réussisse ou échoue
              if (isMounted.current) {
                  setShowResearchOverlay(false);
                  setLoadingMessage("");
              }
          }
      } else if (action === "Gap Analysis") {
          // [FIX] Gestion manuelle pour afficher l'overlay et mapper les données correctement
          if (gapAnalysis) {
              setShowGapAnalysisModal(true);
              return;
          }
          
          setToast({ type: "success", message: "Starting Gap Analysis..." });
          setIsResearching(true);
          setShowResearchOverlay(true);
          setLoadingMessage("Analyse des écarts de compétences en cours...");

          try {
              const payload = { ...form, experiences, educations };
              const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                      action: "Gap Analysis", 
                      data: { ...payload, target_job: form.target_role_primary } // [CRITIQUE] Mapping explicite
                  }),
              });

              if (!response.ok) throw new Error("Gap Analysis failed");
              
              const result = await response.json();
              setGapAnalysis(result);
              setShowGapAnalysisModal(true);
          } catch (e: any) {
              console.error(e);
              setToast({ type: "error", message: e.message });
          } finally {
              if (isMounted.current) {
                  setIsResearching(false);
                  setShowResearchOverlay(false);
                  setLoadingMessage("");
              }
          }
      } else {
          await handleAction(action);
      }
  };

  // Check Auth on Mount
  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  // [FIX] Gestion du cycle de vie pour les tâches asynchrones
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // [NEW] Déclencheur pour le chargement du dashboard de diagnostic
  useEffect(() => {
    // On charge les données uniquement si on passe à la vue dashboard et qu'elles ne sont pas déjà là.
    if (view === 'dashboard' && !diagnosticData && !isLoadingDiagnostic) {
      fetchDiagnosticSummary();
    }
  }, [view]);

  // Auto-save to LocalStorage
  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = getUser();
      if (!currentUser) return;

      let profileLoadedFromDB = false;

      // --- 1. Priorité : Toujours tenter de charger depuis la base de données pour tous les utilisateurs ---
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/me/profile?email=${currentUser.email}`);
        if (response.ok) {
          const parsed = await response.json();
          
          // Vérifie si le profil retourné contient des données significatives
          if (parsed && parsed.form && parsed.form.first_name) {
            if (parsed.form?.target_language) i18n.changeLanguage(parsed.form.target_language.toLowerCase());
            
            if (parsed.form) setForm((prev: any) => ({ ...prev, ...parsed.form }));
            if (parsed.experiences && parsed.experiences.length > 0) setExperiences(parsed.experiences);
            if (parsed.educations && parsed.educations.length > 0) setEducations(parsed.educations);
            
            if (parsed.researchData) setResearchData(parsed.researchData);
            if (parsed.salaryData) setSalaryData(parsed.salaryData);
            if (parsed.pitchData) setPitchData(parsed.pitchData);
            if (parsed.gapAnalysis) setGapAnalysis(parsed.gapAnalysis);
            if (parsed.questionsList) setQuestionsList(parsed.questionsList);
            if (parsed.radarResult) setRadarResult(parsed.radarResult);
            if (parsed.decoderResult) setDecoderResult(parsed.decoderResult);
            if (parsed.hiddenMarketResult) setHiddenMarketResult(parsed.hiddenMarketResult);
            if (parsed.recruiterResult) setRecruiterResult(parsed.recruiterResult);
            if (parsed.gpsResult) setGpsResult(parsed.gpsResult);
            if (parsed.realityResult) setRealityResult(parsed.realityResult);
            if (parsed.flawCoachingResult) setFlawCoachingResult(parsed.flawCoachingResult);

            setToast({ type: "success", message: `Profil de ${currentUser.email} chargé depuis la base de données.` });
            profileLoadedFromDB = true;
          }
        }
      } catch (e) {
        console.warn("API profile fetch failed, will try localStorage.", e);
      }

      // --- 2. Fallback : Si le profil n'a pas été chargé depuis la DB, on tente le localStorage ---
      if (profileLoadedFromDB) {
        return; // On s'arrête ici, la DB est la source de vérité
      }

      const storageKey = `candidateForm_${currentUser.email}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.form?.target_language) i18n.changeLanguage(parsed.form.target_language.toLowerCase());
          if (parsed.form) setForm((prev: any) => ({ ...prev, ...parsed.form }));
          if (parsed.experiences && parsed.experiences.length > 0) setExperiences(parsed.experiences);
          if (parsed.educations && parsed.educations.length > 0) setEducations(parsed.educations);
          if (parsed.researchData) setResearchData(parsed.researchData);
          if (parsed.salaryData) setSalaryData(parsed.salaryData);
          if (parsed.pitchData) setPitchData(parsed.pitchData);
          if (parsed.gapAnalysis) setGapAnalysis(parsed.gapAnalysis);
          if (parsed.questionsList) setQuestionsList(parsed.questionsList);
          if (parsed.radarResult) setRadarResult(parsed.radarResult);
          if (parsed.decoderResult) setDecoderResult(parsed.decoderResult);
          if (parsed.hiddenMarketResult) setHiddenMarketResult(parsed.hiddenMarketResult);
          if (parsed.recruiterResult) setRecruiterResult(parsed.recruiterResult);
          if (parsed.gpsResult) setGpsResult(parsed.gpsResult);
          if (parsed.realityResult) setRealityResult(parsed.realityResult);
          if (parsed.flawCoachingResult) setFlawCoachingResult(parsed.flawCoachingResult);
          
          setToast({ type: "info", message: `Session locale restaurée pour ${currentUser.email}` });
        } catch (e) {
          console.error("Failed to load saved form from localStorage", e);
        }
      }
    }

    if (isLoggedIn) {
      loadProfile();
    }
  }, [isLoggedIn, i18n]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) return;
    const dataToSave = {
      form, experiences, educations, researchData, salaryData, pitchData, gapAnalysis, questionsList, radarResult, decoderResult, hiddenMarketResult, recruiterResult, gpsResult, realityResult, flawCoachingResult
    };
    localStorage.setItem(`candidateForm_${currentUser.email}`, JSON.stringify(dataToSave));
  }, [form, experiences, educations, researchData, salaryData, pitchData, gapAnalysis, questionsList, radarResult, decoderResult, hiddenMarketResult, recruiterResult, gpsResult, realityResult, flawCoachingResult]);

  // [NOUVEAU] Sauvegarde silencieuse en Base de données (Fire-and-Forget)
  const saveProgressToDB = async () => {
    const currentUser = getUser();
    if (!currentUser) return;
    
    const dataToSave = {
      form, experiences, educations, researchData, salaryData, pitchData, gapAnalysis, questionsList, radarResult, decoderResult, hiddenMarketResult, recruiterResult, gpsResult, realityResult, flawCoachingResult
    };

    try {
      // Exécution asynchrone non bloquante
      authenticatedFetch(`${API_BASE_URL}/api/cv/me/profile?email=${currentUser.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave)
      });
    } catch (e) {
      console.warn("Silent background save to DB failed", e);
    }
  };

  // Synchronisation de la langue globale vers le formulaire
  useEffect(() => {
    if (globalLang) {
      handleLanguageChange(globalLang);
    }
  }, [globalLang]);

  // Gestionnaire de changement de langue
  const handleLanguageChange = (lang: string) => {
      i18n.changeLanguage(lang);
      setForm((f: any) => ({ ...f, language: lang, target_language: lang }));
  };

  // Helper to manage dynamic lists
  const updateList = (
    list: any[],
    setList: any,
    id: number,
    field: string,
    value: any
  ) => {
    setList(
      list.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  const addToList = (list: any[], setList: any, template: any) => {
    setList([...list, { ...template, id: Date.now() }]);
  };
  const removeFromList = (list: any[], setList: any, id: number) => {
    if (list.length > 1) setList(list.filter((item: any) => item.id !== id));
  };

  function change(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
    
    // [FIX] Invalidation complète : Entreprise OU Secteur
    if (key === 'target_company' || key === 'target_industry') {
        setResearchData(null);
    }

    // [UX] Clear error when user types
    if (errors[key]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[key];
            return newErrors;
        });
    }
  }

  // [HELPER] Logique de polling robuste (202 = Wait, 200 = OK, 500 = Error)
  const pollTaskResult = async (tid: string, retries = 20): Promise<any> => {
    try {
        // [FIX] Utilisation de la route sécurisée définie dans cv_generator.py
        const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/analysis-status/${tid}`);
        
        if (res.status === 200) {
            const data = await res.json();
            // La route /analysis-status renvoie { status: "...", result: ... }
            if (data.status === "SUCCESS" || data.status === "COMPLETED") {
                // On renvoie directement le contenu du résultat pour compatibilité avec le reste de l'app
                return data.result;
            } else if (data.status === "FAILED") {
                 throw new Error("Task failed during processing.");
            }
            // Si PENDING ou autre, on continue d'attendre
            await new Promise(resolve => setTimeout(resolve, 2000));
            return pollTaskResult(tid, retries - 1);
            
        } else if (res.status === 500) {
            const err = await res.json();
            throw new Error(err.error || "Task failed on server.");
        } else if (res.status === 404) {
            // Si le serveur a redémarré, la tâche en mémoire est perdue
            throw new Error("Task lost (Server restarted). Please try again.");
        }
        // Pour tout autre statut (ex: 202 si géré par un load balancer), on attend
        await new Promise(resolve => setTimeout(resolve, 3000));
        return pollTaskResult(tid, retries - 1);
    } catch (e: any) {
        // Gestion des erreurs réseau (Server down/restart)
        // Si c'est une erreur de fetch (réseau) et qu'il reste des essais
        const isNetworkError = e.message === "Failed to fetch" || e.name === "TypeError" || e.message?.includes("Network");
        if (retries > 0 && isNetworkError) {
            console.warn(`[Polling] Network error, retrying in 3s... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return pollTaskResult(tid, retries - 1);
        }
        throw e;
    }
  };

  // [HELPER] Wrapper pour fetch avec retry sur erreur réseau (pour le démarrage des tâches)
  const fetchWithRetry = async (url: string, options: any, retries = 10, delay = 3000): Promise<Response> => {
      try {
          return await authenticatedFetch(url, options);
      } catch (e: any) {
          const isNetworkError = e.message === "Failed to fetch" || e.name === "TypeError" || e.message?.includes("Network") || e.message?.includes("Preflight");
          if (retries > 0 && isNetworkError) {
              // Feedback utilisateur si la connexion traîne (ex: redémarrage serveur)
              if (retries === 10 || retries === 5) {
                  setToast({ type: "info", message: "Server restarting/busy. Reconnecting..." });
              }
              console.warn(`[Fetch] Network error on ${url}, retrying in ${delay}ms... (${retries} left)`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchWithRetry(url, options, retries - 1, delay);
          }
          throw e;
      }
  };

  const launchBackgroundResearch = async () => {
    const payload = formatPayload(form); // [FIX] Utilisation du formatteur
    if (!payload.target_company && !payload.target_industry) return;

    // [FIX] Éviter la double exécution
    if (isResearching) return;

    // Capture de l'entreprise au moment du lancement
    const initiatedCompany = payload.target_company;

    console.log("[Background] Launching research tasks...");
    const researchType = payload.target_company ? "Company & Market" : "Market/Industry";
    setToast({ type: 'success', message: `Starting ${researchType} research...` });
    setIsResearching(true);
    // [MODIF] On ne définit PAS de message de chargement bloquant ici
    // setLoadingMessage(`Analyse de ${researchType} en cours...`);

    try {
        console.log("[Background] 1. Starting research task...");
        // [FIX] Correction de l'endpoint : utilisation de start-analysis avec flag partiel
        const startRes = await fetchWithRetry(`${API_BASE_URL}/api/cv/start-analysis`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                target_job: form.target_role_primary,
                is_partial_start: true
            }),
        });

        console.log("[Background] 1.1. Start response status:", startRes.status);
        if (!startRes.ok) {
            const errorText = await startRes.text();
            console.error("[Background] Failed to start task:", errorText);
            throw new Error("Failed to start research task");
        }
        
        // [FIX] Récupération robuste des IDs (Recherche + Salaire)
        const resJson = await startRes.json();
        const researchTaskId = resJson.task_id || resJson.tasks?.market_research; // [CRITIQUE] Clé exacte backend
        const salaryTaskId = resJson.salary_task_id || resJson.tasks?.salary_estimation; // [CRITIQUE] Clé exacte backend

        console.log(`[Background] Tasks started. Research: ${researchTaskId}, Salary: ${salaryTaskId}`);

        console.log("[Background] 2. Polling for task completion...");
        
        // Exécution en parallèle pour ne pas bloquer l'un par l'autre
        const promises = [];
        // [FIX] Vérification isMounted avant update
        if (researchTaskId) promises.push(pollTaskResult(researchTaskId).then(d => isMounted.current && setResearchData(d)));
        if (salaryTaskId) promises.push(pollTaskResult(salaryTaskId).then(d => isMounted.current && setSalaryData(d)));

        await Promise.all(promises);

        if (isMounted.current) {
            // [FIX] Vérification de cohérence : Si l'utilisateur a changé l'entreprise entre temps, on ignore
            if (formRef.current.target_company !== initiatedCompany) {
                console.warn("[Background] Result ignored: Target company changed during analysis.");
                setToast({ type: "info", message: "Analysis finished but ignored (Company changed)." });
                return;
            }

            console.log("[Background] 3. All tasks complete.");
            setToast({ 
                type: "success", 
                message: salaryTaskId ? `${researchType} & Salary analysis complete!` : `${researchType} complete!` 
            });
        }
    } catch (e: any) {
        if (isMounted.current) {
            console.error("[Background] Research sequence failed", e);
            setToast({ type: "error", message: e.message || "Background research failed." });
        }
    } finally {
        if (isMounted.current) {
            setIsResearching(false);
        }
    }
  };

  // [NEW] Gestionnaire spécifique pour le bouton du Dashboard
  const handleDashboardResearch = async () => {
    const payload = formatPayload(form); // [FIX] Utilisation du formatteur
    // Capture de l'entreprise au lancement pour vérification ultérieure
    const initiatedCompany = payload.target_company;

    if (!payload.target_company && !payload.target_industry) {
        setToast({ type: "error", message: "Please define a Target Company or Industry first." });
        return;
    }

    if (isResearching) {
        setToast({ type: "info", message: "Analysis already in progress..." });
        return;
    }

    setToast({ type: "success", message: "Launching deep company analysis..." });
    setIsResearching(true);
    setShowResearchOverlay(true); // [NEW] On active l'overlay bloquant car c'est une action utilisateur
    setLoadingMessage("Analyse approfondie de l'entreprise en cours..."); // Message pour l'overlay

    try {
        // [FIX] Correction endpoint
        const startRes = await fetchWithRetry(`${API_BASE_URL}/api/cv/start-analysis`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...payload,
                target_job: form.target_role_primary,
                is_partial_start: true
            }),
        });

        if (!startRes.ok) throw new Error("Failed to start analysis");
        
        // [FIX] Même logique pour le Dashboard : on récupère tout
        const resJson = await startRes.json();
        const researchTaskId = resJson.task_id || resJson.tasks?.market_research;
        const salaryTaskId = resJson.salary_task_id || resJson.tasks?.salary_estimation;

        // Polling parallèle
        const [researchResult, salaryResult] = await Promise.all([
            researchTaskId ? pollTaskResult(researchTaskId) : Promise.resolve(null),
            salaryTaskId ? pollTaskResult(salaryTaskId) : Promise.resolve(null)
        ]);
        
        // Mise à jour du state pour la forme
        if (isMounted.current) {
            // [FIX] Vérification de cohérence : Si l'entreprise a changé pendant le chargement dashboard
            if (formRef.current.target_company !== initiatedCompany) {
                console.warn("[Dashboard] Result ignored: Target company changed during analysis.");
                setToast({ type: "info", message: "Analysis finished but ignored (Company changed)." });
                return;
            }

            if (researchResult) setResearchData(researchResult);
            if (salaryResult) setSalaryData(salaryResult);
            
            // [FIX] Affichage direct du résultat dans la modale (évite la redirection cassée)
            // On n'ouvre pas automatiquement la modale ici pour laisser l'utilisateur choisir ce qu'il veut voir
            // if (researchResult) setShowResearchModal(true);
        }

        // [CRITIQUE] Sauvegarde MANUELLE et SYNCHRONE dans le localStorage.
        // On ne peut pas compter sur le useEffect ici car le navigate() démonte le composant
        // avant que le useEffect ne se déclenche, causant la perte des données au retour.
        const currentSaved = localStorage.getItem("candidateForm");
        if (currentSaved) {
            const parsed = JSON.parse(currentSaved);
            if (researchResult) parsed.researchData = researchResult;
            if (salaryResult) parsed.salaryData = salaryResult;
            localStorage.setItem("candidateForm", JSON.stringify(parsed));
        }

        // [FIX] Suppression de la navigation qui renvoyait vers l'accueil si la route n'existait pas
        // navigate('/research-report', { state: { report: researchResult, salary: salaryResult } });

    } catch (e: any) {
        console.error(e);
        setToast({ type: "error", message: e.message || "Analysis failed." });
    } finally {
        if (isMounted.current) {
            setIsResearching(false);
            setShowResearchOverlay(false); // [NEW] On désactive l'overlay
            setLoadingMessage("");
        }
    }
  };

  // [NEW] Polling pour les tâches du Dashboard (Pitch, Gap, Salary, Questions)
  // Lancé après handleFinish()
  const pollDashboardTasks = async (tasks: any) => {
      // Init loading states
      setPremiumLoading({
          radar: !!tasks.career_radar,
          decoder: !!tasks.job_decoder,
          hiddenMarket: !!tasks.hidden_market,
          recruiter: !!tasks.recruiter_view,
          gps: !!tasks.career_gps,
          reality: !!tasks.reality_check,
          research: !!tasks.market_research
      });
      
      // Reset errors
      setPremiumErrors({
          radar: false,
          decoder: false,
          hiddenMarket: false,
          recruiter: false,
          gps: false,
          reality: false,
          research: false
      });

      const poll = async (taskId: string, setter: (data: any) => void, loadingKey?: string, label?: string) => {
          if (!taskId) return;
          try {
              const res = await pollTaskResult(taskId);
              if (isMounted.current && res) {
                  setter(res);
                  if (loadingKey) setPremiumLoading(prev => ({ ...prev, [loadingKey]: false }));
                  if (label) setToast({ type: "success", message: `✅ ${label} prêt !` });
              }
          } catch (e) {
              console.warn(`Task ${taskId} failed or pending:`, e);
              if (isMounted.current && loadingKey) {
                  setPremiumLoading(prev => ({ ...prev, [loadingKey]: false }));
                  setPremiumErrors(prev => ({ ...prev, [loadingKey]: true })); // [NEW] Mark as error
              }
          }
      };

      const promises = [];
      if (tasks.pitch) promises.push(poll(tasks.pitch, setPitchData, undefined, "Pitch"));
      if (tasks.gap_analysis) promises.push(poll(tasks.gap_analysis, setGapAnalysis, undefined, "Analyse des écarts"));
      if (tasks.salary_estimation) promises.push(poll(tasks.salary_estimation, setSalaryData, undefined, "Estimation Salaire"));
      // [NEW] Ajout de l'écoute si une recherche d'entreprise a été lancée depuis l'étape 8
      if (tasks.market_research) promises.push(poll(tasks.market_research, setResearchData, 'research', "Analyse Entreprise/Marché"));
      // [FIX] On écoute la tâche async des questions et on extrait le tableau du JSON brut
      if (tasks.questions) promises.push(poll(tasks.questions, (data) => setQuestionsList(data.questions || data), undefined, "Questionnaire"));
      
      if (tasks.career_radar) promises.push(poll(tasks.career_radar, setRadarResult, 'radar', "Radar de Carrière"));
      if (tasks.job_decoder) promises.push(poll(tasks.job_decoder, setDecoderResult, 'decoder', "Décodeur de Poste"));
      if (tasks.hidden_market) promises.push(poll(tasks.hidden_market, setHiddenMarketResult, 'hiddenMarket', "Marché Caché"));
      if (tasks.recruiter_view) promises.push(poll(tasks.recruiter_view, setRecruiterResult, 'recruiter', "Vue Recruteur"));
      if (tasks.career_gps) promises.push(poll(tasks.career_gps, setGpsResult, 'gps', "GPS Carrière"));
      if (tasks.reality_check) promises.push(poll(tasks.reality_check, setRealityResult, 'reality', "Reality Check"));
      if (tasks.flaw_coaching) promises.push(poll(tasks.flaw_coaching, setFlawCoachingResult, undefined, "Parades Défauts"));
      
      // On attend que tout soit fini (ou échoué)
      await Promise.all(promises);
      
      // Sauvegarde locale
      if (isMounted.current) {
          const currentSaved = localStorage.getItem("candidateForm");
          if (currentSaved) {
              const parsed = JSON.parse(currentSaved);
              localStorage.setItem("candidateForm", JSON.stringify({ ...parsed, pitchData, gapAnalysis, salaryData, questionsList, radarResult, decoderResult, hiddenMarketResult, recruiterResult, gpsResult, realityResult }));
          }
      }
  };

  // [ROBUSTESSE] Validation des étapes critiques avant de continuer
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, boolean> = {};

    switch (step) {
      case 1: // Profile
        if (!form.first_name) newErrors.first_name = true;
        if (!form.last_name) newErrors.last_name = true;
        if (!form.email) newErrors.email = true;
        break;
      case 2: // Target
        if (!form.target_role_primary) newErrors.target_role_primary = true;
        // [MODIF] Entreprise optionnelle. L'analyse se fera sur le secteur si absente.
        break;
      default:
        break;
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setToast({ type: "error", message: "Please fill in required fields." });
        return false;
    }
    
    return true;
  };

  // [FIX] Fonction robuste pour parser les valeurs de salaire (gère "45k", "45 000", 45000)
  const parseSalaryValue = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
          const num = parseInt(value.replace(/k/ig, '000').replace(/[\s€$]/g, ''), 10);
          return isNaN(num) ? 0 : num;
      }
      return 0;
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;

    // On déclenche la sauvegarde en base de données de manière asynchrone
    saveProgressToDB();

    // Trigger background research when leaving Step 2 (Target)
    if (currentStep === 2) {
        launchBackgroundResearch();
    }

    // [OPTIMISATION] Trigger background completeness analysis when leaving Step 5
    if (currentStep === 5) {
        const payload = formatPayload(form);
        fetchWithRetry(`${API_BASE_URL}/api/cv/analyze-completeness`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }).then(res => res.json()).then(data => {
            if (data.task_id) {
                console.log("[Completeness] Background task started from Step 5:", data.task_id);
                setCompletenessTaskId(data.task_id);
            }
        }).catch(e => console.error("Failed to start background completeness analysis", e));
    }

    // Before going to Clarification, check completeness at step 6 (Free Text) -> 7 (Clarification)
    if (currentStep === 6) {
        setIsAnalyzingCompleteness(true);
        try {
            let finalResult;
            if (completenessTaskId) {
                console.log("[Completeness] Waiting for background task started at Step 5...");
                finalResult = await pollTaskResult(completenessTaskId);
            } else {
                // Fallback si la tâche n'a pas pu démarrer à l'étape 5
                const payload = formatPayload(form);
                const response = await fetchWithRetry(`${API_BASE_URL}/api/cv/analyze-completeness`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                const initialRes = await response.json();
                finalResult = initialRes.task_id ? await pollTaskResult(initialRes.task_id) : initialRes;
            }

            if (finalResult.clarifications && finalResult.clarifications.length > 0) {
                // [FIX] Normalisation des questions pour l'affichage (String -> Object)
                const normalized = finalResult.clarifications.map((q: any, i: number) => ({
                    id: i + 1,
                    // [FIX] Robustesse : Gestion des différents formats possibles renvoyés par l'IA
                    question: typeof q === 'string' ? q : (q.question || q.text || q.issue || "Question " + (i+1)),
                    // [FIX] Pré-remplissage avec la réponse suggérée par l'IA (éditable)
                    answer: typeof q === 'object' && q.suggested_answer ? q.suggested_answer : ""
                }));
                setClarifications(normalized);
            }
            
            // Toujours passer à l'étape suivante (8) une fois l'analyse terminée
            setCurrentStep(7);
        } catch(e) { 
            console.error(e);
            setCurrentStep(7); // En cas d'erreur, on avance quand même
        } finally { setIsAnalyzingCompleteness(false); }
        return; // Stop ici car on a géré la transition manuellement
    }
    
    if (currentStep < STEPS.length) setCurrentStep((c) => c + 1);
  };

  const handleFinish = async () => {
      const payload = formatPayload(form); // [FIX] Utilisation du formatteur
      
      setShowGapAnalysisModal(false); // [FIX] Empêche le popup Gap Analysis d'apparaître intempestivement
      setToast({ type: "info", message: "Finalizing your profile analysis..." });
      setIsGeneratingDashboard(true);

      try {
          const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/start-analysis`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, target_job: form.target_role_primary, is_partial_start: false }), // [FIX] Mapping target_job
          });

          if (response.ok) {
              const res = await response.json();
              console.log("[Finish] Full analysis started. Tasks:", res.tasks);
              
              // Lancement du polling en arrière-plan pour mettre à jour l'UI quand c'est prêt
              if (res.tasks) {
                  // On lance le polling en tâche de fond (sans bloquer l'exécution avec "await")
                  pollDashboardTasks(res.tasks);
                  // Tempo stricte de 10 secondes pour lire la page d'attente avant d'afficher le Dashboard
                  await new Promise(resolve => setTimeout(resolve, 10000));
              }
          }
      } catch (e) {
          console.error("[Finish] Failed to trigger full analysis", e);
      } finally {
          if (isMounted.current) {
              setIsGeneratingDashboard(false);
              setView('dashboard');
          }
      }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((c) => c - 1);
  };

  const goToStep = (stepId: number) => {
    if (view === 'stepper') setCurrentStep(stepId);
  };

  const handleClarificationAnswer = (id: any, value: string) => {
      setClarifications(prev => prev.map(c => c.id === id ? { ...c, answer: value } : c));
  };

  // [NEW] Gestionnaire pour mettre à jour les questions du questionnaire
  const handleUpdateQuestion = (index: number, field: string, value: any) => {
      setQuestionsList(prev => {
          const newList = [...prev];
          newList[index] = { ...newList[index], [field]: value };
          return newList;
      });
  };

  const handlePrintQuestionnaire = async (questions: any[]) => {
    // Hack: pass questions via a temporary property or modify handleAction signature
    // Here we just call handleActionWrapper but we need to pass the questions.
    setIsPrinting(true);
    try {
        const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ action: "Print Questionnaire", data: { ...form, questions_list: questions } }),
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "interview_prep.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error(e);
        setToast({ type: "error", message: "Failed to generate PDF." });
    } finally {
        setIsPrinting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Profile
        return (
          <div className="step-content">
            <StepProfile data={form} onChange={change} errors={errors} lang={langCode} />
          </div>
        );
      case 2: // Target
        return <StepTarget data={form} onChange={change} errors={errors} loading={isResearching} lang={langCode} />;
      case 3: // Education
        return (
          <StepEducation
            list={educations}
            onAdd={() =>
              addToList(educations, setEducations, {
                degree: "",
                school: "",
                year: "",
              })
            }
            onRemove={(id: number) =>
              removeFromList(educations, setEducations, id)
            }
            onUpdate={(id: number, f: string, v: any) =>
              updateList(educations, setEducations, id, f, v)
            }
            lang={langCode}
          />
        );
      case 4: // Experience
        return (
          <StepExperience
            list={experiences}
            onAdd={() =>
              addToList(experiences, setExperiences, {
                role: "",
                company: "",
                start_date: "",
                end_date: "",
              })
            }
            onRemove={(id: number) =>
              removeFromList(experiences, setExperiences, id)
            }
            onUpdate={(id: number, f: string, v: any) =>
              updateList(experiences, setExperiences, id, f, v)
            }
            lang={langCode}
          />
        );
      case 5: // Qualities & Flaws
        return (
          <StepQualitiesFlaws 
            data={form} 
            onChange={change} 
            lang={langCode}
          />
        );
      case 6: // Free Text
        return <StepFreeText data={form} onChange={change} loading={loading} lang={langCode} />;
      case 7: // Clarification
        return <StepClarification clarifications={clarifications} onAnswer={handleClarificationAnswer} lang={langCode} />;
      default:
        return null;
    }
  };

  // If not logged in, show Auth Screen
  if (!isLoggedIn) {
    return <AuthScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const currentUser = getUser();

  return (
    <div className={`page-container candidate-page ${darkMode ? "dark-mode" : ""} ${view === 'stepper' ? 'has-stepper-header' : ''}`}>
      <style>{`
        .content-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 24px;
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .card {
          width: 100%;
          transition: max-width 0.3s ease;
        }
        .card-stepper {
          max-width: 1200px; /* Élargi pour utiliser l'espace et réduire le scroll */
          background: var(--bg-card);
          border-radius: 1rem;
          padding: 2.5rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01);
        }
        .card-dashboard {
          max-width: 100%;
        }

        /* --- UNIFORMISATION UI : CHAMPS DE SAISIE (Même style que Dashboard) --- */
        .card form label {
          display: block;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }
        
        .card form input:not([type="checkbox"]):not([type="radio"]),
        .card form select,
        .card form textarea {
          width: 100%;
          box-sizing: border-box;
          max-width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          font-family: inherit;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }
        
        .card form input:focus,
        .card form select:focus,
        .card form textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
          background: var(--bg-card);
        }

        /* --- ANIMATION DE TRANSITION ENTRE LES ÉTAPES --- */
        .step-animation-wrapper {
          animation: fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- UTILITAIRES POUR REGROUPER EN CARTES (Bientôt utilisés dans CandidateSteps) --- */
        .form-card-group {
          background: var(--bg-body);
          border: 1px solid var(--border-color);
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        /* --- UNIFORMISATION UI : BOUTONS D'ACTION EN BAS DE PAGE --- */
        .actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .actions button {
          border-radius: 0.75rem;
          padding: 0.85rem 1.75rem;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
      `}</style>
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        showStepper={view === 'stepper'}
        steps={STEPS}
        currentStep={currentStep}
        goToStep={goToStep}
        userName={currentUser?.name || form.first_name || "Candidat"}
        onOpenProfile={() => setShowDocuments(true)} // @ts-ignore
        targetLanguage={i18n.language}
        onLanguageChange={handleLanguageChange}
      />

      <main className="page-content">
        <div className="content-wrapper">
        
        <div className={`card ${view !== 'stepper' ? 'card-dashboard' : 'card-stepper'}`}>
          {status && (
            <div
              className={`status-message ${status.type}`}
            >
              {status.message}
            </div>
          )}

          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}

          {showDebug && debugData && (
            <DebugModal data={debugData} onClose={() => setShowDebug(false)} />
          )}

          {showResearchModal && researchData && (
            // @ts-ignore - Bypass type checking for lang property
            <ResearchModal data={researchData} mode={researchModalMode} lang={langCode} onClose={() => setShowResearchModal(false)} />
          )}

          {showGapAnalysisModal && gapAnalysis && (
            <GapAnalysisModal 
              data={gapAnalysis} 
              onClose={() => setShowGapAnalysisModal(false)} 
            />
          )}

          {showSalaryModal && salaryData && (
            // @ts-ignore - Bypass type checking for lang property
            <SalaryModal 
                data={{
                    ...salaryData,
                    // [FIX] Mapping pour assurer la compatibilité avec le modal
                    // Utilisation du parser robuste
                    min: parseSalaryValue(salaryData.salary_range?.low || salaryData.min || salaryData.low),
                    max: parseSalaryValue(salaryData.salary_range?.high || salaryData.max || salaryData.high),
                    currency: salaryData.currency || salaryData.salary_range?.currency || "EUR"
                }} 
                lang={langCode}
                onClose={() => setShowSalaryModal(false)} 
            />
          )}

          {showDocuments && (
            <DocumentsModal onClose={() => setShowDocuments(false)} />
          )}

          {isAnalyzingCompleteness ? (
            <LoadingScreen 
              title="Création de votre profil stratégique..."
              description="Notre IA est en train d'analyser vos expériences et de les croiser avec les exigences du marché pour préparer votre dossier de candidature."
            />
          ) : isGeneratingDashboard ? (
            <LoadingScreen 
              title="Génération du Dashboard final..."
              description="Notre IA compile actuellement toutes vos données pour créer vos modules de coaching personnalisés."
            />
          ) : showResearchOverlay ? (
            <LoadingScreen 
              title="Recherche en cours..."
              description={loadingMessage || "Analyse approfondie en cours, veuillez patienter."}
            />
          ) : showQuestionnaire ? (
            <Questionnaire 
                questions={questionsList} 
                onBack={() => setShowQuestionnaire(false)} 
                onPrint={handlePrintQuestionnaire} 
                onUpdate={handleUpdateQuestion} // [NEW] Connexion du handler
                loading={isPrinting}
            />
          ) : showPitchMissingInfo ? (
            <PitchMissingInfo 
                missingFields={missingPitchFields}
                data={form}
                onChange={change}
                onSubmit={() => { setShowPitchMissingInfo(false); handleAction("Pitch"); }}
                onCancel={() => setShowPitchMissingInfo(false)}
            />
          ) : showPitch && pitchData ? (
            <PitchEditor 
                data={pitchData}
                onBack={() => setShowPitch(false)}
            />
          ) : showFlawCoaching ? (
            <FlawCoaching 
                data={flawCoachingResult}
                onBack={() => setShowFlawCoaching(false)}
            />
          ) : view === 'dashboard' ? ( // [FIX] Refonte de la logique d'affichage du dashboard
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                <DiagnosticDashboard
                    data={{
                      ...diagnosticData,
                      // On écrase le score temporaire du Bento par le score final et définitif du Gap Analysis dès qu'il est prêt
                      matchScore: gapAnalysis?.match_score ?? diagnosticData?.matchScore ?? diagnosticData?.match_score,
                      match_score: gapAnalysis?.match_score ?? diagnosticData?.match_score ?? diagnosticData?.matchScore,
                      gapsMatrix: gapAnalysis?.missing_gaps ? gapAnalysis.missing_gaps.map((g: any) => ({
                        skill: typeof g === 'string' ? g : (g.skill || JSON.stringify(g)),
                        impact: 'High',
                        action: 'À développer ou justifier'
                      })) : diagnosticData?.gapsMatrix,
                      analysis_stats: diagnosticData?.analysis_stats || { skills_detected: 0, requirements_analyzed: 0, gaps_identified: 0 }
                    }}
                    candidateName={`${form.first_name || ''} ${form.last_name || ''}`}
                    targetJob={form.target_role_primary || ''}
                    onAction={handleActionWrapper}
                  />

                {/* [FIX] Les composants premium ne s'affichent QUE si le candidat a fourni les données nécessaires */}
                {form.target_company ? (
                  (researchData || premiumLoading.research || premiumErrors.research || isResearching) && <CompanyAnalysisCard data={researchData} loading={isResearching || premiumLoading.research} error={premiumErrors.research} />
                ) : (
                  <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Building size={24} color="var(--primary)" /> Analyse Entreprise
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>Ciblez une entreprise spécifique pour débloquer l'analyse de sa culture, de son leadership et de ses enjeux.</p>
                    <button onClick={() => { setView('stepper'); setCurrentStep(2); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={16} /> Ajouter une entreprise
                    </button>
                  </div>
                )}
                {((form.target_company || form.target_industry) && (researchData || premiumLoading.research || premiumErrors.research || isResearching)) && <MarketAnalysisCard data={researchData} salaryData={salaryData} loading={isResearching || premiumLoading.research} error={premiumErrors.research} />}

                {(recruiterResult || premiumLoading.recruiter || premiumErrors.recruiter) && <RecruiterView data={recruiterResult} loading={premiumLoading.recruiter} error={premiumErrors.recruiter} />}
                {(radarResult || premiumLoading.radar || premiumErrors.radar) && <CareerRadar data={radarResult} loading={premiumLoading.radar} error={premiumErrors.radar} />}
                {form.job_description ? (
                  (decoderResult || premiumLoading.decoder || premiumErrors.decoder) && <JobDecoder data={decoderResult} loading={premiumLoading.decoder} error={premiumErrors.decoder} />
                ) : (
                  <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Search size={24} color="var(--primary)" /> Décodeur de Fiche de Poste
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>Vous n'avez pas renseigné d'offre d'emploi. Ajoutez-en une pour décoder les attentes cachées du recruteur et les pièges potentiels.</p>
                    <button onClick={() => { setView('stepper'); setCurrentStep(2); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Plus size={16} /> Ajouter une annonce
                    </button>
                  </div>
                )}
                {(hiddenMarketResult || premiumLoading.hiddenMarket || premiumErrors.hiddenMarket) && <HiddenMarket data={hiddenMarketResult} loading={premiumLoading.hiddenMarket} error={premiumErrors.hiddenMarket} />}
                {(gpsResult || premiumLoading.gps || premiumErrors.gps) && <CareerGPS data={gpsResult} loading={premiumLoading.gps} error={premiumErrors.gps} />}
                {(realityResult || premiumLoading.reality) && <CareerRealityCheck data={realityResult} loading={premiumLoading.reality} error={premiumErrors.reality} score={gapAnalysis?.match_score ?? diagnosticData?.match_score ?? diagnosticData?.matchScore} />}
                
                <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>🚀 Simulateur de Carrière</h3>
                  <CareerSimulator candidateData={{...form, experiences, educations}} />
                </div>
              </div>
            </>
          )
          : view === 'review' ? (
            <StepReview
              data={form} onChange={change}
              experiences={experiences} onUpdateExperience={(id: number, f: string, v: any) => updateList(experiences, setExperiences, id, f, v)} onAddExperience={() => addToList(experiences, setExperiences, { role: "", company: "", start_date: "", end_date: "" })} onRemoveExperience={(id: number) => removeFromList(experiences, setExperiences, id)}
              educations={educations} onUpdateEducation={(id: number, f: string, v: any) => updateList(educations, setEducations, id, f, v)} onAddEducation={() => addToList(educations, setEducations, { degree: "", school: "", year: "" })} onRemoveEducation={(id: number) => removeFromList(educations, setEducations, id)}
              onBack={() => setView('dashboard')}
              onGenerate={handleFinalGeneration}
              // @ts-ignore - Bypass type checking for arguments expected by handlePreview
              onPreview={(variant: string) => handlePreview({
                  ...formatPayload(form),
                  design_variant: variant
              })}
              loading={loading}
              cvMode={cvMode}
              cvAnalysis={cvAnalysis}
              pitchData={pitchData}
              gapAnalysis={gapAnalysis}
              lang={langCode}
            />
          ) : (
            <form onSubmit={(e) => e.preventDefault()}>
              
              {/* Le 'key' force React à rejouer l'animation à chaque changement d'étape ! */}
              <div key={currentStep} className="step-animation-wrapper">
                {renderStepContent()}
              </div>

              <div className="actions">
                {currentStep > 1 ? (
                  <button type="button" className="btn-secondary" onClick={prevStep}>{t('btn_previous', 'Précédent')}</button>
                ) : (
                  <div></div>
                )}

                {currentStep < STEPS.length ? (
                  <button type="button" className="btn-primary" onClick={nextStep}>{t('btn_next', 'Suivant')}</button>
                ) : (
                  <button type="button" className="btn-primary" onClick={handleFinish}>{t('btn_finish', 'Terminer & Voir le Dashboard')}</button>
                )}
              </div>
            </form>
          )}

        </div>
        </div>
      </main>

      {/* Lien vers le Dashboard Admin en pied de page */}
      <footer style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
        <button 
          onClick={() => navigate('/admin')} 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Accès Administrateur (Feedbacks)
        </button>
      </footer>
    </div>
  );
}