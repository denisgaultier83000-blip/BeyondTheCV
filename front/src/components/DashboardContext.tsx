// @refresh reset
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

const INITIAL_DATA = {
  personal_info: { first_name: "", last_name: "", email: "", phone: "", address: "", city: "", linkedin: "", photo: "" },
  current_role: "",
  current_company: "",
  target_job: "",
  target_company: "",
  target_industry: "",
  target_country: "",
  availability: "",
  remote_preference: "",
  contract_type: "",
  experiences: [],
  educations: [],
  skills: "", // string pour le textarea
  qualities: [],
  flaws: [],
  interests: [],
  languages: [],
  free_text: "",
  clarifications: [], // Pour stocker les réponses aux questions générées
  provider: "gemini"
};

// --- TYPES & INTERFACES ---
interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pilotData: any;
  quotas: { [key: string]: number };
  isPilotLoading: boolean;
  researchResult: any;
  salaryResult: any;
  gapResult: any;
  jobDecoderResult: any;
  pitchResult: any;
  questionsResult: any;
  recruiterResult: any;
  realityResult: any;
  flawCoachingResult: any;
  actionPlanResult: any;
  customScenariosResult: any;
  globalStatus: string;
  cvData: any;
  setCurrentStep: (step: number) => void;
  triggerResearch: () => Promise<void>;
  fetchPilotData: () => Promise<void>;
  fetchQuotas: () => Promise<void>;
  updateFormData?: (key: string, value: any) => void;
  pilotError: string | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuth: boolean) => void;
  currentStep: number;
  cvResult: any;
  displaySalary: any;
  careerGpsResult: any;
  careerRadarResult: any;
  hiddenMarketResult: any;
  error: string | null;
  handleNextStep: () => Promise<void>;
  setFormData: (data: any) => void;
  updateList: (listName: string, id: number, field: string, value: any) => void;
  resetDashboard: (onComplete?: () => void) => void;
  toasts: Array<{ id: number; text: string }>;
  setToasts: (toasts: Array<{ id: number; text: string }>) => void;
}

interface DashboardProviderProps {
  children: ReactNode;
}

// --- INITIALISATION DU CONTEXTE ---
const DashboardContext = createContext<DashboardContextType | null>(null);

