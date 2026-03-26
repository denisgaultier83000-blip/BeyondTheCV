import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

// --- TYPES & INTERFACES ---
interface DashboardContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pilotData: any;
  isPilotLoading: boolean;
  fetchPilotData: () => Promise<void>;
  cvData: any;
  researchResult: any;
  salaryResult: any;
  careerGpsResult: any;
  careerRadarResult: any;
  jobDecoderResult: any;
  pitchResult: any;
  questionsResult: any;
  globalStatus: string;
  setCurrentStep: (step: number) => void;
  triggerResearch: () => Promise<void>;
}

interface DashboardProviderProps {
  children: ReactNode;
  initialCvData?: any;
  initialResearchResult?: any;
  initialSalaryResult?: any;
  initialCareerGpsResult?: any;
  initialCareerRadarResult?: any;
  initialJobDecoderResult?: any;
  initialPitchResult?: any;
  initialQuestionsResult?: any;
  initialGlobalStatus?: string;
  onSetCurrentStep?: (step: number) => void;
  onTriggerResearch?: () => Promise<void>;
}

// --- INITIALISATION DU CONTEXTE ---
const DashboardContext = createContext<DashboardContextType | null>(null);

// --- PROVIDER ---
export const DashboardProvider = ({
  children,
  initialCvData = null,
  initialResearchResult = null,
  initialSalaryResult = null,
  initialCareerGpsResult = null,
  initialCareerRadarResult = null,
  initialJobDecoderResult = null,
  initialPitchResult = null,
  initialQuestionsResult = null,
  initialGlobalStatus = 'IDLE',
  onSetCurrentStep = () => {},
  onTriggerResearch = async () => {}
}: DashboardProviderProps) => {
  // État de navigation interne
  const [activeTab, setActiveTab] = useState<string>('pilot');
  
  // État des données de la vue Bento (Résumé)
  const [pilotData, setPilotData] = useState<any>(null);
  const [isPilotLoading, setIsPilotLoading] = useState<boolean>(false);

  // Mémoïsation de la fonction d'appel pour éviter les re-rendus infinis dans les useEffect
  const fetchPilotData = useCallback(async () => {
    if (!initialCvData) return;
    
    setIsPilotLoading(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialCvData)
      });
      
      if (response.ok) {
        const data = await response.json();
        setPilotData(data);
      } else {
        const errData = await response.text();
        console.error(`[DashboardContext] Failed to fetch pilot data. Status: ${response.status}`, errData);
      }
    } catch (error) {
      console.error("[DashboardContext] Error fetching pilot data:", error);
    } finally {
      setIsPilotLoading(false);
    }
  }, [initialCvData]); // La fonction ne se recrée que si les données CV changent

  // Auto-fetch ultra-robuste quand le CV (mock puis réel) est mis à jour
  useEffect(() => {
    fetchPilotData();
  }, [fetchPilotData]);

  return (
    <DashboardContext.Provider value={{
      activeTab, setActiveTab,
      pilotData, fetchPilotData,
      isPilotLoading,
      cvData: initialCvData,
      researchResult: initialResearchResult,
      salaryResult: initialSalaryResult,
      careerGpsResult: initialCareerGpsResult,
      careerRadarResult: initialCareerRadarResult,
      jobDecoderResult: initialJobDecoderResult,
      pitchResult: initialPitchResult,
      questionsResult: initialQuestionsResult,
      globalStatus: initialGlobalStatus,
      setCurrentStep: onSetCurrentStep,
      triggerResearch: onTriggerResearch
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