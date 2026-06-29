import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

import { storageManager } from '../utils/storageManager';
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
    return !!storageManager.local.getItem("token");
  });
  
  // [PERSISTANCE] Chargement initial depuis localStorage
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = storageManager.local.getItem("currentStep");
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  
  const [formData, setFormData] = useState<any>(() => {
    const saved = storageManager.local.getItem("cvData");
    if (saved && saved !== "undefined" && saved !== "null") {
      try {
        return JSON.parse(saved);
      } catch (e) { /* Corrupted data, fallback to initial */ }
    }
    return INITIAL_DATA;
  });
  
  // --- ÉTAT DU PIPELINE ---
  const [taskIds, setTaskIds] = useState<{ [key: string]: string } | null>(() => {
    const saved = storageManager.local.getItem("taskIds");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Helper pour charger un état depuis le storage
  const loadState = (key: string) => {
    const saved = storageManager.local.getItem(key);
    try { return saved ? JSON.parse(saved) : null; } catch (e) { return null; }
  };

  // États séparés pour chaque brique du dashboard
  const [cvResult, setCvResult] = useState<any>(() => loadState("cvResult"));
  const [gapResult, setGapResult] = useState<any>(() => loadState("gapResult"));
  const [researchResult, setResearchResult] = useState<any>(() => loadState("researchResult"));
  const [salaryResult, setSalaryResult] = useState<any>(() => loadState("salaryResult"));
  const [displaySalary, setDisplaySalary] = useState<any>(null);
  
  // [FIX] Rétablissement des états pour les modules Premium
  const [careerGpsResult, setCareerGpsResult] = useState<any>(() => loadState("careerGpsResult"));
  const [careerRadarResult, setCareerRadarResult] = useState<any>(() => loadState("careerRadarResult"));
  const [jobDecoderResult, setJobDecoderResult] = useState<any>(() => loadState("jobDecoderResult"));
  const [pitchResult, setPitchResult] = useState<any>(() => loadState("pitchResult"));
  const [questionsResult, setQuestionsResult] = useState<any>(() => loadState("questionsResult"));
  const [hiddenMarketResult, setHiddenMarketResult] = useState<any>(() => loadState("hiddenMarketResult"));
  const [recruiterResult, setRecruiterResult] = useState<any>(() => loadState("recruiterResult"));
  const [realityResult, setRealityResult] = useState<any>(() => loadState("realityResult"));
  const [flawCoachingResult, setFlawCoachingResult] = useState<any>(() => loadState("flawCoachingResult"));
  const [actionPlanResult, setActionPlanResult] = useState<any>(() => loadState("actionPlanResult"));
  const [customScenariosResult, setCustomScenariosResult] = useState<any>(() => loadState("customScenariosResult"));
  
  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);

  const [isPilotLoading, setIsPilotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cv' | 'interview' | 'market' | 'career' | 'actions'>('overview');
  const [pilotData, setPilotData] = useState<any | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);

  // [FIX EXPERT] Sécurisation des mises à jour d'état sur les composants démontés.
  // Empêche les erreurs "Can't perform a React state update on an unmounted component".
  const isMounted = React.useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);


  const fetchPilotData = async () => {
    if (pilotData || !formData) return; // Already fetched or no data
    console.log("Fetching pilot data...");
    setIsPilotLoading(true);
    try {
      // [OPTIMISATION] On injecte les résultats de marché pour que la synthèse IA soit beaucoup plus riche
      const enrichedPayload = { ...formData };
      if (researchResult) enrichedPayload.research_data = researchResult;

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
      // [SÉCURITÉ] On vérifie que le composant est toujours monté avant de mettre à jour l'état.
      if (isMounted.current) {
        setPilotData({
          matchScore: 0,
          summary: "Données non disponibles.",
          strengths: [],
          gapsMatrix: [],
          recommendedStrategy: ""
        });
      }
    } finally {
      // [SÉCURITÉ] On vérifie aussi ici.
      if (isMounted.current) setIsPilotLoading(false);
    }
  };

  // --- Conversion de Devise ---
  const EUROPEAN_COUNTRIES = ['FRANCE', 'GERMANY', 'SPAIN', 'ITALY', 'PORTUGAL', 'BELGIUM', 'NETHERLANDS', 'AUSTRIA', 'IRELAND', 'DE', 'ES', 'FR', 'IT', 'PT'];
  const USD_TO_EUR_RATE = 0.92; // Taux de change approximatif

  // [PERSISTANCE] Sauvegarde automatique
  useEffect(() => {
    if (formData) storageManager.local.setItem("cvData", JSON.stringify(formData));
    if (currentStep !== undefined) storageManager.local.setItem("currentStep", currentStep.toString());
    if (taskIds) storageManager.local.setItem("taskIds", JSON.stringify(taskIds));
    if (cvResult) storageManager.local.setItem("cvResult", JSON.stringify(cvResult));
    if (gapResult) storageManager.local.setItem("gapResult", JSON.stringify(gapResult));
    if (researchResult) storageManager.local.setItem("researchResult", JSON.stringify(researchResult));
    if (salaryResult) storageManager.local.setItem("salaryResult", JSON.stringify(salaryResult));
    if (careerGpsResult) storageManager.local.setItem("careerGpsResult", JSON.stringify(careerGpsResult));
    if (careerRadarResult) storageManager.local.setItem("careerRadarResult", JSON.stringify(careerRadarResult));
    if (jobDecoderResult) storageManager.local.setItem("jobDecoderResult", JSON.stringify(jobDecoderResult));
    if (pitchResult) storageManager.local.setItem("pitchResult", JSON.stringify(pitchResult));
    if (questionsResult) storageManager.local.setItem("questionsResult", JSON.stringify(questionsResult));
    if (hiddenMarketResult) storageManager.local.setItem("hiddenMarketResult", JSON.stringify(hiddenMarketResult));
    if (recruiterResult) storageManager.local.setItem("recruiterResult", JSON.stringify(recruiterResult));
    if (realityResult) storageManager.local.setItem("realityResult", JSON.stringify(realityResult));
    if (flawCoachingResult) storageManager.local.setItem("flawCoachingResult", JSON.stringify(flawCoachingResult));
    if (actionPlanResult) storageManager.local.setItem("actionPlanResult", JSON.stringify(actionPlanResult));
    if (customScenariosResult) storageManager.local.setItem("customScenariosResult", JSON.stringify(customScenariosResult));
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
    storageManager.local.removeItem("cvData");
    storageManager.local.removeItem("currentStep");
    storageManager.local.removeItem("taskIds");
    storageManager.local.removeItem("cvResult");
    storageManager.local.removeItem("researchResult");
    storageManager.local.removeItem("salaryResult");
    // etc. pour tous les résultats
    // Note: une approche plus propre serait d'utiliser storageManager.clear() si on est sûr de ne pas effacer d'autres clés.
    // Pour l'instant, on reste sur du spécifique.

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
    triggerResearch,
    isStorageAccessible: storageManager.local.isAccessible
  };
}