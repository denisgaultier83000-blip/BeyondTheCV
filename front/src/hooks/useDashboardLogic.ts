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

const TESTER_SESSION_CAP = 30;

const LEGACY_TASK_KEY_MAP: Record<string, string> = {
  flaws: 'flaw_coaching',
  action: 'action_plan',
  scenarios: 'custom_scenarios',
  research: 'market_research',
  salary: 'salary_estimation',
};

const normalizeTaskIds = (raw: any): { [key: string]: string } | null => {
  if (!raw || typeof raw !== 'object') return null;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value) continue;
    const mappedKey = LEGACY_TASK_KEY_MAP[key] || key;
    normalized[mappedKey] = String(value);
  }
  return Object.keys(normalized).length ? normalized : null;
};

const toEffectiveSessionQuota = (value: any): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return TESTER_SESSION_CAP;
  return num;
};

const normalizeTrainingQuotas = (data: any) => {
  const credits = toEffectiveSessionQuota(data?.credits);
  return {
    credits,
    pitch: credits,
    qa: credits,
    mes: credits,
    negotiation: credits,
    regeneration: credits,
    update: credits,
    entreprises: Number(data?.entreprises ?? data?.quota_entreprises ?? 5),
    offres: Number(data?.offres ?? data?.quota_offres ?? 15),
  };
};

// Champs qui impactent réellement le dashboard stratégique.
// Les champs mineurs (ville, adresse, etc.) sont volontairement exclus.
const buildDashboardImpactPayload = (data: any) => ({
  target_job: data?.target_job || '',
  target_company: data?.target_company || '',
  target_industry: data?.target_industry || '',
  job_description: data?.job_description || '',
  current_role: data?.current_role || '',
  current_company: data?.current_company || '',
  experiences: data?.experiences || [],
  educations: data?.educations || [],
  skills: data?.skills || '',
  qualities: data?.qualities || [],
  flaws: data?.flaws || [],
  clarifications: (data?.clarifications || []).map((c: any) => ({
    id: c?.id,
    question: c?.question || '',
    answer: c?.answer || '',
  })),
  free_text: data?.free_text || '',
});

type DashboardRecalcLevel = 'none' | 'light' | 'full';

// Matrice explicite de décision produit.
// - none  : aucune relance (restore instantané du dashboard précédent)
// - light : recalcul résumé dashboard seulement
// - full  : relance pipeline complet
const DASHBOARD_IMPACT_MATRIX: Record<DashboardRecalcLevel, string[]> = {
  none: [
    // champs volontairement non suivis dans le payload d'impact: ville, adresse, téléphone, etc.
  ],
  light: [
    'skills',
    'qualities',
    'flaws',
    'clarifications',
    'free_text',
  ],
  full: [
    'target_job',
    'target_company',
    'target_industry',
    'job_description',
    'current_role',
    'current_company',
    'experiences',
    'educations',
  ],
};

const getDashboardRecalcLevel = (changedFields: string[]): DashboardRecalcLevel => {
  if (changedFields.length === 0) return 'none';
  if (changedFields.some((f) => DASHBOARD_IMPACT_MATRIX.full.includes(f))) return 'full';
  if (changedFields.some((f) => DASHBOARD_IMPACT_MATRIX.light.includes(f))) return 'light';
  return 'none';
};

const getChangedImpactFields = (previousPayload: any, currentPayload: any): string[] => {
  const normalizeLocal = (value: any): any => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(normalizeLocal);
    if (typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc: any, key: string) => {
          acc[key] = normalizeLocal(value[key]);
          return acc;
        }, {});
    }
    return String(value);
  };

  const keys = new Set<string>([
    ...Object.keys(previousPayload || {}),
    ...Object.keys(currentPayload || {}),
  ]);

  return Array.from(keys).filter((key) => {
    const prev = JSON.stringify(normalizeLocal(previousPayload?.[key]));
    const curr = JSON.stringify(normalizeLocal(currentPayload?.[key]));
    return prev !== curr;
  });
};

const hasUsableDashboardCache = (state: any) => {
  if (!state) return false;
  if (Array.isArray(state)) return state.length > 0;
  if (typeof state === 'object') {
    if ((state as any).error) return false;
    return Object.keys(state).length > 0;
  }
  return !!state;
};

