// @refresh reset
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { normalizePilotSummaryResponse } from '../utils/pilotSummary';

const TESTER_SESSION_CAP = 30;
const normalizeTrainingQuotas = (data: any) => {
  const rawCreditsCandidates = [
    data?.credits,
    data?.pitch,
    data?.qa,
    data?.mes,
    data?.quota_pitch,
    data?.quota_qa,
    data?.quota_mes,
  ]
    .map((v: any) => Number(v))
    .filter((v: number) => Number.isFinite(v));

  const credits = rawCreditsCandidates.length > 0
    ? Math.max(...rawCreditsCandidates)
    : TESTER_SESSION_CAP;
  return {
    credits,
    pitch: credits,
    qa: credits,
    mes: credits,
    negotiation: credits,
    regeneration: credits,
    update: credits,
  };
};

const stableSignatureValue = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map(stableSignatureValue);
  }
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc: any, key: string) => {
        const normalized = stableSignatureValue(value[key]);
        if (normalized !== null && normalized !== '' && !(Array.isArray(normalized) && normalized.length === 0)) {
          acc[key] = normalized;
        }
        return acc;
      }, {});
  }
  return String(value);
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
  const readCachedResult = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw === 'undefined' || raw === 'null') return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const isUsableResult = (value: any) => {
    if (!value) return false;
    if (typeof value === 'object' && (value as any).error) return false;
    return true;
  };

  const pickCvFallback = (cv: any, keys: string[]) => {
    if (!cv || typeof cv !== 'object') return null;
    for (const key of keys) {
      const value = (cv as any)[key];
      if (isUsableResult(value)) return value;
    }
    return null;
  };

  const parseNestedMaybeJson = (value: any) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      return JSON.parse(match ? match[1] : trimmed);
    } catch {
      return value;
    }
  };

  const pickCvFallbackDeep = (source: any, keys: string[]) => {
    const target = new Set(keys);
    const visited = new Set<any>();

    const walk = (node: any): any => {
      if (!node || typeof node !== 'object') return null;
      if (visited.has(node)) return null;
      visited.add(node);

      for (const [k, raw] of Object.entries(node)) {
        const value = parseNestedMaybeJson(raw);
        if (target.has(k) && isUsableResult(value)) return value;
      }

      for (const raw of Object.values(node)) {
        const value = parseNestedMaybeJson(raw);
        if (value && typeof value === 'object') {
          const found = walk(value);
          if (found) return found;
        }
      }

      return null;
    };

    return walk(source);
  };

  const cvResearchResult = pickCvFallback(initialCvData, ['research_data', 'researchResult', 'research_result', 'market_report'])
    || pickCvFallbackDeep(initialCvData, ['research_data', 'researchResult', 'research_result', 'market_report', 'company_report', 'market_analysis', 'analyse_marche']);
  const cvSalaryResult = pickCvFallback(initialCvData, ['salary_result', 'salaryResult', 'salary']);
  const cvGapResult = pickCvFallback(initialCvData, ['gap_result', 'gapResult', 'gap_analysis']);
  const cvJobDecoderResult = pickCvFallback(initialCvData, ['job_decoder_result', 'jobDecoderResult', 'job_decoder']);
  const cvPitchResult = pickCvFallback(initialCvData, ['pitch_result', 'pitchResult', 'pitch']);
  const cvQuestionsResult = pickCvFallback(initialCvData, ['questions_result', 'questionsResult', 'interview_questions_result', 'interview_questions']);
  const cvRecruiterResult = pickCvFallback(initialCvData, ['recruiter_result', 'recruiterResult', 'recruiter_view_result', 'recruiter_view']);
  const cvRealityResult = pickCvFallback(initialCvData, ['reality_result', 'realityResult', 'reality_check_result', 'reality_check']);
  const cvFlawCoachingResult = pickCvFallback(initialCvData, ['flaw_coaching_result', 'flawCoachingResult', 'flaw_coaching']);
  const cvActionPlanResult = pickCvFallback(initialCvData, ['action_plan_result', 'actionPlanResult', 'action_plan']);
  const cvCustomScenariosResult = pickCvFallback(initialCvData, ['custom_scenarios_result', 'customScenariosResult', 'custom_scenarios']);

  const [cachedResearchResult] = useState<any>(() => readCachedResult('researchResult'));
  const [cachedSalaryResult] = useState<any>(() => readCachedResult('salaryResult'));
  const [cachedGapResult] = useState<any>(() => readCachedResult('gapResult'));
  const [cachedJobDecoderResult] = useState<any>(() => readCachedResult('jobDecoderResult'));
  const [cachedPitchResult] = useState<any>(() => readCachedResult('pitchResult'));
  const [cachedQuestionsResult] = useState<any>(() => readCachedResult('questionsResult'));
  const [cachedRecruiterResult] = useState<any>(() => readCachedResult('recruiterResult'));
  const [cachedRealityResult] = useState<any>(() => readCachedResult('realityResult'));
  const [cachedFlawCoachingResult] = useState<any>(() => readCachedResult('flawCoachingResult'));
  const [cachedActionPlanResult] = useState<any>(() => readCachedResult('actionPlanResult'));
  const [cachedCustomScenariosResult] = useState<any>(() => readCachedResult('customScenariosResult'));

  const resolvedResearchResult = isUsableResult(initialResearchResult) ? initialResearchResult : (cvResearchResult || cachedResearchResult);
  const resolvedSalaryResult = isUsableResult(initialSalaryResult) ? initialSalaryResult : (cvSalaryResult || cachedSalaryResult);
  const resolvedGapResult = isUsableResult(initialGapResult) ? initialGapResult : (cvGapResult || cachedGapResult);
  const resolvedJobDecoderResult = isUsableResult(initialJobDecoderResult) ? initialJobDecoderResult : (cvJobDecoderResult || cachedJobDecoderResult);
  const resolvedPitchResult = isUsableResult(initialPitchResult) ? initialPitchResult : (cvPitchResult || cachedPitchResult);
  const resolvedQuestionsResult = isUsableResult(initialQuestionsResult) ? initialQuestionsResult : (cvQuestionsResult || cachedQuestionsResult);
  const resolvedRecruiterResult = isUsableResult(initialRecruiterResult) ? initialRecruiterResult : (cvRecruiterResult || cachedRecruiterResult);
  const resolvedRealityResult = isUsableResult(initialRealityResult) ? initialRealityResult : (cvRealityResult || cachedRealityResult);
  const resolvedFlawCoachingResult = isUsableResult(initialFlawCoachingResult) ? initialFlawCoachingResult : (cvFlawCoachingResult || cachedFlawCoachingResult);
  const resolvedActionPlanResult = isUsableResult(initialActionPlanResult) ? initialActionPlanResult : (cvActionPlanResult || cachedActionPlanResult);
  const resolvedCustomScenariosResult = isUsableResult(initialCustomScenariosResult) ? initialCustomScenariosResult : (cvCustomScenariosResult || cachedCustomScenariosResult);

  const hasResolvedAnalysisData = !!(
    resolvedResearchResult ||
    resolvedSalaryResult ||
    resolvedGapResult ||
    resolvedJobDecoderResult ||
    resolvedPitchResult ||
    resolvedQuestionsResult ||
    resolvedRecruiterResult ||
    resolvedRealityResult ||
    resolvedFlawCoachingResult ||
    resolvedActionPlanResult ||
    resolvedCustomScenariosResult
  );

  const effectiveGlobalStatus =
    initialGlobalStatus === 'PROCESSING' && hasResolvedAnalysisData
      ? 'COMPLETED'
      : initialGlobalStatus;

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

  // État des données de la vue Bento (Résumé)
  const [pilotData, setPilotData] = useState<any>(null);
  const [isPilotLoading, setIsPilotLoading] = useState<boolean>(false);
  const [pilotError, setPilotError] = useState<string | null>(null);
  const pilotRequestSignatureRef = useRef<string>('');
  const pilotRequestInFlightRef = useRef<boolean>(false);
  const [quotas, setQuotas] = useState<{[key: string]: number}>({
    credits: TESTER_SESSION_CAP,
    pitch: TESTER_SESSION_CAP,
    qa: TESTER_SESSION_CAP,
    mes: TESTER_SESSION_CAP,
    negotiation: TESTER_SESSION_CAP,
    regeneration: TESTER_SESSION_CAP,
    update: TESTER_SESSION_CAP,
  });

  const fetchQuotas = useCallback(async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/cv/training/balance`);
        if (response.ok) {
            const data = await response.json();
            setQuotas((prev) => ({
              ...prev,
              ...normalizeTrainingQuotas(data),
              entreprises: Number(data?.entreprises ?? data?.quota_entreprises ?? prev.entreprises ?? 5),
                offres: Number(data?.offres ?? data?.quota_offres ?? prev.offres ?? 15),
            }));
        }
    } catch (e: any) {
        console.error("Impossible de récupérer les quotas.", e);
    }
  }, [localCvData?.email]);

  // Mémoïsation de la fonction d'appel pour éviter les re-rendus infinis dans les useEffect
  const fetchPilotData = useCallback(async () => {
    if (!initialCvData) return;

    const payload = { ...initialCvData } as any;
    if (resolvedResearchResult) {
      payload.research_data = resolvedResearchResult;
    }
    if (resolvedGapResult) {
      payload.gap_analysis = resolvedGapResult;
    }

    const requestSignature = JSON.stringify(stableSignatureValue(payload));
    console.info('[DASHBOARD SUMMARY SIGNATURE] tab_signature', {
      target_job: payload?.target_job || '',
      target_company: payload?.target_company || '',
      target_industry: payload?.target_industry || '',
      job_description: payload?.job_description || '',
      current_role: payload?.current_role || '',
      current_company: payload?.current_company || '',
      research_signature: payload?.research_data ? JSON.stringify(stableSignatureValue(payload.research_data)) : '',
      gap_signature: payload?.gap_analysis ? JSON.stringify(stableSignatureValue(payload.gap_analysis)) : '',
    });

    // Avoid duplicate summary requests caused by parent re-renders during polling.
    if (pilotRequestInFlightRef.current && pilotRequestSignatureRef.current === requestSignature) {
      console.info('[DASHBOARD SUMMARY] Skip duplicate request (in-flight).');
      return;
    }

    if (pilotData && pilotRequestSignatureRef.current === requestSignature) {
      console.info('[DASHBOARD SUMMARY] Cache hit (signature unchanged).');
      return;
    }

    setIsPilotLoading(true);
    setPilotError(null);
    pilotRequestInFlightRef.current = true;
    pilotRequestSignatureRef.current = requestSignature;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/cv/dashboard/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errMsg = `Erreur serveur (${response.status})`;
        try {
          const errObj = await response.json();
          errMsg = errObj.detail || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setPilotData(normalizePilotSummaryResponse(payload, data, resolvedResearchResult));
    } catch (error: any) {
      const fallbackData = normalizePilotSummaryResponse(payload, null, resolvedResearchResult);
      setPilotData(fallbackData);
      const errMsg = error?.message || "Erreur réseau (Timeout). L'intelligence artificielle met trop de temps à répondre.";
      setPilotError(errMsg);
      console.error("[DashboardContext] Error fetching pilot data:", error);
    } finally {
      pilotRequestInFlightRef.current = false;
      setIsPilotLoading(false);
    }
  // [FIX EXPERT] On évite le re-rendu infini en stringifiant les objets dans les dépendances.
  // Sinon, React recrée la fonction à chaque rendu parent (changement de référence mémoire), ce qui spamme le backend.
  }, [JSON.stringify(initialCvData), JSON.stringify(resolvedResearchResult), JSON.stringify(resolvedGapResult)]);

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
      gapResult: resolvedGapResult,
      researchResult: resolvedResearchResult,
      salaryResult: resolvedSalaryResult,
      jobDecoderResult: resolvedJobDecoderResult,
      pitchResult: resolvedPitchResult,
      questionsResult: resolvedQuestionsResult,
      recruiterResult: resolvedRecruiterResult,
      realityResult: resolvedRealityResult,
      flawCoachingResult: resolvedFlawCoachingResult,
      actionPlanResult: resolvedActionPlanResult,
      customScenariosResult: resolvedCustomScenariosResult,
      globalStatus: effectiveGlobalStatus,
      setCurrentStep: onSetCurrentStep,
      triggerResearch: onTriggerResearch,
      updateFormData: handleUpdateFormData,
      pilotError,
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