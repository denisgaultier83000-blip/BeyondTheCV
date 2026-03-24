import { useState, useEffect } from 'react';
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
    return saved ? parseInt(saved, 10) : 1;
  });
  
  const [targetLanguage, setTargetLanguage] = useState('French');
  
  const [formData, setFormData] = useState<any>(() => {
    const saved = localStorage.getItem("cvData");
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });
  
  // --- ÉTAT DU PIPELINE ---
  const [taskIds, setTaskIds] = useState<{ [key: string]: string } | null>(null);
  
  // États séparés pour chaque brique du dashboard
  const [cvResult, setCvResult] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [salaryResult, setSalaryResult] = useState<any>(null);
  const [displaySalary, setDisplaySalary] = useState<any>(null);
  
  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'pilot' | 'cv' | 'interview' | 'analysis' | 'gap' | 'compact'>('pilot');
  const [pilotData, setPilotData] = useState<any | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);


  const fetchPilotData = async () => {
    if (pilotData || !formData) return; // Already fetched or no data
    console.log("Fetching pilot data...");
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const safeGaps = Array.isArray(data.gapsMatrix) ? data.gapsMatrix : (Array.isArray(data.skills_to_bridge) ? data.skills_to_bridge : []);
        const safeStrengths = Array.isArray(data.strengths) ? data.strengths : (Array.isArray(data.key_strengths) ? data.key_strengths : []);

        setPilotData({
          matchScore: data.matchScore ?? data.match_score ?? 0,
          summary: data.summary ?? data.match_summary ?? 'Analyse IA terminée.',
          strengths: safeStrengths.map(s => typeof s === 'string' ? s : JSON.stringify(s)),
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
      setPilotData({
        matchScore: 0,
        summary: "Données non disponibles.",
        strengths: [],
        gapsMatrix: [],
        recommendedStrategy: ""
      });
    }
  };

  // --- Conversion de Devise ---
  const EUROPEAN_COUNTRIES = ['FRANCE', 'GERMANY', 'SPAIN', 'ITALY', 'PORTUGAL', 'BELGIUM', 'NETHERLANDS', 'AUSTRIA', 'IRELAND', 'DE', 'ES', 'FR', 'IT', 'PT'];
  const USD_TO_EUR_RATE = 0.92; // Taux de change approximatif

  // [PERSISTANCE] Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem("cvData", JSON.stringify(formData));
    localStorage.setItem("currentStep", currentStep.toString());
  }, [formData, currentStep]);

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
  const resetDashboard = () => {
    setFormData(INITIAL_DATA);
    setCurrentStep(1);
    setTaskIds(null);
    setCvResult(null);
    setResearchResult(null);
    setSalaryResult(null);
    setGlobalStatus("IDLE");
    setActiveTab('pilot');
    setPilotData(null);
    localStorage.removeItem("cvData");
    localStorage.removeItem("currentStep");
  };

  // --- ORCHESTRATION DES ÉTAPES ---
  const handleNextStep = async () => {
    const payload = { ...formData, target_language: targetLanguage };
    setError(null); // Reset error on retry
    
    try {
      if (currentStep === 2) {
        // PAGE 2 -> 3 : Trigger Background Market Research
        // On ne lance que si une entreprise ou un secteur est défini
        if (formData.target_company || formData.target_industry) {
        console.log("🚀 Triggering Page 2 Background Tasks (Market/Company)...");
        const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/start-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, is_partial_start: true })
        });
        if (!res.ok) throw new Error(`Erreur API (Marché): ${res.statusText}`);
        const data = await res.json();
        setTaskIds(prev => ({ ...prev, ...data.tasks })); // Merge task IDs
        }
        setCurrentStep(3);
      } 
      else if (currentStep === 6) {
        // PAGE 6 -> 7 : Sync Call for Clarifications
        setGlobalStatus("PROCESSING"); // Petit feedback visuel
        console.log("⏳ Fetching Clarification Questions (Sync)..."); 
        const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/generate-clarifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Erreur API (Clarifications): ${res.statusText}`);
        const questions = await res.json();
        
        // Mise à jour du formulaire avec les questions reçues
        if (questions.questions && Array.isArray(questions.questions)) {
            const clarifications = questions.questions.map((q: string, i: number) => ({ id: i, question: q, answer: "" }));
            updateFormData("clarifications", clarifications);
        }
        setGlobalStatus("IDLE");
        setCurrentStep(7);
      }
      else if (currentStep === 7) {
         // PAGE 7 -> DASHBOARD : Trigger Full Analysis
         setGlobalStatus("STARTING");
         const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/start-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, is_partial_start: false })
        });
        if (!res.ok) throw new Error(`Erreur API (Analyse): ${res.statusText}`);
        const data = await res.json();
        setTaskIds(prev => ({ ...prev, ...data.tasks }));
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
      if (!taskId || globalStatus !== "PROCESSING") return;
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/cv/analysis-status/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "COMPLETED") {
              onComplete(data.result);
              clearInterval(interval);
            } else if (data.status === "FAILED") {
              clearInterval(interval); // On arrête mais on ne bloque pas tout le dashboard
            }
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskId, globalStatus]);
  };

  // Activation des pollings parallèles
  useTaskPolling(taskIds?.cv_analysis, setCvResult);
  useTaskPolling(taskIds?.market_research, setResearchResult);
  useTaskPolling(taskIds?.salary_estimation, setSalaryResult);

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

  return {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    targetLanguage, setTargetLanguage,
    cvResult, researchResult, salaryResult, displaySalary,
    globalStatus, error,
    handleNextStep,
    cvData: formData,
    updateFormData,
    setFormData,
    updateList,
    resetDashboard,
    activeTab, setActiveTab,
    pilotData, setPilotData,
    toasts, setToasts,
    fetchPilotData
  };
}