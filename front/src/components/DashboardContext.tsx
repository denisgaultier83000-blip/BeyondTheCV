// @refresh reset
import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

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
  isAdmin?: boolean;
  pilotError: string | null;
}

interface DashboardProviderProps {
  children: ReactNode;
  initialResearchResult?: any;
  initialGapResult?: any;
  initialSalaryResult?: any;
  initialJobDecoderResult?: any;
  initialPitchResult?: any;
  initialQuestionsResult?: any;
  initialRecruiterResult?: any;
  initialRealityResult?: any;
  initialFlawCoachingResult?: any;
  initialActionPlanResult?: any;
  initialCustomScenariosResult?: any;
  initialGlobalStatus?: string;
  onSetCurrentStep?: (step: number) => void;
  onTriggerResearch?: () => Promise<void>;
  initialCvData?: any;
  onUpdateFormData?: (key: string, value: any) => void;
}

// [EXPERT REFACTOR] Centralisation de la logique d'état avec un reducer.
interface DashboardState {
  activeTab: string;
  pilotData: any;
  isPilotLoading: boolean;
  pilotError: string | null;
  quotas: { [key: string]: number };
  cvData: any;
}

type DashboardAction =
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'FETCH_PILOT_DATA_START' }
  | { type: 'FETCH_PILOT_DATA_SUCCESS'; payload: any }
  | { type: 'FETCH_PILOT_DATA_ERROR'; payload: string }
  | { type: 'SET_QUOTAS'; payload: { [key: string]: number } }
  | { type: 'UPDATE_FORM_DATA'; payload: { key: string; value: any } }
  | { type: 'SET_CV_DATA'; payload: any };

const dashboardReducer = (state: DashboardState, action: DashboardAction): DashboardState => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'FETCH_PILOT_DATA_START':
      return { ...state, isPilotLoading: true, pilotError: null };
    case 'FETCH_PILOT_DATA_SUCCESS':
      return { ...state, isPilotLoading: false, pilotData: action.payload };
    case 'FETCH_PILOT_DATA_ERROR':
      return { ...state, isPilotLoading: false, pilotError: action.payload };
    case 'SET_QUOTAS':
      return { ...state, quotas: action.payload };
    case 'UPDATE_FORM_DATA':
      return { ...state, cvData: { ...state.cvData, [action.payload.key]: action.payload.value } };
    case 'SET_CV_DATA':
      return { ...state, cvData: action.payload };
    default:
      return state;
  }
};


// --- INITIALISATION DU CONTEXTE ---
const DashboardContext = createContext<DashboardContextType | null>(null);