const parsePossiblySerialized = (value: any): any => {
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

const readCachedResultAny = (...keys: string[]) => {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || raw === 'undefined' || raw === 'null') continue;
      const parsed = parsePossiblySerialized(raw);
      if (parsed && !(typeof parsed === 'object' && (parsed as any).error)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const pickHydrationCandidate = (source: any, keys: string[]): any => {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) {
    const raw = (source as any)[key];
    if (!raw) continue;
    const parsed = parsePossiblySerialized(raw);
    if (!parsed) continue;
    if (typeof parsed === 'object' && (parsed as any).error) continue;
    return parsed;
  }
  return null;
};

const normalizeResearchResult = (raw: any): any => {
  const parsed = parsePossiblySerialized(raw);
  if (!parsed || typeof parsed !== 'object') return parsed;

  const hasExplicitShape = !!(parsed.market_report || parsed.company_report || parsed.synthesis);
  if (hasExplicitShape) return parsed;

  const companyLikeKeys = ['identity_dna', 'hot_news', 'strategic_challenges', 'culture_environment', 'news_links'];
  const marketLikeKeys = ['tension_score', 'top_skills', 'trends', 'recruitment_dynamics', 'tension_index'];

  const hasCompanyLike = companyLikeKeys.some((k) => Object.prototype.hasOwnProperty.call(parsed, k));
  const hasMarketLike = marketLikeKeys.some((k) => Object.prototype.hasOwnProperty.call(parsed, k));

  if (hasCompanyLike && hasMarketLike) {
    return {
      company_report: parsed,
      market_report: parsed,
    };
  }

  if (hasCompanyLike) {
    return { company_report: parsed };
  }

  if (hasMarketLike) {
    return { market_report: parsed };
  }

  return parsed;
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
    if (!saved) return null;
    try {
      return normalizeTaskIds(JSON.parse(saved));
    } catch {
      return null;
    }
  });
  
  // États séparés pour chaque brique du dashboard
  const [cvResult, setCvResult] = useState<any>(() => readCachedResultAny("cvResult", "cv_result", "optimized_data"));
  const [gapResult, setGapResult] = useState<any>(() => readCachedResultAny("gapResult", "gap_result", "gap_analysis"));
  const [researchResult, setResearchResult] = useState<any>(() => normalizeResearchResult(readCachedResultAny("researchResult", "research_result", "research_data", "market_report", "company_report")));
  const [salaryResult, setSalaryResult] = useState<any>(() => readCachedResultAny("salaryResult", "salary_result", "salary"));
  const [displaySalary, setDisplaySalary] = useState<any>(null);
  
  // [FIX] Rétablissement des états pour les modules Premium
  const [careerGpsResult, setCareerGpsResult] = useState<any>(() => readCachedResultAny("careerGpsResult", "career_gps_result", "career_gps"));
  const [careerRadarResult, setCareerRadarResult] = useState<any>(() => readCachedResultAny("careerRadarResult", "career_radar_result", "career_radar"));
  const [jobDecoderResult, setJobDecoderResult] = useState<any>(() => readCachedResultAny("jobDecoderResult", "job_decoder_result", "job_decoder", "decoder"));
  const [pitchResult, setPitchResult] = useState<any>(() => readCachedResultAny("pitchResult", "pitch_result", "pitch"));
  const [questionsResult, setQuestionsResult] = useState<any>(() => readCachedResultAny("questionsResult", "questions_result", "interview_questions_result", "interview_questions"));
  const [hiddenMarketResult, setHiddenMarketResult] = useState<any>(() => readCachedResultAny("hiddenMarketResult", "hidden_market_result", "hidden_market"));
  const [recruiterResult, setRecruiterResult] = useState<any>(() => readCachedResultAny("recruiterResult", "recruiter_result", "recruiter_view_result", "recruiter_view"));
  const [realityResult, setRealityResult] = useState<any>(() => readCachedResultAny("realityResult", "reality_result", "reality_check_result", "reality_check"));
  const [flawCoachingResult, setFlawCoachingResult] = useState<any>(() => readCachedResultAny("flawCoachingResult", "flaw_coaching_result", "flaw_coaching"));
  const [actionPlanResult, setActionPlanResult] = useState<any>(() => readCachedResultAny("actionPlanResult", "action_plan_result", "action_plan"));
  const [customScenariosResult, setCustomScenariosResult] = useState<any>(() => readCachedResultAny("customScenariosResult", "custom_scenarios_result", "custom_scenarios", "scenarios"));
  
  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);

  const [isPilotLoading, setIsPilotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'overview' | 'profile' | 'cv' | 'interview' | 'market' | 'career' | 'actions' | 'training' | 'posture' | 'debrief'>('overview');
  const [pilotData, setPilotData] = useState<any | null>(() => {
    try {
      const raw = localStorage.getItem("pilotData");
      if (!raw || raw === "undefined" || raw === "null") return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [toasts, setToasts] = useState<Array<{ id: number; text: string }>>([]);
  const [quotas, setQuotas] = useState<{ [key: string]: number }>(() => {
    try {
      const raw = localStorage.getItem("trainingQuotas");
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          credits: toEffectiveSessionQuota(parsed?.credits),
          pitch: toEffectiveSessionQuota(parsed?.pitch ?? parsed?.quota_pitch),
          qa: toEffectiveSessionQuota(parsed?.qa ?? parsed?.quota_qa),
          mes: toEffectiveSessionQuota(parsed?.mes ?? parsed?.quota_mes),
          negotiation: toEffectiveSessionQuota(parsed?.negotiation ?? parsed?.quota_negotiation),
          regeneration: toEffectiveSessionQuota(parsed?.regeneration ?? parsed?.quota_regeneration),
          update: toEffectiveSessionQuota(parsed?.update ?? parsed?.quota_update),
          entreprises: Number(parsed?.entreprises ?? parsed?.quota_entreprises ?? 5),
          offres: Number(parsed?.offres ?? parsed?.quota_offres ?? 15),
        };
      }
    } catch (e) {
      console.warn("Unable to parse cached quotas", e);
    }

    return {
      credits: 30,
      pitch: 30,
      qa: 30,
      mes: 30,
      negotiation: 30,
      regeneration: 30,
      update: 30,
      entreprises: 5,
      offres: 15,
    };
  });


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

  const computeResearchSignature = (research: any) => {
    if (!research || typeof research !== 'object') return '';

    return JSON.stringify(stableSignatureValue({
      executive_summary: research.executive_summary || research.summary || '',
      summary: research.summary || '',
      market_report: research.market_report || {},
      company_report: research.company_report || {},
      synthesis: research.synthesis || '',
      company: research.company || research.target_company || '',
      industry: research.industry || research.target_industry || '',
      target_job: research.target_job || research.job_title || '',
      match_score: research.match_score || research.matchScore || 0,
    }));
  };

  // Compute a stable signature of core CV fields to decide when to refetch the dashboard summary
  const computePilotSignature = (data: any) => {
    if (!data) return '';
    return JSON.stringify(stableSignatureValue({
      target_job: data.target_job,
      target_company: data.target_company,
      target_industry: data.target_industry,
      job_description: data.job_description,
      current_role: data.current_role,
      current_company: data.current_company,
      experiences: data.experiences || [],
      educations: data.educations || [],
      skills: data.skills || '',
      flaws: data.flaws || [],
      research_signature: computeResearchSignature(researchResult),
    }));
  };

  const [pilotSignature, setPilotSignature] = useState<string>(() => {
    try {
      return localStorage.getItem("pilotSignature") || '';
    } catch {
      return '';
    }
  });

  // Hydrate module results from loaded profile payload when local states are empty.
  useEffect(() => {
    const source = formData;
    if (!source || typeof source !== 'object') return;
    if (globalStatus === "STARTING" || globalStatus === "PROCESSING") return;

    if (!researchResult) {
      const v = pickHydrationCandidate(source, [
        'research_data',
        'researchResult',
        'research_result',
        'researchData',
        'analysis_result',
        'analysisResult',
        'market_report',
        'company_report',
        'synthesis',
      ]);
      if (v) setResearchResult(normalizeResearchResult(v));
    }
    if (!salaryResult) {
      const v = pickHydrationCandidate(source, ['salary_result', 'salaryResult', 'salary']);
      if (v) setSalaryResult(v);
    }
    if (!gapResult) {
      const v = pickHydrationCandidate(source, ['gap_result', 'gapResult', 'gap_analysis']);
      if (v) setGapResult(v);
    }
    if (!jobDecoderResult) {
      const v = pickHydrationCandidate(source, ['job_decoder_result', 'jobDecoderResult', 'job_decoder']);
      if (v) setJobDecoderResult(v);
    }
    if (!pitchResult) {
      const v = pickHydrationCandidate(source, ['pitch_result', 'pitchResult', 'pitch']);
      if (v) setPitchResult(v);
    }
    if (!questionsResult) {
      const v = pickHydrationCandidate(source, ['questions_result', 'questionsResult', 'interview_questions_result', 'interview_questions']);
      if (v) setQuestionsResult(v);
    }
    if (!recruiterResult) {
      const v = pickHydrationCandidate(source, ['recruiter_result', 'recruiterResult', 'recruiter_view_result', 'recruiter_view']);
      if (v) setRecruiterResult(v);
    }
    if (!realityResult) {
      const v = pickHydrationCandidate(source, ['reality_result', 'realityResult', 'reality_check_result', 'reality_check']);
      if (v) setRealityResult(v);
    }
    if (!flawCoachingResult) {
      const v = pickHydrationCandidate(source, ['flaw_coaching_result', 'flawCoachingResult', 'flaw_coaching']);
      if (v) setFlawCoachingResult(v);
    }
    if (!actionPlanResult) {
      const v = pickHydrationCandidate(source, ['action_plan_result', 'actionPlanResult', 'action_plan']);
      if (v) setActionPlanResult(v);
    }
    if (!customScenariosResult) {
      const v = pickHydrationCandidate(source, ['custom_scenarios_result', 'customScenariosResult', 'custom_scenarios']);
      if (v) setCustomScenariosResult(v);
    }
  }, [
    formData,
    globalStatus,
    researchResult,
    salaryResult,
    gapResult,
    jobDecoderResult,
    pitchResult,
    questionsResult,
    recruiterResult,
    realityResult,
    flawCoachingResult,
    actionPlanResult,
    customScenariosResult,
  ]);

  const getTargetAnalysisSignature = (data: any) => {
    const normalize = (value: any) => String(value || '').trim().toLowerCase();
    return JSON.stringify({
      target_company: normalize(data?.target_company),
      target_industry: normalize(data?.target_industry),
      job_description: normalize(data?.job_description),
    });
  };

  const getDashboardImpactSignature = useCallback((data: any) => {
    return JSON.stringify(stableSignatureValue(buildDashboardImpactPayload(data)));
  }, []);

  const fetchQuotas = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`/cv/training/balance`);
      if (!response.ok) return;
      const data = await response.json();

      const normalized = normalizeTrainingQuotas(data);

      setQuotas((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(normalized)) return prev;
        return normalized;
      });
      localStorage.setItem("trainingQuotas", JSON.stringify(normalized));
    } catch (err) {
      console.error("Impossible de récupérer les quotas", err);
    }
  }, []);

  useEffect(() => {
    if (!taskIds) return;

    const resultByTaskKey: Record<string, any> = {
      cv_analysis: cvResult,
      gap_analysis: gapResult,
      market_research: researchResult,
      salary_estimation: salaryResult,
      career_gps: careerGpsResult,
      career_radar: careerRadarResult,
      job_decoder: jobDecoderResult,
      pitch: pitchResult,
      questions: questionsResult,
      hidden_market: hiddenMarketResult,
      recruiter_view: recruiterResult,
      reality_check: realityResult,
      flaw_coaching: flawCoachingResult,
      action_plan: actionPlanResult,
      custom_scenarios: customScenariosResult,
    };

    const nextTaskIds = { ...taskIds } as Record<string, string>;
    let changed = false;

    for (const [taskKey, taskId] of Object.entries(taskIds)) {
      const existingResult = resultByTaskKey[taskKey];
      if (existingResult && !existingResult.error) {
        delete nextTaskIds[taskKey];
        changed = true;
      }
    }

    if (changed) {
      setTaskIds(Object.keys(nextTaskIds).length > 0 ? nextTaskIds : null);
    }
  }, [
    taskIds,
    cvResult,
    gapResult,
    researchResult,
    salaryResult,
    careerGpsResult,
    careerRadarResult,
    jobDecoderResult,
    pitchResult,
    questionsResult,
    hiddenMarketResult,
    recruiterResult,
    realityResult,
    flawCoachingResult,
    actionPlanResult,
    customScenariosResult,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchQuotas();
    const id = setInterval(fetchQuotas, 15000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchQuotas]);

  const fetchPilotData = useCallback(async () => {
    if (!formData) return; // nothing to enrich

    const currentSig = computePilotSignature(formData);
    console.info('[DASHBOARD SUMMARY SIGNATURE] core_signature', {
      target_job: formData?.target_job || '',
      target_company: formData?.target_company || '',
      target_industry: formData?.target_industry || '',
      job_description: formData?.job_description || '',
      current_role: formData?.current_role || '',
      current_company: formData?.current_company || '',
      research_signature: computeResearchSignature(researchResult),
    });
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

  // NOTE: Le résumé dashboard est désormais piloté par le TabProvider dédié.
  // On désactive ici l'auto-fetch pour éviter le double calcul/log en parallèle.

  // --- Conversion de Devise ---
  const EUROPEAN_COUNTRIES = ['FRANCE', 'GERMANY', 'SPAIN', 'ITALY', 'PORTUGAL', 'BELGIUM', 'NETHERLANDS', 'AUSTRIA', 'IRELAND', 'DE', 'ES', 'FR', 'IT', 'PT'];
  const USD_TO_EUR_RATE = 0.92; // Taux de change approximatif

  // [PERSISTANCE] Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem("cvData", JSON.stringify(formData));
    localStorage.setItem("currentStep", currentStep.toString());
    if (taskIds) {
      const normalizedTaskIds = normalizeTaskIds(taskIds);
      if (normalizedTaskIds) {
        localStorage.setItem("taskIds", JSON.stringify(normalizedTaskIds));
      } else {
        localStorage.removeItem("taskIds");
      }
    } else {
      localStorage.removeItem("taskIds");
    }
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
    if (pilotData) {
      localStorage.setItem("pilotData", JSON.stringify(pilotData));
    } else {
      localStorage.removeItem("pilotData");
    }
    if (pilotSignature) {
      localStorage.setItem("pilotSignature", pilotSignature);
    } else {
      localStorage.removeItem("pilotSignature");
    }
    localStorage.setItem("trainingQuotas", JSON.stringify(quotas));
  }, [formData, currentStep, taskIds, cvResult, gapResult, researchResult, salaryResult, careerGpsResult, careerRadarResult, jobDecoderResult, pitchResult, questionsResult, hiddenMarketResult, recruiterResult, realityResult, flawCoachingResult, actionPlanResult, customScenariosResult, pilotData, pilotSignature, quotas]);

  // --- GESTION DU FORMULAIRE ---
  const updateFormData = useCallback((key: string, value: any) => {
    setFormData((prev: any) => {
      const targetKeys = ['target_company', 'target_job', 'target_industry', 'job_description'];

      // Si la cible change, on doit casser le lien avec l'ancienne candidature
      // pour que le backend cree un nouveau dossier historique.
      if (targetKeys.includes(key)) {
        const prevValue = String(prev?.[key] ?? '').trim();
        const nextValue = String(value ?? '').trim();
        const changed = prevValue !== nextValue;
        if (changed) {
          const next = { ...prev, [key]: value };
          delete next.application_id;
          delete next.last_target_analysis_signature;
          delete next.last_dashboard_impact_signature;
          return next;
        }
      }

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
    setPilotSignature('');
    localStorage.removeItem("cvData");
    localStorage.removeItem("currentStep");
    localStorage.removeItem("taskIds");
    localStorage.removeItem("cvResult");
    localStorage.removeItem("researchResult");
    localStorage.removeItem("salaryResult");
    localStorage.removeItem("pilotData");
    localStorage.removeItem("pilotSignature");
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
        const currentSignature = getTargetAnalysisSignature(formData);
        const previousSignature = formData?.last_target_analysis_signature;
        const hasTarget = !!(formData.target_company || formData.target_industry);
        const hasCachedMarketData = !!(researchResult && !researchResult?.error);
        const signatureMatch = previousSignature === currentSignature;
        const canReuseTargetAnalysis = signatureMatch && hasCachedMarketData;

        if (hasTarget) {
          console.info(
            `[TARGET_ANALYSIS_CACHE] ${canReuseTargetAnalysis ? 'HIT' : 'MISS'} (step2_guard)`,
            {
              signature_match: signatureMatch,
              has_market_cache: hasCachedMarketData,
              has_target: hasTarget,
            }
          );
        } else {
          console.info('[TARGET_ANALYSIS_CACHE] SKIP (step2_guard)', {
            reason: 'missing_target',
            has_target: hasTarget,
          });
        }

        if (hasTarget && !canReuseTargetAnalysis) {
        // La cible a change: invalider aussi le pitch precedent (resultat + edition manuelle).
        setPitchResult(null);
        setFormData(prev => ({
          ...(prev || {}),
          editablePitch: { written: '', oral: '', full_text: '' },
        }));
        localStorage.removeItem("pitchResult");

        // Invalide les anciens resultats pour forcer le polling des nouveaux task IDs.
        setResearchResult(null);
        setSalaryResult(null);
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
        setTaskIds(prev => ({
          ...(prev || {}),
          ...(normalizeTaskIds(data.tasks) || {}),
          market_research: data.tasks.research,
          salary_estimation: data.tasks.salary,
        }));
        setFormData(prev => ({
          ...(prev || {}),
          last_target_analysis_signature: currentSignature,
        }));
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
         const currentImpactPayload = buildDashboardImpactPayload(formData);
         const currentImpactSignature = getDashboardImpactSignature(formData);
         const previousImpactSignature =
           formData?.last_dashboard_impact_signature ||
           localStorage.getItem("lastDashboardImpactSignature") ||
           '';

         let previousImpactPayload: any = null;
         try {
           const raw = localStorage.getItem("lastDashboardImpactPayload");
           previousImpactPayload = raw ? JSON.parse(raw) : null;
         } catch {
           previousImpactPayload = null;
         }

         const requiresDecoder = !!String(formData?.job_description || '').trim();
         const dashboardCacheComplete = [
           cvResult,
           gapResult,
           researchResult,
           salaryResult,
           pitchResult,
           questionsResult,
           recruiterResult,
           realityResult,
           flawCoachingResult,
           actionPlanResult,
           customScenariosResult,
           requiresDecoder ? jobDecoderResult : { _optional: true },
         ].every(hasUsableDashboardCache);

         const hasAnyResolvedResult = !!(
           hasUsableDashboardCache(cvResult) ||
           hasUsableDashboardCache(gapResult) ||
           hasUsableDashboardCache(researchResult) ||
           hasUsableDashboardCache(salaryResult) ||
           hasUsableDashboardCache(pitchResult) ||
           hasUsableDashboardCache(questionsResult) ||
           hasUsableDashboardCache(recruiterResult) ||
           hasUsableDashboardCache(realityResult) ||
           hasUsableDashboardCache(flawCoachingResult) ||
           hasUsableDashboardCache(actionPlanResult) ||
           hasUsableDashboardCache(customScenariosResult) ||
           (!requiresDecoder || hasUsableDashboardCache(jobDecoderResult))
         );

         const restartMissingDashboardTasks = async () => {
           // Nettoie les task IDs potentiellement perimes avant de relancer.
           setTaskIds(null);

           // Relance marche/entreprise si necessaire.
           const hasTarget = !!(payload.target_company || payload.target_industry);
           const hasResearchReady = !!(researchResult && !researchResult?.error);
           if (hasTarget && !hasResearchReady) {
             try {
               const researchRes = await authenticatedFetch(`/research/start`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   target_company: payload.target_company,
                   target_industry: payload.target_industry,
                   candidate_data: payload,
                 }),
               });
               if (researchRes.ok) {
                 const researchData = await researchRes.json();
                 setTaskIds(prev => ({
                   ...(prev || {}),
                   ...(normalizeTaskIds(researchData.tasks) || {}),
                   market_research: researchData.tasks.research,
                   salary_estimation: researchData.tasks.salary,
                 }));
               }
             } catch (err) {
               console.warn('[STEP7][RECOVERY] market research restart failed:', err);
             }
           }

           // Relance le pipeline principal pour repopuler les modules en attente.
           const analysisRes = await authenticatedFetch(`/cv/start-analysis`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ ...payload, is_partial_start: false }),
           });
           if (analysisRes.ok) {
             const analysisData = await analysisRes.json();
             setTaskIds(prev => ({
               ...(prev || {}),
               ...(normalizeTaskIds(analysisData.tasks) || {}),
             }));
           }
         };

         // Cas simple demandé : si rien d'important n'a changé, on ré-ouvre instantanément le dashboard existant.
         if (previousImpactSignature && previousImpactSignature === currentImpactSignature) {
           console.info('[DASHBOARD_CACHE] HIT (step7_guard): no impactful changes, instant restore.');
           setCurrentStep(8);
           // Sans changement d'inputs, on évite de relancer tout le pipeline
           // uniquement parce qu'un module secondaire est absent du cache.
           if (!hasAnyResolvedResult) {
             setGlobalStatus("PROCESSING");
             await restartMissingDashboardTasks();
           } else {
             setGlobalStatus("COMPLETED");
           }
           return;
         }

         const changedImpactFields = getChangedImpactFields(previousImpactPayload || {}, currentImpactPayload);
         const recalcLevel = getDashboardRecalcLevel(changedImpactFields);

         console.info('[DASHBOARD_CACHE] IMPACT_MATRIX_DECISION', {
           level: recalcLevel,
           changed_fields: changedImpactFields,
         });

         if (recalcLevel === 'none') {
           console.info('[DASHBOARD_CACHE] NO_IMPACT_CHANGE: instant restore, no recalculation.');
           setCurrentStep(8);
           if (!hasAnyResolvedResult) {
             setGlobalStatus("PROCESSING");
             await restartMissingDashboardTasks();
           } else {
             setGlobalStatus("COMPLETED");
           }
           return;
         }

         if (recalcLevel === 'light') {
           setGlobalStatus("PROCESSING");
           await fetchPilotData();
           setGlobalStatus("COMPLETED");
           setCurrentStep(8);
           return;
         }

         // [CRITICAL] Sur recalcul complet (ex: changement entreprise cible),
         // on purge les sorties dependantes pour eviter de conserver l'ancien contenu
         // et permettre le polling des nouveaux task IDs.
         setGapResult(null);
         setResearchResult(null);
         setSalaryResult(null);
         setJobDecoderResult(null);
         setPitchResult(null);
         setQuestionsResult(null);
         setRecruiterResult(null);
         setRealityResult(null);
         setFlawCoachingResult(null);
         setActionPlanResult(null);
         setCustomScenariosResult(null);

         setGlobalStatus("STARTING");

         // [SAFETY] Si aucune analyse marche/entreprise n'est disponible
         // ni en cours, on la declenche avant l'analyse complete.
         const hasTarget = !!(payload.target_company || payload.target_industry);
         const hasResearchReady = !!(researchResult && !researchResult?.error);
         const hasResearchTaskRunning = !!taskIds?.market_research;
         if (hasTarget && !hasResearchReady && !hasResearchTaskRunning) {
           try {
             const researchRes = await authenticatedFetch(`/research/start`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 target_company: payload.target_company,
                 target_industry: payload.target_industry,
                 candidate_data: payload,
               }),
             });

             if (researchRes.ok) {
               const researchData = await researchRes.json();
               setTaskIds(prev => ({
                 ...(prev || {}),
                 ...(normalizeTaskIds(researchData.tasks) || {}),
                 market_research: researchData.tasks.research,
                 salary_estimation: researchData.tasks.salary,
               }));
             }
           } catch (researchStartErr) {
             console.warn('[STEP7] Unable to auto-start market research before full analysis:', researchStartErr);
           }
         }
         
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
          ...(prev || {}), 
          ...(normalizeTaskIds(data.tasks) || {}),
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
  const useTaskPolling = (taskKey: string, taskId: string | undefined, onComplete: (data: any) => void, existingResult?: any) => {
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
              setTaskIds(prev => {
                if (!prev || prev[taskKey] !== taskId) return prev;
                const next = { ...prev } as any;
                delete next[taskKey];
                return next;
              });
              clearInterval(interval);
            } else if (data.status === "FAILED") {
              // Si la tâche backend échoue, on conserve le dernier résultat valide pour un affichage instantané.
              setTaskIds(prev => {
                if (!prev || prev[taskKey] !== taskId) return prev;
                const next = { ...prev } as any;
                delete next[taskKey];
                return next;
              });
              const backendError =
                (typeof data?.error === 'string' && data.error) ||
                (typeof data?.result?.error === 'string' && data.result.error) ||
                '';
              const msg = backendError
                ? `La tâche ${taskKey} a échoué: ${backendError}`
                : `La tâche ${taskKey} a échoué.`;
              setError(msg);
              setGlobalStatus("FAILED");
              clearInterval(interval); // On arrête mais on ne bloque pas tout le dashboard
            }
          } else if (res.status === 404) {
            // La tâche n'existe plus en DB (expirée / serveur redémarré).
            // On arrête le polling SANS écraser un éventuel résultat existant.
            setTaskIds(prev => {
              if (!prev || prev[taskKey] !== taskId) return prev;
              const next = { ...prev } as any;
              delete next[taskKey];
              // Nettoyage immédiat pour éviter les boucles de polling après reload.
              localStorage.setItem("taskIds", JSON.stringify(next));
              return next;
            });
            clearInterval(interval);
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskKey, taskId, existingResult]);
  };

  // Activation des pollings parallèles — on passe le résultat existant en 3ème argument
  // pour éviter de repoll des IDs périmés au rechargement de page.
  useTaskPolling("cv_analysis", taskIds?.cv_analysis, setCvResult, cvResult);
  useTaskPolling("gap_analysis", taskIds?.gap_analysis, setGapResult, gapResult);
  useTaskPolling("market_research", taskIds?.market_research, (result: any) => setResearchResult(normalizeResearchResult(result)), researchResult);
  useTaskPolling("salary_estimation", taskIds?.salary_estimation, setSalaryResult, salaryResult);
  
  // [FIX] Rétablissement de l'écoute (polling) des tâches Premium
  useTaskPolling("career_gps", taskIds?.career_gps, setCareerGpsResult, careerGpsResult);
  useTaskPolling("career_radar", taskIds?.career_radar, setCareerRadarResult, careerRadarResult);
  useTaskPolling("job_decoder", taskIds?.job_decoder, setJobDecoderResult, jobDecoderResult);
  useTaskPolling("pitch", taskIds?.pitch, setPitchResult, pitchResult);
  useTaskPolling("questions", taskIds?.questions, setQuestionsResult, questionsResult);
  useTaskPolling("hidden_market", taskIds?.hidden_market, setHiddenMarketResult, hiddenMarketResult);
  useTaskPolling("recruiter_view", taskIds?.recruiter_view, setRecruiterResult, recruiterResult);
  useTaskPolling("reality_check", taskIds?.reality_check, setRealityResult, realityResult);
  useTaskPolling("flaw_coaching", taskIds?.flaw_coaching, setFlawCoachingResult, flawCoachingResult);
  useTaskPolling("action_plan", taskIds?.action_plan, setActionPlanResult, actionPlanResult);
  useTaskPolling("custom_scenarios", taskIds?.custom_scenarios, setCustomScenariosResult, customScenariosResult);

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

  // Quand un dashboard est complet, on mémorise la signature de référence.
  useEffect(() => {
    if (globalStatus !== "COMPLETED") return;
    const nextSig = getDashboardImpactSignature(formData);
    const impactPayload = buildDashboardImpactPayload(formData);

    setFormData((prev: any) => {
      if (!prev || prev.last_dashboard_impact_signature === nextSig) return prev;
      return { ...prev, last_dashboard_impact_signature: nextSig };
    });

    localStorage.setItem("lastDashboardImpactSignature", nextSig);
    localStorage.setItem("lastDashboardImpactPayload", JSON.stringify(impactPayload));
  }, [globalStatus, formData, getDashboardImpactSignature]);

  // Si aucun task n'est actif mais que des résultats existent déjà, on évite de rester bloqué en "PROCESSING".
  useEffect(() => {
    if (globalStatus !== "PROCESSING") return;
    if (taskIds && Object.keys(taskIds).length > 0) return;

    const hasAnyResolvedResult = !!(
      researchResult ||
      salaryResult ||
      gapResult ||
      pitchResult ||
      questionsResult ||
      jobDecoderResult ||
      recruiterResult ||
      realityResult ||
      flawCoachingResult ||
      actionPlanResult ||
      customScenariosResult
    );

    if (hasAnyResolvedResult) {
      setGlobalStatus("COMPLETED");
    }
  }, [
    globalStatus,
    taskIds,
    researchResult,
    salaryResult,
    gapResult,
    pitchResult,
    questionsResult,
    jobDecoderResult,
    recruiterResult,
    realityResult,
    flawCoachingResult,
    actionPlanResult,
    customScenariosResult,
  ]);

  // --- DÉCLENCHEMENT MANUEL ---
  const triggerResearch = async () => {
    const currentSignature = getTargetAnalysisSignature(formData);
    const previousSignature = formData?.last_target_analysis_signature;
    const canReuseTargetAnalysis = previousSignature === currentSignature && !!(researchResult && !researchResult?.error);

    if (canReuseTargetAnalysis) {
      setGlobalStatus("COMPLETED");
      return;
    }

    setGlobalStatus("PROCESSING");
    try {
      // Si la cible change, invalider explicitement le pitch precedent.
      setPitchResult(null);
      setFormData(prev => ({
        ...(prev || {}),
        editablePitch: { written: '', oral: '', full_text: '' },
      }));
      localStorage.removeItem("pitchResult");

      // Force la prise en compte du nouveau task ID (sinon un ancien resultat bloque le polling).
      setResearchResult(null);
      setSalaryResult(null);

      const payload = { ...formData, target_language: formData.target_language || 'fr' };
      const res = await authenticatedFetch(`/research/start`, {
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
      setTaskIds(prev => ({
        ...(prev || {}),
        ...(normalizeTaskIds(data.tasks) || {}),
        market_research: data.tasks.research,
        salary_estimation: data.tasks.salary,
      }));
      setFormData(prev => ({
        ...(prev || {}),
        last_target_analysis_signature: currentSignature,
      }));
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
    quotas,
    fetchQuotas,
    fetchPilotData,
    triggerResearch
  };
}