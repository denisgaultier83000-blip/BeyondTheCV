// @refresh reset
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

// --- TYPES & INTERFACES ---
interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  quotas: { [key: string]: number };
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
  fetchQuotas: () => Promise<void>;
  updateFormData?: (key: string, value: any) => void;
  
  // React Query hooks
  pilotQuery: any; // Remplace pilotData, isPilotLoading, pilotError
  purgeCacheMutation: any;
  regenerateActionPlanMutation: any;

  // Fonctions de navigation/action
  setCurrentStep: (step: number) => void;
  triggerResearch: () => Promise<void>;

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
    // [FIX EXPERT] On s'assure que le parent (App.tsx) est aussi notifié pour que la persistance
    // via le useEffect de App.tsx fonctionne correctement.
    // C'est la clé pour que les modifications faites dans le Dashboard (ex: réponses aux questions)
    // soient bien sauvegardées dans le localStorage via le hook principal.
    if (onUpdateFormData) {
      onUpdateFormData(key, value);
    }
  }, [onUpdateFormData]);

  // État de navigation interne
  const [activeTab, setActiveTab] = useState<string>('cockpit');

  const queryClient = useQueryClient();

  const fetchQuotas = useCallback(async () => {
    // [FIX] Logique pour les testeurs avec quotas illimités
    const testerEmails = (import.meta.env.VITE_REACT_APP_TESTER_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase());
    const currentUserEmail = localCvData?.email?.toLowerCase();

    if (currentUserEmail && testerEmails.includes(currentUserEmail)) {
      // L'utilisateur est un testeur, on lui donne des quotas "illimités"
      queryClient.setQueryData(['quotas', localCvData?.email], {
        pitch: 999,
        qa: 999,
        mes: 999,
        negotiation: 999,
        regeneration: 999,
        update: 999,
      });
      return Promise.resolve(); // On arrête ici, pas besoin d'appeler l'API
    }

    // Logique normale pour les utilisateurs standards
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/balance`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error("Could not fetch quotas");
    } catch (e: any) {
        console.error("Impossible de récupérer les quotas, utilisation des valeurs par défaut.", e);
        return { pitch: 0, qa: 0, mes: 0, negotiation: 0, regeneration: 0, update: 0 };
    }
  }, [localCvData?.email]);

  const { data: quotas = { pitch: 0, qa: 0, mes: 0, negotiation: 0, regeneration: 0, update: 0 } } = useQuery({
    queryKey: ['quotas', localCvData?.email],
    queryFn: fetchQuotas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // --- QUERIES & MUTATIONS ---

  const pilotQuery = useQuery({
    queryKey: ['pilotData', localCvData?.id],
    queryFn: async () => {
      const payload = { ...localCvData, research_data: initialResearchResult, gap_analysis: initialGapResult };
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error((await response.json()).detail || "Erreur lors du chargement du résumé.");
      return response.json();
    },
    enabled: !!localCvData?.id, // Ne s'exécute que si les données du CV sont chargées
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const regenerateActionPlanMutation = useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/regenerate/action-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localCvData)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Erreur lors de la regénération.");
      return res.json();
    },
    onSuccess: (newData) => {
      // Invalider et mettre à jour les données du plan d'action
      queryClient.setQueryData(['actionPlanResult'], newData);
      handleUpdateFormData('actionPlanResult', newData);
      handleUpdateFormData('cockpitCheckedItems', []);
      handleUpdateFormData('trainingScores', {});
    }
  });

  const purgeCacheMutation = useMutation({
    mutationFn: async (contentType: string) => {
      return await authenticatedFetch(`${API_BASE_URL}/api/cv/cache?content_type=${contentType}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      // On pourrait invalider des queries spécifiques ici si nécessaire
      alert("Cache purgé. Veuillez rafraîchir la page (F5) pour générer de nouvelles données.");
    }
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['quotas'] });
  }, [localCvData?.email, queryClient]);

  return (
    // [FIX ARCHITECTURAL] On garantit ici que les props ne seront JAMAIS null.
    // On fournit un objet vide par défaut. Cela empêche les crashs `TypeError: Cannot read properties of null`
    // dans tous les composants enfants, sans avoir à les modifier un par un.
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      quotas,
      fetchQuotas,
      cvData: localCvData || {},
      gapResult: initialGapResult || {},
      researchResult: initialResearchResult || {},
      salaryResult: initialSalaryResult || {},
      jobDecoderResult: initialJobDecoderResult || {},
      pitchResult: initialPitchResult || {},
      questionsResult: initialQuestionsResult || {},
      recruiterResult: initialRecruiterResult || {},
      realityResult: initialRealityResult || {},
      flawCoachingResult: initialFlawCoachingResult || {},
      actionPlanResult: initialActionPlanResult || {},
      customScenariosResult: initialCustomScenariosResult || {},
      globalStatus: initialGlobalStatus,
      setCurrentStep: onSetCurrentStep,
      triggerResearch: onTriggerResearch,
      updateFormData: handleUpdateFormData,
      pilotQuery,
      purgeCacheMutation,
      regenerateActionPlanMutation,
      // Pour la compatibilité descendante, on peut exposer l'erreur de la query principale
      pilotError: pilotQuery.error?.message || null,
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