// --- PROVIDER ---
export const DashboardProvider = ({
  children,
  initialCvData = null,
  initialGapResult = null,
  initialResearchResult = null,
  initialSalaryResult = null,
  initialJobDecoderResult = null,
  initialPitchResult = null,
  initialQuestionsResult = null,
  initialRecruiterResult = null,
  initialRealityResult = null,
  initialFlawCoachingResult = null,
  initialActionPlanResult = null,
  initialCustomScenariosResult = null,
  initialGlobalStatus = 'IDLE',
  onSetCurrentStep = () => {},
  onTriggerResearch = async () => {},
  onUpdateFormData
}: DashboardProviderProps) => {
  const initialState: DashboardState = {
    activeTab: 'cockpit',
    pilotData: null,
    isPilotLoading: false,
    pilotError: null,
    quotas: { pitch: 0, qa: 0, mes: 0, negotiation: 0, regeneration: 0, update: 0 },
    cvData: initialCvData,
  };

  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { activeTab, pilotData, isPilotLoading, pilotError, quotas, cvData } = state;

  // Synchronisation au cas où le parent recharge entièrement la page depuis la BDD
  useEffect(() => {
    dispatch({ type: 'SET_CV_DATA', payload: initialCvData });
  }, [initialCvData]);

  // Intercepteur pour mettre à jour le contexte instantanément sans attendre le serveur
  const handleUpdateFormData = useCallback((key: string, value: any) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: { key, value } });
    if (onUpdateFormData) {
      onUpdateFormData(key, value);
    }
  }, [onUpdateFormData]);

  const setActiveTab = (tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  // [EXPERT DEBUG] Séparation stricte des rôles "Admin" et "Testeur".
  // L'admin a accès au panel /admin. Les testeurs ont des quotas illimités. Ce sont deux choses différentes.
  const adminEmail = (import.meta.env.VITE_REACT_APP_ADMIN_EMAIL || "").trim().toLowerCase();
  const testerEmails = (import.meta.env.VITE_TESTER_EMAILS_LIST || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  const currentUserEmail = cvData?.email?.toLowerCase();

  // Le flag `isAdmin` est VRAI si et seulement si l'email correspond à l'admin unique.
  const isUserAdmin = !!(currentUserEmail && adminEmail && currentUserEmail === adminEmail);
  // Le flag `isTester` est VRAI si l'email est dans la liste des testeurs.
  const isUserTester = !!(currentUserEmail && testerEmails.includes(currentUserEmail));

  const fetchQuotas = useCallback(async () => {
    // [FIX] La logique des quotas illimités ne s'applique qu'aux testeurs, pas à l'admin.
    // L'admin peut avoir besoin de tester le flux de paiement et les limites de quotas.
    if (isUserTester) {
      // L'utilisateur est un testeur, on lui donne des quotas "illimités".
      dispatch({ type: 'SET_QUOTAS', payload: {
        pitch: 999,
        qa: 999,
        mes: 999,
        negotiation: 999,
        regeneration: 999,
        update: 999,
      }});
      return; // On arrête ici, pas besoin d'appeler l'API
    }

    // Logique normale pour les utilisateurs standards
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/balance`);
        if (response.ok) {
            const data = await response.json();
            dispatch({ type: 'SET_QUOTAS', payload: data });
        }
    } catch (e: any) {
        console.error("Impossible de récupérer les quotas, utilisation des valeurs par défaut.", e);
    }
  }, [cvData?.email, isUserTester]);

  // Mémoïsation de la fonction d'appel pour éviter les re-rendus infinis dans les useEffect
  const fetchPilotData = useCallback(async () => {
    if (!initialCvData) return;
    
    dispatch({ type: 'FETCH_PILOT_DATA_START' });
    try {
      // [FIX] On injecte les résultats de marché pour une synthèse beaucoup plus riche
      const payload = { ...initialCvData };
      if (initialResearchResult) {
        payload.research_data = initialResearchResult;
      }
      if (initialGapResult) {
        payload.gap_analysis = initialGapResult;
      }

      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'FETCH_PILOT_DATA_SUCCESS', payload: data });
      } else {
        let errMsg = `Erreur serveur (${response.status})`;
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        dispatch({ type: 'FETCH_PILOT_DATA_ERROR', payload: errMsg });
        console.error(`[DashboardContext] Failed to fetch pilot data. Status: ${response.status}`, errMsg);
      }
    } catch (error: any) {
      dispatch({ type: 'FETCH_PILOT_DATA_ERROR', payload: error.message || "Erreur réseau (Timeout). L'intelligence artificielle met trop de temps à répondre." });
      console.error("[DashboardContext] Error fetching pilot data:", error);
    }
  // [FIX EXPERT] On évite le re-rendu infini en stringifiant les objets dans les dépendances.
  // Sinon, React recrée la fonction à chaque rendu parent (changement de référence mémoire), ce qui spamme le backend.
  }, [JSON.stringify(initialCvData), JSON.stringify(initialResearchResult), JSON.stringify(initialGapResult)]); 

  // Auto-fetch ultra-robuste quand le CV (mock puis réel) est mis à jour
  useEffect(() => {
    fetchPilotData();
    fetchQuotas(); // `fetchQuotas` a maintenant `cvData.email` en dépendance
  }, [fetchPilotData, fetchQuotas]);

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      pilotData, fetchPilotData,
      isPilotLoading,
      quotas,
      fetchQuotas,
      cvData: cvData,
      gapResult: initialGapResult,
      researchResult: initialResearchResult,
      salaryResult: initialSalaryResult,
      jobDecoderResult: initialJobDecoderResult,
      pitchResult: initialPitchResult,
      questionsResult: initialQuestionsResult,
      recruiterResult: initialRecruiterResult,
      realityResult: initialRealityResult,
      flawCoachingResult: initialFlawCoachingResult,
      actionPlanResult: initialActionPlanResult,
      customScenariosResult: initialCustomScenariosResult,
      globalStatus: initialGlobalStatus,
      setCurrentStep: onSetCurrentStep,
      triggerResearch: onTriggerResearch,
      updateFormData: handleUpdateFormData,
      pilotError,
      isAdmin: isUserAdmin,
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