// @refresh reset
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
  pilotError: string | null;
  // [AJOUT] Propriété pour l'état admin global
  isAdmin: boolean;
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
  // État local pour conserver les modifications en temps réel (Optimistic UI global)
  const [localCvData, setLocalCvData] = useState<any>(initialCvData);

  // Synchronisation au cas où le parent recharge entièrement la page depuis la BDD
  useEffect(() => {
    setLocalCvData(initialCvData);
  }, [initialCvData]);

  // Intercepteur pour mettre à jour le contexte instantanément sans attendre le serveur
  const handleUpdateFormData = useCallback((key: string, value: any) => {
    setLocalCvData((prev: any) => ({ ...prev, [key]: value }));
    if (onUpdateFormData) {
      onUpdateFormData(key, value);
    }
  }, [onUpdateFormData]);

  // État de navigation interne
  const [activeTab, setActiveTab] = useState<string>('cockpit');

  // [AJOUT] État pour le statut administrateur
  const [isAdmin, setIsAdmin] = useState(false);
  // État des données de la vue Bento (Résumé)
  const [pilotData, setPilotData] = useState<any>(null);
  const [isPilotLoading, setIsPilotLoading] = useState<boolean>(false);
  const [pilotError, setPilotError] = useState<string | null>(null);
  const [quotas, setQuotas] = useState<{[key: string]: number}>({
    pitch: 0,
    qa: 0,
    mes: 0,
    negotiation: 0,
    regeneration: 0,
    update: 0,
  });

  // [AJOUT] Calcul du statut admin dès que l'email de l'utilisateur est connu
  useEffect(() => {
    const adminEmail = import.meta.env.VITE_REACT_APP_ADMIN_EMAIL;
    const userEmail = localCvData?.email?.toLowerCase();

    if (adminEmail && userEmail) {
      setIsAdmin(userEmail === adminEmail.toLowerCase());
    }
  }, [localCvData?.email]);

  const fetchQuotas = useCallback(async () => {
    // [FIX] Logique pour les testeurs avec quotas illimités
    const testerEmails = (import.meta.env.VITE_REACT_APP_TESTER_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());
    const currentUserEmail = localCvData?.email?.toLowerCase();

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
  }, [localCvData?.email]);

  // Mémoïsation de la fonction d'appel pour éviter les re-rendus infinis dans les useEffect
  const fetchPilotData = useCallback(async () => {
    if (!initialCvData) return;
    
    setIsPilotLoading(true);
    setPilotError(null);
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
        setPilotData(data);
      } else {
        let errMsg = `Erreur serveur (${response.status})`;
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        setPilotError(errMsg);
        console.error(`[DashboardContext] Failed to fetch pilot data. Status: ${response.status}`, errMsg);
      }
    } catch (error: any) {
      setPilotError(error.message || "Erreur réseau (Timeout). L'intelligence artificielle met trop de temps à répondre.");
      console.error("[DashboardContext] Error fetching pilot data:", error);
    } finally {
      setIsPilotLoading(false);
    }
  // [FIX EXPERT] On évite le re-rendu infini en stringifiant les objets dans les dépendances.
  // Sinon, React recrée la fonction à chaque rendu parent (changement de référence mémoire), ce qui spamme le backend.
  }, [JSON.stringify(initialCvData), JSON.stringify(initialResearchResult), JSON.stringify(initialGapResult)]); 

  // Auto-fetch ultra-robuste quand le CV (mock puis réel) est mis à jour
  useEffect(() => {
    fetchPilotData();
    fetchQuotas(); // `fetchQuotas` a maintenant `localCvData.email` en dépendance
  }, [fetchPilotData, fetchQuotas]);

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      pilotData, fetchPilotData,
      isPilotLoading,
      quotas,
      fetchQuotas,
      cvData: localCvData,
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
      isAdmin
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