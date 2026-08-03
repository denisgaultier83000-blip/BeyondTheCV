import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { normalizePilotSummaryResponse } from '../utils/pilotSummary';

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

export function useDashboardLogic() {
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

  const [isPilotLoading, setIsPilotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'overview' | 'profile' | 'cv' | 'interview' | 'market' | 'career' | 'actions' | 'training' | 'posture' | 'debrief'>('overview');
  const [pilotData, setPilotData] = useState<any | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);


  // Compute a lightweight signature of core CV fields to decide when to refetch the dashboard summary
  const computePilotSignature = (data: any) => {
    if (!data) return '';
    return JSON.stringify({
      target_job: data.target_job,
      target_company: data.target_company,
      experiences: data.experiences || [],
      educations: data.educations || [],
      skills: data.skills || '',
      flaws: data.flaws || [],
      researchResult: researchResult || null
    });
  };

  const [pilotSignature, setPilotSignature] = useState<string>('');

  const fetchPilotData = useCallback(async () => {
    if (!formData) return; // nothing to enrich

    const currentSig = computePilotSignature(formData);
    // If we already have data and signature hasn't changed, skip re-fetch
    if (pilotData && pilotSignature === currentSig) return;

    console.log("Fetching pilot data...");
    setIsPilotLoading(true);
    setError(null);
    try {
      // [OPTIMISATION] On injecte les résultats de marché pour que la synthèse IA soit beaucoup plus riche
      const enrichedPayload = { ...formData };
      if (researchResult) enrichedPayload.research_data = researchResult;

      const response = await authenticatedFetch(`/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedPayload)
      });

      if (!response.ok) {
        let detail = '';
        try {
          detail = await response.text();
        } catch (readError) {
          console.warn('Impossible de lire l’erreur du backend.', readError);
        }
        throw new Error(detail || `Erreur serveur (${response.status})`);
      }

      const data = await response.json();
      setPilotData(normalizePilotSummaryResponse(enrichedPayload, data, researchResult));
      setPilotSignature(currentSig);
    } catch (err) {
      console.error('Erreur API Dashboard Summary:', err);
      const fallbackSummary = normalizePilotSummaryResponse({ ...formData, ...(researchResult ? { research_data: researchResult } : {}) }, null, researchResult);
      setPilotData(fallbackSummary);
      setPilotSignature(currentSig);
      setError(err instanceof Error ? err.message : 'La synthèse n’a pas pu être chargée.');
    } finally {
      setIsPilotLoading(false);
    }
  }, [formData, pilotData, pilotSignature, researchResult]);

  // Trigger pilot data refetch when core CV data changes
  useEffect(() => {
    try {
      const currentSig = computePilotSignature(formData);
      if (currentSig !== pilotSignature) {
        // Small debounce to avoid rapid refetch while the user types
        const id = setTimeout(() => {
          fetchPilotData();
        }, 600);
        return () => clearTimeout(id);
      }
    } catch (e) { console.warn('Signature compare error', e); }
  }, [formData, researchResult, pilotSignature]);

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
  const updateFormData = useCallback((key: string, value: any) => {
    setFormData((prev: any) => {
      // Gestion des champs imbriqués (ex: personal_info.first_name)
      if (['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'linkedin', 'photo'].includes(key)) {
        return { ...prev, personal_info: { ...(prev.personal_info || {}), [key]: value } };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  // Helpers pour les listes (Expériences, Education...)
  const updateList = useCallback((listName: string, id: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [listName]: prev[listName].map((item: any) => item.id === id ? { ...item, [field]: value } : item)
    }));
  }, []);

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
        const res = await authenticatedFetch(`/research/start`, {
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
        authenticatedFetch(`/cv/analyze-completeness`, {
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
        let responseData: any = null;
        {
            // [FIX] Toujours régénérer à partir des données courantes pour éviter les questions figées
            // quand l'utilisateur modifie les étapes précédentes puis revient à cette page.
            const res = await authenticatedFetch(`/cv/analyze-completeness`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Erreur API (Clarifications): ${res.statusText}`);
            responseData = await res.json();
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

         const res = await authenticatedFetch(`/cv/start-analysis`, {
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
  // existingResult : si déjà disponible (localStorage), on ne repoll pas les vieux IDs
  const useTaskPolling = (taskId: string | undefined, onComplete: (data: any) => void, existingResult?: any) => {
    useEffect(() => {
      if (!taskId) return;
      // Si un résultat valide existe déjà, inutile de repoll un ancien ID :
      // on nettoie juste le taskId pour ne pas le relancer au prochain rendu.
      if (existingResult && !existingResult.error) return;

      const interval = setInterval(async () => {
        try {
          const res = await authenticatedFetch(`/tasks/status/${taskId}`);
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
            // La tâche n'existe plus en DB (expirée / serveur redémarré).
            // On arrête le polling SANS écraser un éventuel résultat existant.
            clearInterval(interval);
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskId]);
  };

  // Activation des pollings parallèles — on passe le résultat existant en 3ème argument
  // pour éviter de repoll des IDs périmés au rechargement de page.
  useTaskPolling(taskIds?.cv_analysis, setCvResult, cvResult);
  useTaskPolling(taskIds?.gap_analysis, setGapResult, gapResult);
  useTaskPolling(taskIds?.market_research, setResearchResult, researchResult);
  useTaskPolling(taskIds?.salary_estimation, setSalaryResult, salaryResult);
  
  // [FIX] Rétablissement de l'écoute (polling) des tâches Premium
  useTaskPolling(taskIds?.career_gps, setCareerGpsResult, careerGpsResult);
  useTaskPolling(taskIds?.career_radar, setCareerRadarResult, careerRadarResult);
  useTaskPolling(taskIds?.job_decoder, setJobDecoderResult, jobDecoderResult);
  useTaskPolling(taskIds?.pitch, setPitchResult, pitchResult);
  useTaskPolling(taskIds?.questions, setQuestionsResult, questionsResult);
  useTaskPolling(taskIds?.hidden_market, setHiddenMarketResult, hiddenMarketResult);
  useTaskPolling(taskIds?.recruiter_view, setRecruiterResult, recruiterResult);
  useTaskPolling(taskIds?.reality_check, setRealityResult, realityResult);
  useTaskPolling(taskIds?.flaw_coaching, setFlawCoachingResult, flawCoachingResult);
  useTaskPolling(taskIds?.action_plan, setActionPlanResult, actionPlanResult);
  useTaskPolling(taskIds?.custom_scenarios, setCustomScenariosResult, customScenariosResult);

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
      const res = await authenticatedFetch(`/research/start`, {
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

  return {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    cvResult, gapResult, researchResult, salaryResult, displaySalary,
    careerGpsResult, careerRadarResult, jobDecoderResult, pitchResult, questionsResult,
    hiddenMarketResult, recruiterResult, realityResult, flawCoachingResult,
    actionPlanResult, globalStatus, error,
    customScenariosResult,
    handleNextStep,
    cvData: formData,
    updateFormData,
    setFormData,
    updateList,
    resetDashboard,
    activeTab, setActiveTab,
    isPilotLoading, setIsPilotLoading,
    pilotData, setPilotData,
    toasts, setToasts,
    fetchPilotData,
    triggerResearch
  };
}