// --- PROVIDER ---
export const DashboardProvider = ({
  children
}: DashboardProviderProps) => {

  // [FIX] On lit le token dès le démarrage pour ne jamais perdre la session en cas de redirection sauvage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("token");
  });

  // [PERSISTANCE] Chargement initial depuis localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem("currentStep");
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });

  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem("cvData");
    if (saved && saved !== "undefined" && saved !== "null") {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Corrupted cvData in localStorage, resetting.");
      }
    }
    return INITIAL_DATA;
  });

  const [debouncedFormData, setDebouncedFormData] = useState<any>(formData);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFormData(formData);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [formData]);


    // --- ÉTAT DU PIPELINE ---
  const [taskIds, setTaskIds] = useState<{ [key: string]: string } | null>(() => {
    const saved = localStorage.getItem("taskIds");
    return saved ? JSON.parse(saved) : null;
  });

  // États séparés pour chaque brique du dashboard
  const [cvResult, setCvResult] = useState<any>(() => JSON.parse(localStorage.getItem("cvResult") || "null"));
  const [gapResult, setGapResult] = useState<any>(() => JSON.parse(localStorage.getItem("gapResult") || "null"));
  const [researchResult, setResearchResult] = useState<any>(() => JSON.parse(localStorage.getItem("researchResult") || "null"));
  const [salaryResult, setSalaryResult] = useState<any>(() => JSON.parse(localStorage.getItem("salaryResult") || "null"));
  const [displaySalary, setDisplaySalary] = useState<any>(null);

  // [FIX] Rétablissement des états pour les modules Premium
  const [careerGpsResult, setCareerGpsResult] = useState<any>(() => JSON.parse(localStorage.getItem("careerGpsResult") || "null"));
  const [careerRadarResult, setCareerRadarResult] = useState<any>(() => JSON.parse(localStorage.getItem("careerRadarResult") || "null"));
  const [jobDecoderResult, setJobDecoderResult] = useState<any>(() => JSON.parse(localStorage.getItem("jobDecoderResult") || "null"));
  const [pitchResult, setPitchResult] = useState<any>(() => JSON.parse(localStorage.getItem("pitchResult") || "null"));
  const [questionsResult, setQuestionsResult] = useState<any>(() => JSON.parse(localStorage.getItem("questionsResult") || "null"));
  const [hiddenMarketResult, setHiddenMarketResult] = useState<any>(() => JSON.parse(localStorage.getItem("hiddenMarketResult") || "null"));
  const [recruiterResult, setRecruiterResult] = useState<any>(() => JSON.parse(localStorage.getItem("recruiterResult") || "null"));
  const [realityResult, setRealityResult] = useState<any>(() => JSON.parse(localStorage.getItem("realityResult") || "null"));
  const [flawCoachingResult, setFlawCoachingResult] = useState<any>(() => JSON.parse(localStorage.getItem("flawCoachingResult") || "null"));
  const [actionPlanResult, setActionPlanResult] = useState<any>(() => JSON.parse(localStorage.getItem("actionPlanResult") || "null"));
  const [customScenariosResult, setCustomScenariosResult] = useState<any>(() => JSON.parse(localStorage.getItem("customScenariosResult") || "null"));

  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [pilotError, setPilotError] = useState<string | null>(null);


  const [isPilotLoading, setIsPilotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('cockpit');
  const [pilotData, setPilotData] = useState<any | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);

  // État des données de la vue Bento (Résumé)
  const [quotas, setQuotas] = useState<{[key: string]: number}>({
    pitch: 0,
    qa: 0,
    mes: 0,
    negotiation: 0,
    regeneration: 0,
    update: 0,
  });

  const fetchQuotas = useCallback(async () => {
    // [FIX] Logique pour les testeurs avec quotas illimités
    const testerEmails = (import.meta.env.VITE_REACT_APP_TESTER_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());
    const currentUserEmail = formData?.email?.toLowerCase();

    if (currentUserEmail && testerEmails.includes(currentUserEmail)) {
      // L'utilisateur est un testeur, on lui donne des quotas "illimités"
      setQuotas({
        pitch: 999,
        qa: 999,
        mes: 999,
        negotiation: 999,
        regeneration: 999,
        update: 999,
      });
      return; // On arrête ici, pas besoin d'appeler l'API
    }

    // Logique normale pour les utilisateurs standards
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/balance`);
        if (response.ok) {
            const data = await response.json();
            setQuotas(data);
        }
    } catch (e: any) {
        console.error("Impossible de récupérer les quotas, utilisation des valeurs par défaut.", e);
    }
  }, [formData?.email]);

  const fetchPilotData = useCallback(async () => {
    if (pilotData || !debouncedFormData) return; // Already fetched or no data
    console.log("Fetching pilot data...");
    setIsPilotLoading(true);
    setPilotError(null);
    try {
      // [OPTIMISATION] On injecte les résultats de marché pour que la synthèse IA soit beaucoup plus riche
      const enrichedPayload = { ...debouncedFormData };
      if (researchResult) enrichedPayload.research_data = researchResult;
       if (gapResult) {
        enrichedPayload.gap_analysis = gapResult;
      }

      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const safeGaps = Array.isArray(data.gapsMatrix) ? data.gapsMatrix : (Array.isArray(data.skills_to_bridge) ? data.skills_to_bridge : []);
        const safeStrengths = Array.isArray(data.strengths) ? data.strengths : (Array.isArray(data.key_strengths) ? data.key_strengths : []);

        setPilotData({
          matchScore: data.matchScore ?? data.match_score ?? 0,
          summary: data.summary ?? data.match_summary ?? 'Analyse IA terminée.',
          strengths: safeStrengths.map((s: any) => typeof s === 'string' ? s : JSON.stringify(s)),
          gapsMatrix: safeGaps.map((item: any) => ({ 
            skill: typeof item === 'string' ? item : (item.skill || item.name || JSON.stringify(item)), 
            impact: (typeof item === 'object' && item.impact) ? item.impact : 'High',
            action: (typeof item === 'object' && item.action) ? item.action : 'À prioriser pour ce poste' 
          })),
          recommendedStrategy: data.recommendedStrategy || (Array.isArray(data.application_strategy) ? data.application_strategy.join('\n• ') : '')
        });
      }
    } catch (err) { 
        console.error('Erreur API Dashboard Summary:', err);
        setPilotError("Erreur réseau (Timeout). L'intelligence artificielle met trop de temps à répondre.");
        setPilotData({
            matchScore: 0,
            summary: "Données non disponibles.",
            strengths: [],
            gapsMatrix: [],
            recommendedStrategy: ""
      });
    } finally {
      setIsPilotLoading(false);
    }
  }, [JSON.stringify(debouncedFormData), JSON.stringify(researchResult), JSON.stringify(gapResult)]);

  // --- Conversion de Devise ---
  const EUROPEAN_COUNTRIES = ['FRANCE', 'GERMANY', 'SPAIN', 'ITALY', 'PORTUGAL', 'BELGIUM', 'NETHERLANDS', 'AUSTRIA', 'IRELAND', 'DE', 'ES', 'FR', 'IT', 'PT'];
  const USD_TO_EUR_RATE = 0.92; // Taux de change approximatif

  // [PERSISTANCE] Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem("cvData", JSON.stringify(formData));
    localStorage.setItem("currentStep", currentStep.toString());
    if (taskIds) localStorage.setItem("taskIds", JSON.stringify(taskIds));
    if (cvResult) localStorage.setItem("cvResult", JSON.stringify(cvResult));
    if (gapResult) localStorage.setItem("gapResult", JSON.stringify(gapResult));
    if (researchResult) localStorage.setItem("researchResult", JSON.stringify(researchResult));
    if (salaryResult) localStorage.setItem("salaryResult", JSON.stringify(salaryResult));
    if (careerGpsResult) localStorage.setItem("careerGpsResult", JSON.stringify(careerGpsResult));
    if (careerRadarResult) localStorage.setItem("careerRadarResult", JSON.stringify(careerRadarResult));
    if (jobDecoderResult) localStorage.setItem("jobDecoderResult", JSON.stringify(jobDecoderResult));
    if (pitchResult) localStorage.setItem("pitchResult", JSON.stringify(pitchResult));
    if (questionsResult) localStorage.setItem("questionsResult", JSON.stringify(questionsResult));
    if (hiddenMarketResult) localStorage.setItem("hiddenMarketResult", JSON.stringify(hiddenMarketResult));
    if (recruiterResult) localStorage.setItem("recruiterResult", JSON.stringify(recruiterResult));
    if (realityResult) localStorage.setItem("realityResult", JSON.stringify(realityResult));
    if (flawCoachingResult) localStorage.setItem("flawCoachingResult", JSON.stringify(flawCoachingResult));
    if (actionPlanResult) localStorage.setItem("actionPlanResult", JSON.stringify(actionPlanResult));
    if (customScenariosResult) localStorage.setItem("customScenariosResult", JSON.stringify(customScenariosResult));
  }, [formData, currentStep, taskIds, cvResult, gapResult, researchResult, salaryResult, careerGpsResult, careerRadarResult, jobDecoderResult, pitchResult, questionsResult, hiddenMarketResult, recruiterResult, realityResult, flawCoachingResult, actionPlanResult, customScenariosResult]);

  // --- GESTION DU FORMULAIRE ---
  const updateFormData = (key: string, value: any) => {
    setFormData((prev: any) => {
      // Gestion des champs imbriqués (ex: personal_info.first_name)
      if (['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'linkedin', 'photo'].includes(key)) {
        return { ...prev, personal_info: { ...(prev.personal_info || {}), [key]: value } };
      }
      return { ...prev, [key]: value };
    });
  };

  // Helpers pour les listes (Expériences, Education...)
  const updateList = (listName: string, id: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [listName]: prev[listName].map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  // [RESET] Pour recommencer à zéro
  const resetDashboard = (onComplete?: () => void) => {
    setFormData(INITIAL_DATA);
    setCurrentStep(0);
    setTaskIds(null);
    setCvResult(null);
    setGapResult(null);
    setResearchResult(null);
    setSalaryResult(null);
    setCareerGpsResult(null);
    setCareerRadarResult(null);
    setJobDecoderResult(null);
    setPitchResult(null);
    setQuestionsResult(null);
    setHiddenMarketResult(null);
    setRecruiterResult(null);
    setRealityResult(null);
    setFlawCoachingResult(null);
    setActionPlanResult(null);
    setCustomScenariosResult(null);
    setGlobalStatus("IDLE");
    setActiveTab('overview');
    setPilotData(null);
    localStorage.removeItem("cvData");
    localStorage.removeItem("currentStep");
    localStorage.removeItem("taskIds");
    localStorage.removeItem("cvResult");
    localStorage.removeItem("researchResult");
    localStorage.removeItem("salaryResult");
    // etc. pour tous les résultats
    Object.keys(localStorage).forEach(key => {
      if (key.endsWith("Result")) localStorage.removeItem(key);
    });

    if (onComplete) {
      onComplete();
    }
  };

  // --- ORCHESTRATION DES ÉTAPES ---
  const handleNextStep = async () => {
    const payload = { ...formData, target_language: formData.target_language || 'fr' };
    setError(null); // Reset error on retry
    
    try {
      if (currentStep === 2) {
        // PAGE 2 -> 3 : Trigger Background Market Research
        // On ne lance que si une entreprise ou un secteur est défini
        if (formData.target_company || formData.target_industry) {
        console.log("🚀 Triggering Page 2 Background Tasks (Market/Company)...");
        const res = await authenticatedFetch(`${API_BASE_URL}/api/research/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            target_company: payload.target_company,
            target_industry: payload.target_industry,
            candidate_data: payload 
          })
        });
        if (!res.ok) throw new Error(`Erreur API (Marché): ${res.statusText}`);
        const data = await res.json();
        setTaskIds(prev => ({ ...prev, market_research: data.tasks.research, salary_estimation: data.tasks.salary }));
        }
        setCurrentStep(3);
      } 
      else if (currentStep === 5) {
        // Lancement anticipé (asynchrone) de l'analyse de complétude
        console.log("🚀 Triggering Page 5 Background Task (Completeness)...");
        authenticatedFetch(`${API_BASE_URL}/api/cv/analyze-completeness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => res.json()).then(data => {
            if (data.task_id) setTaskIds(prev => ({ ...prev, completeness: data.task_id }));
        }).catch(err => console.error("Completeness trigger error:", err));
        
        setCurrentStep(6);
      }
      else if (currentStep === 6) {
        // PAGE 6 -> 7 : Sync Call for Clarifications
        setGlobalStatus("PROCESSING"); // Petit feedback visuel
        console.log("⏳ Fetching Clarification Questions..."); 
        let responseData;
        
        const fetchResult = async (tid: string) => {
            while (true) {
                const res = await fetch(`${API_BASE_URL}/api/cv/analysis-status/${tid}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "SUCCESS" || data.status === "COMPLETED") return data.result;
                    if (data.status === "FAILED") throw new Error("Task failed");
                }
                await new Promise(r => setTimeout(r, 1500));
            }
        };

        if (taskIds?.completeness) {
            responseData = await fetchResult(taskIds.completeness);
        } else {
            const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/analyze-completeness`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const initData = await res.json();
            responseData = initData.task_id ? await fetchResult(initData.task_id) : initData;
        }
        
        // Mise à jour du formulaire avec les questions reçues
        if (responseData.clarifications && Array.isArray(responseData.clarifications)) {
            const clarifications = responseData.clarifications.map((c: any, i: number) => ({ id: i, question: c.question || c, answer: "" }));
            updateFormData("clarifications", clarifications);
        } else if (responseData.questions && Array.isArray(responseData.questions)) {
            // Fallback de rétrocompatibilité
            const clarifications = responseData.questions.map((q: string, i: number) => ({ id: i, question: q, answer: "" }));
            updateFormData("clarifications", clarifications);
        }
        setGlobalStatus("IDLE");
        setCurrentStep(7);
      }
      else if (currentStep === 7) {
         // PAGE 7 -> DASHBOARD : Trigger Full Analysis
         setGlobalStatus("STARTING");
         
         // [FIX] On injecte les résultats de recherche calculés en arrière-plan
         // pour que le backend comprenne qu'il ne doit pas relancer l'agent "Marché"
         const payloadWithCache = { ...payload };
         if (researchResult) {
             payloadWithCache.research_data = researchResult;
         } else if (taskIds?.market_research) {
             // [FIX CRITIQUE] L'analyse marché a été lancée à l'étape 2 et tourne encore !
             // On passe un faux cache pour empêcher le backend de relancer l'analyse de zéro.
             payloadWithCache.research_data = { _pending: true };
         }

         const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/start-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payloadWithCache, is_partial_start: false })
        });
        if (!res.ok) throw new Error(`Erreur API (Analyse): ${res.statusText}`);
        const data = await res.json();
        setTaskIds(prev => ({ 
            ...prev, 
            ...data.tasks,
            // On PRÉSERVE les IDs des tâches de fond lancées à l'Étape 2 si elles ne sont pas finies
            market_research: (!researchResult && prev?.market_research) ? prev.market_research : data.tasks.market_research,
            salary_estimation: (!salaryResult && prev?.salary_estimation) ? prev.salary_estimation : data.tasks.salary_estimation
        }));
        setGlobalStatus("PROCESSING");
        setCurrentStep(8); // Dashboard
      }
      else {
        // Navigation standard
        setCurrentStep(prev => prev + 1);
      }
    } catch (err: any) {
      console.error("Step Error:", err);
      setError(err.message);
      setGlobalStatus("FAILED");
    }
  };

  // --- POLLING GÉNÉRIQUE ---
  const useTaskPolling = (taskId: string | undefined, onComplete: (data: any) => void) => {
    useEffect(() => {
      // [FIX] On retire 'globalStatus !== "PROCESSING"' pour permettre le background polling dès la page 3
      if (!taskId) return;
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/cv/analysis-status/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            // [FIX] Support du nouveau statut backend (SUCCESS) et de l'ancien (COMPLETED)
            if (data.status === "COMPLETED" || data.status === "SUCCESS") {
              onComplete(data.result);
              clearInterval(interval);
            } else if (data.status === "FAILED") {
              // [FIX] Si la tâche backend plante (timeout IA), on injecte une erreur pour arrêter l'écran de chargement
              onComplete({ error: true, message: "L'analyse a échoué." });
              clearInterval(interval); // On arrête mais on ne bloque pas tout le dashboard
            }
          } else if (res.status === 404) {
            // [FIX] La tâche n'existe plus en BDD (expiration ou DB reset). On arrête de spammer !
            onComplete({ error: true, message: "Tâche introuvable ou expirée." });
            clearInterval(interval);
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskId]);
  };

  // Activation des pollings parallèles
  useTaskPolling(taskIds?.cv_analysis, setCvResult);
  useTaskPolling(taskIds?.gap_analysis, setGapResult);
  useTaskPolling(taskIds?.market_research, setResearchResult);
  useTaskPolling(taskIds?.salary_estimation, setSalaryResult);
  
  // [FIX] Rétablissement de l'écoute (polling) des tâches Premium
  useTaskPolling(taskIds?.career_gps, setCareerGpsResult);
  useTaskPolling(taskIds?.career_radar, setCareerRadarResult);
  useTaskPolling(taskIds?.job_decoder, setJobDecoderResult);
  useTaskPolling(taskIds?.pitch, setPitchResult);
  useTaskPolling(taskIds?.questions, setQuestionsResult);
  useTaskPolling(taskIds?.hidden_market, setHiddenMarketResult);
  useTaskPolling(taskIds?.recruiter_view, setRecruiterResult);
  useTaskPolling(taskIds?.reality_check, setRealityResult);
  useTaskPolling(taskIds?.flaw_coaching, setFlawCoachingResult);
  useTaskPolling(taskIds?.action_plan, setActionPlanResult);
  useTaskPolling(taskIds?.custom_scenarios, setCustomScenariosResult);

  // Effect pour la conversion de devise
  useEffect(() => {
    if (salaryResult) {
        const userCountry = (formData.target_country || '').toUpperCase();
        if (salaryResult.currency === 'USD' && EUROPEAN_COUNTRIES.includes(userCountry)) {
            const converted = {
                ...salaryResult,
                salary_range: {
                    low: Math.round(salaryResult.salary_range.low * USD_TO_EUR_RATE),
                    mid: Math.round(salaryResult.salary_range.mid * USD_TO_EUR_RATE),
                    high: Math.round(salaryResult.salary_range.high * USD_TO_EUR_RATE),
                },
                currency: 'EUR',
                original_currency: 'USD',
                commentary: `(Converti depuis USD) ${salaryResult.commentary}`
            };
            setDisplaySalary(converted);
        } else {
            setDisplaySalary(salaryResult);
        }
    }
  }, [salaryResult, formData.target_country]);

  // Vérification de fin globale
  useEffect(() => {
    if (cvResult && researchResult && globalStatus === "PROCESSING") {
      setGlobalStatus("COMPLETED");
    }
  }, [cvResult, researchResult, globalStatus]);

  // --- DÉCLENCHEMENT MANUEL ---
  const triggerResearch = async () => {
    setGlobalStatus("PROCESSING");
    setResearchResult(null); // On vide l'ancien résultat pour forcer le chargement
    try {
      const payload = { ...formData, target_language: formData.target_language || 'fr' };
      const res = await authenticatedFetch(`${API_BASE_URL}/api/research/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          target_company: payload.target_company,
          target_industry: payload.target_industry,
          candidate_data: payload 
        })
      });
      if (!res.ok) throw new Error("Failed to start research");
      const data = await res.json();
      setTaskIds(prev => ({ ...prev, market_research: data.tasks.research, salary_estimation: data.tasks.salary }));
    } catch (e) {
      console.error(e);
      setGlobalStatus("FAILED");
    }
  };

  useEffect(() => {
    fetchPilotData();
  }, [fetchPilotData]);

  useEffect(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      pilotData, fetchPilotData,
      isPilotLoading,
      quotas,
      fetchQuotas,
      cvData: formData,
      gapResult,
      researchResult,
      salaryResult,
      jobDecoderResult,
      pitchResult,
      questionsResult,
      recruiterResult,
      realityResult,
      flawCoachingResult,
      actionPlanResult,
      customScenariosResult,
      globalStatus,
      setCurrentStep,
      triggerResearch,
      updateFormData,
      pilotError,
      isAuthenticated,
      setIsAuthenticated,
      currentStep,
      cvResult,
      displaySalary,
      careerGpsResult,
      careerRadarResult,
      hiddenMarketResult,
      error,
      handleNextStep,
      setFormData,
      updateList,
      resetDashboard,
      toasts,
      setToasts
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

// --- HOOK PERSONNALISÉ SÉCURISÉ ---
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider. Ensure your component is wrapped in <DashboardProvider>.");
  }
  return context;
};
