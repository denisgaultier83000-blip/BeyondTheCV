import React, { useState, useEffect, useRef, useCallback } from 'react';
 import { AlertCircle, RotateCcw, RefreshCw, Loader2, FileText, Target, MessageSquare, BarChart3, Bell as LucideBell, X as LucideX, Lock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Header, { Step } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DashboardProvider as GlobalProvider, useDashboard as useGlobalDashboard } from './hooks/DashboardContext';
import { DashboardProvider as TabProvider } from './components/DashboardContext';
import { 
  StepImport, StepProfile, StepTarget, StepEducation, StepExperience,
  StepQualitiesFlaws, StepClarification 
} from './components/CandidateSteps';
import AdminFeedbacks from './components/AdminFeedbacks';
import AdminUsers from './components/AdminUsers';
import AdminBilling from './components/AdminBilling';
import AdminGenerations from './components/AdminGenerations';
import AdminAuditLogs from './components/AdminAuditLogs';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import WizardStepper from './components/WizardStepper';
import { CGU } from './components/CGU';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LegalNotice } from './components/LegalNotice';
import ResetPassword from './components/ResetPassword';
import { LoadingScreen } from './components/LoadingScreen';
import DocumentsModal from './components/DocumentsModal';
import PackStatusWidget from './components/PackStatusWidget';
import ConfirmAnalysisModal from './components/ConfirmAnalysisModal';
import { API_BASE_URL } from './config';
import { authenticatedFetch } from './utils/auth';
import './index.css';

// Composant fantÃƒÂ´me sÃƒÂ©parÃƒÂ© pour isoler le cycle de vie du useEffect
function Step6Ghost({ onNext, t }: { onNext: () => void, t: any }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 100);
    return () => clearTimeout(timer);
  }, [onNext]);

  return <LoadingScreen title={t('loading_strat_title', "Creation de votre profil strategique...")} description={t('loading_strat_desc', "Analyse de vos experiences et exigences du marche...")} />;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  type TargetNode = {
    company: string;
    jobs: string[];
  };

  type AnalysisPreview = {
    company_cached: boolean;
    offer_cached: boolean;
    costs: {
      entreprises: number;
      offres: number;
    };
    should_confirm: boolean;
    quotas: {
      entreprises: number;
      offres: number;
      credits: number;
    };
  };

  type ApplicationSession = {
    id: string;
    target_company?: string;
    target_job?: string;
  };

  // --- Ãƒâ€°tats de l'interface ---
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const [restoredData, setRestoredData] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentQuotas, setCurrentQuotas] = useState<{ entreprises: number; offres: number; credits: number }>({ entreprises: 5, offres: 15, credits: 30 });
  const [analysisPreview, setAnalysisPreview] = useState<AnalysisPreview | null>(null);
  const [isCheckingAnalysisPreview, setIsCheckingAnalysisPreview] = useState(false);
  const [quotaRefreshToken, setQuotaRefreshToken] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [targetTree, setTargetTree] = useState<TargetNode[]>(() => {
    try {
      const raw = localStorage.getItem('btcv_target_tree');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((node: any) => node && typeof node.company === 'string' && Array.isArray(node.jobs));
    } catch {
      return [];
    }
  });
  const [showNewApplicationModal, setShowNewApplicationModal] = useState(false);
  const [selectedCompanyForApplication, setSelectedCompanyForApplication] = useState('');
  const [newCompanyForApplication, setNewCompanyForApplication] = useState('');
  const [newJobForApplication, setNewJobForApplication] = useState('');

  const handleQuotasLoaded = useCallback((q: { entreprises: number; offres: number; credits: number }) => {
    setCurrentQuotas((prev) => {
      if (
        prev.entreprises === q.entreprises &&
        prev.offres === q.offres &&
        prev.credits === q.credits
      ) {
        return prev;
      }
      return { entreprises: q.entreprises, offres: q.offres, credits: q.credits };
    });
  }, []);

  // Ref pour ÃƒÂ©viter de dÃƒÂ©clencher l'auto-sauvegarde au montage initial de la page
  const initialLoadRef = useRef(true);

  // --- Contexte Global (Hooks) ---
  const { t, i18n } = useTranslation();
  const targetCompaniesUsed = targetTree.length;
  const targetOffersUsed = targetTree.reduce((sum, node) => sum + (Array.isArray(node.jobs) ? node.jobs.length : 0), 0);
  const {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    gapResult, actionPlanResult,
    researchResult, salaryResult,
    jobDecoderResult,
    pitchResult, questionsResult,
    recruiterResult, realityResult, flawCoachingResult,
    globalStatus, error,
    customScenariosResult,
    handleNextStep,
    cvData,
    setFormData,
    resetDashboard,
    triggerResearch,
    toasts, setToasts,
    // [FIX] Ajout des variables manquantes pour gÃƒÂ©rer les onglets
    activeTab, setActiveTab 
  } = useGlobalDashboard();

  const fetchLatestQuotas = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/cv/training/balance`);
      if (!res.ok) return;
      const q = await res.json();
      setCurrentQuotas((prev) => {
        const next = {
          credits: Number(q?.credits ?? prev.credits ?? 30),
          entreprises: Number(q?.entreprises ?? prev.entreprises ?? 5),
          offres: Number(q?.offres ?? prev.offres ?? 15),
        };
        if (
          prev.credits === next.credits &&
          prev.entreprises === next.entreprises &&
          prev.offres === next.offres
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      // Silent: quotas are non-blocking UI data.
    }
  }, [isAuthenticated]);

  // --- Contrat de DonnÃƒÂ©es (Lecture seule) ---
  const transformProfileForFrontend = (profileData: any): object => {
    if (!profileData) return {};
    // PrioritÃƒÂ©: 1. Form data, 2. Personal info, 3. Root data
    const source = { ...profileData, ...(profileData.personal_info || {}), ...(profileData.form || {}) };
    
    const frontendData = {
      ...source, // On spread la source en premier pour ne pas ÃƒÂ©craser nos listes sÃƒÂ©curisÃƒÂ©es
      first_name: source.first_name || '',
      last_name: source.last_name || '',
      email: source.email || '',
      linkedin: source.linkedin || '',
      bio: source.bio || '',
      target_job: source.target_job || source?.target?.job || '',
      target_company: source.target_company || source?.target?.company || '',
      target_industry: source.target_industry || source?.target?.industry || '',
      target_country: source.target_country || source?.target?.country || '',
      job_description: source.job_description || source?.target?.job_description || '',
      experiences: (source.experiences || []).map((exp: any, i: number) => ({ ...exp, id: exp.id || `exp_${Date.now()}_${i}` })),
      educations: (source.educations || []).map((edu: any, i: number) => ({ ...edu, id: edu.id || `edu_${Date.now()}_${i}` })),
      pitch_result: source.pitch_result || null, // [FIX] PrÃƒÂ©-remplissage des pitchs
      skills: source.skills || []
    };

    // Clean up to avoid redundant nested objects
    delete frontendData.form;
    delete frontendData.personal_info;
    
    return frontendData;
  };

  // --- Contrat de DonnÃƒÂ©es (Ãƒâ€°criture) ---
  // Reconstruit la structure attendue par le backend avant le PUT
  const transformProfileForBackend = (frontendData: any): object => {
    if (!frontendData) return {};
    
    // Liste des champs appartenant aux informations personnelles
    const personalInfoFields = ['first_name', 'last_name', 'email', 'phone', 'city', 'country', 'linkedin', 'bio', 'target_language'];
    
    const payload: Record<string, any> = {
      personal_info: {}
    };

    Object.entries(frontendData).forEach(([key, value]) => {
      if (personalInfoFields.includes(key)) payload.personal_info[key] = value;
      else payload[key] = value;
    });

    return payload;
  };

  const CAREER_EDGE_STEPS: Step[] = [
    { id: 0, title: t('step_import', "Import") }, { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') }, { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') }, { id: 5, title: t('qualities_title') },
    { id: 7, title: t('clarification_title') }, { id: 8, title: t('step_results') }
  ];

  const normalizeText = (value: any) => String(value || '').trim();

  const isStepComplete = (stepId: number, data: any) => {
    const profile = data || {};
    const hasIdentity = !!normalizeText(profile.first_name) && !!normalizeText(profile.last_name) && !!normalizeText(profile.email);
    const hasTarget = !!normalizeText(profile.target_company) || !!normalizeText(profile.target_job) || !!normalizeText(profile.target_industry) || !!normalizeText(profile.job_description);
    const hasEducation = Array.isArray(profile.educations) && profile.educations.length > 0;
    const hasExperience = Array.isArray(profile.experiences) && profile.experiences.length > 0;
    const hasQualities = (Array.isArray(profile.qualities) && profile.qualities.length > 0) || (Array.isArray(profile.flaws) && profile.flaws.length > 0);
    const clarifications = Array.isArray(profile.clarifications) ? profile.clarifications : [];
    const hasClarificationsAnswered = clarifications.length === 0 || clarifications.every((c: any) => !!normalizeText(c?.answer));

    if (stepId === 0) return true;
    if (stepId === 1) return hasIdentity;
    if (stepId === 2) return hasTarget;
    if (stepId === 3) return hasEducation;
    if (stepId === 4) return hasExperience;
    if (stepId === 5) return hasQualities;
    if (stepId === 7) return hasClarificationsAnswered;
    if (stepId === 8) return hasIdentity && hasTarget && hasEducation && hasExperience && hasQualities && hasClarificationsAnswered;
    return false;
  };

  const getFirstIncompleteStep = (data: any) => {
    const onboardingSteps = [1, 2, 3, 4, 5, 7];
    const firstIncomplete = onboardingSteps.find((stepId) => !isStepComplete(stepId, data));
    return firstIncomplete ?? 8;
  };

  const getCompletedStepIds = (data: any) => CAREER_EDGE_STEPS.map((s) => s.id).filter((id) => isStepComplete(id, data));

  const getProfileCompletion = (data: any) => {
    const checkSteps = [1, 2, 3, 4, 5, 7];
    const completedCount = checkSteps.filter((id) => isStepComplete(id, data)).length;
    return Math.round((completedCount / checkSteps.length) * 100);
  };

  const getProfileRecommendations = (data: any) => {
    const recommendations: string[] = [];
    if (!isStepComplete(1, data)) recommendations.push('Compléter identité et coordonnées de contact.');
    if (!isStepComplete(2, data)) recommendations.push('Ajouter une cible claire: entreprise, poste ou annonce.');
    if (!isStepComplete(4, data)) recommendations.push('Détailler les expériences clés avec impact mesurable.');
    if (!isStepComplete(5, data)) recommendations.push('Renseigner vos forces/faiblesses pour personnaliser les entraînements.');
    return recommendations.slice(0, 3);
  };

  const filterPrefixJobs = (jobsList: string[]): string[] => {
    const unique = Array.from(new Set(jobsList.map((j) => normalizeText(j)).filter(Boolean)));
    unique.sort((a, b) => b.length - a.length);
    const cleaned: string[] = [];
    for (const job of unique) {
      const jobLower = job.toLowerCase();
      const isPrefix = cleaned.some((longer) => longer.toLowerCase().startsWith(jobLower));
      if (!isPrefix) {
        cleaned.push(job);
      }
    }
    return cleaned.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  };

  const collapseTargetTree = (nodes: TargetNode[]) => {
    const normalized = nodes
      .filter((node) => node && typeof node.company === 'string')
      .map((node) => ({
        company: normalizeText(node.company),
        jobs: Array.isArray(node.jobs) ? node.jobs.map((job) => normalizeText(job)).filter(Boolean) : [],
      }))
      .filter((node) => node.company);

    const sorted = [...normalized].sort((a, b) => b.company.length - a.company.length);
    const collapsed: TargetNode[] = [];

    for (const node of sorted) {
      const existing = collapsed.find((item) => item.company.toLowerCase() === node.company.toLowerCase());
      if (existing) {
        const mergedJobs = new Set([...(existing.jobs || []), ...(node.jobs || [])]);
        existing.jobs = Array.from(mergedJobs);
        continue;
      }

      const prefixMatch = collapsed.find((item) => {
        const shorter = node.company.toLowerCase();
        const longer = item.company.toLowerCase();
        return longer.startsWith(shorter) || shorter.startsWith(longer);
      });

      if (prefixMatch) {
        const mergedJobs = new Set([...(prefixMatch.jobs || []), ...(node.jobs || [])]);
        prefixMatch.company = prefixMatch.company.length >= node.company.length ? prefixMatch.company : node.company;
        prefixMatch.jobs = Array.from(mergedJobs);
        continue;
      }

      collapsed.push({ company: node.company, jobs: Array.from(new Set(node.jobs || [])) });
    }

    for (const node of collapsed) {
      node.jobs = filterPrefixJobs(node.jobs || []);
    }

    return collapsed.sort((a, b) => a.company.localeCompare(b.company, 'fr', { sensitivity: 'base' }));
  };

  const upsertTargetTree = useCallback((companyValue: string, jobValue: string) => {
    const company = normalizeText(companyValue);
    const job = normalizeText(jobValue);
    if (!company && !job) return;

    setTargetTree((prev) => {
      const next = [...prev, { company: company || 'Entreprise sans nom', jobs: job ? [job] : [] }];
      return collapseTargetTree(next);
    });
  }, []);

  const hydrateTargetTreeFromApplications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/applications`);
      if (!response.ok) return;

      const applications = await response.json();
      if (!Array.isArray(applications)) return;

      const nodesFromApi: TargetNode[] = (applications as ApplicationSession[])
        .map((app) => ({
          company: normalizeText(app?.target_company),
          jobs: [normalizeText(app?.target_job)].filter(Boolean),
        }))
        .filter((node) => node.company);

      if (nodesFromApi.length === 0) return;

      setTargetTree((prev) => collapseTargetTree([...prev, ...nodesFromApi]));
    } catch {
      // non-blocking
    }
  }, [isAuthenticated]);

  // --- Handlers transmis aux composants enfants ---
  const handleChange = (key: string, value: any) => setFormData((prev: any) => ({ ...(prev || {}), [key]: value }));
  const handleUpdateList = (listName: string, id: string | number, field: string, val: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).map((item: any) => item.id === id ? { ...item, [field]: val } : item) }));
  const handleAddList = (listName: string, defaultItem: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: [...(prev?.[listName] || []), { ...defaultItem, id: Date.now() }] }));
  const handleRemoveList = (listName: string, id: string | number) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).filter((item: any) => item.id !== id) }));
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setFormData((prev: any) => ({ ...(prev || {}), target_language: lang }));
  };

  const getTargetAnalysisSignature = (data: any) => {
    const normalize = (value: any) => String(value || '').trim().toLowerCase();
    return JSON.stringify({
      target_company: normalize(data?.target_company),
      target_industry: normalize(data?.target_industry),
      job_description: normalize(data?.job_description),
    });
  };

  const getCompanyConfirmationKey = (data: any) => {
    const normalize = (value: any) => String(value || '').trim().toLowerCase();
    return `${normalize(data?.target_company)}|${normalize(data?.target_industry)}`;
  };

  const hasSeenCompanyConfirmation = (data: any) => {
    const key = getCompanyConfirmationKey(data);
    if (!key || key === '|') return false;
    try {
      const raw = localStorage.getItem('confirmed_company_analyses');
      const seen = raw ? JSON.parse(raw) : [];
      return Array.isArray(seen) && seen.includes(key);
    } catch {
      return false;
    }
  };

  const markCompanyConfirmationSeen = (data: any) => {
    const key = getCompanyConfirmationKey(data);
    if (!key || key === '|') return;
    try {
      const raw = localStorage.getItem('confirmed_company_analyses');
      const seen = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(seen) ? seen : [];
      if (!next.includes(key)) {
        next.push(key);
        localStorage.setItem('confirmed_company_analyses', JSON.stringify(next));
      }
    } catch {
      localStorage.setItem('confirmed_company_analyses', JSON.stringify([key]));
    }
  };

  const fetchAnalysisPreview = async (): Promise<AnalysisPreview> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/cv/cache/analysis-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_company: cvData?.target_company || '',
        target_industry: cvData?.target_industry || '',
        job_description: cvData?.job_description || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API (Preview): ${response.statusText}`);
    }

    return response.json();
  };

  const handleTargetAnalysisContinue = async () => {
    const company = cvData?.target_company?.trim();
    const industry = cvData?.target_industry?.trim();
    const currentSignature = getTargetAnalysisSignature(cvData);
    const previousSignature = cvData?.last_target_analysis_signature;
    const signatureMatch = previousSignature === currentSignature;

    console.info(`[TARGET_ANALYSIS_CACHE] ${signatureMatch ? 'HIT' : 'MISS'} (target_continue_guard)`, {
      signature_match: signatureMatch,
      has_company: !!company,
      has_industry: !!industry,
    });

    // If the target inputs did not change since the last validated analysis,
    // skip the pricing modal and continue directly.
    if (signatureMatch) {
      await handleNextStep();
      return;
    }

    if (!company && !industry) {
      setStepErrors({ target_company: true, target_industry: true });
      setToasts(prev => [...prev, { id: Date.now(), text: "Veuillez specifier au moins une entreprise cible ou un secteur d'activite." }]);
      return;
    }

    setIsCheckingAnalysisPreview(true);
    try {
      const preview = await fetchAnalysisPreview();
      setCurrentQuotas(preview.quotas);
      const alreadyConfirmedCompany = hasSeenCompanyConfirmation(cvData);
      const requiresCompanyCost = (preview.costs?.entreprises || 0) > 0;

      console.info('[TARGET_ANALYSIS_CACHE] PREVIEW_RESULT (target_continue_guard)', {
        should_confirm: !!preview.should_confirm,
        company_cached: !!preview.company_cached,
        offer_cached: !!preview.offer_cached,
        requires_company_cost: requiresCompanyCost,
        already_confirmed_company: alreadyConfirmedCompany,
      });

      if (!preview.should_confirm || (requiresCompanyCost && alreadyConfirmedCompany)) {
        setAnalysisPreview(null);
        handleChange('last_target_analysis_signature', currentSignature);
        if (requiresCompanyCost) {
          markCompanyConfirmationSeen(cvData);
        }
        await handleNextStep();
        return;
      }

      setAnalysisPreview(preview);
      setShowConfirmModal(true);
    } catch (err) {
      console.error("[PREVIEW] Impossible de verifier le cout reel de l'analyse:", err);
      setAnalysisPreview({
        company_cached: false,
        offer_cached: false,
        costs: { entreprises: 1, offres: 1 },
        should_confirm: true,
        quotas: currentQuotas,
      });
      setShowConfirmModal(true);
    } finally {
      setIsCheckingAnalysisPreview(false);
    }
  };

  // --- Fonction de Sauvegarde Silencieuse (Auto-Save) ---
  const saveProfileToDB = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const payloadForBackend = transformProfileForBackend(data);

      // [FIX] Suppression du prÃƒÂ©fixe /api redondant
      const res = await fetch(`${API_BASE_URL}/cv/me/profile`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadForBackend)
      });
      if (res.ok) {
        setLastSaveTime(new Date());
      }
    } catch (e) {
      console.error("[AUTO-SAVE] Echec de la sauvegarde en arriere-plan:", e);
    }
  };

  // --- Effet Debounce pour Sauvegarder Progressivement ---
  useEffect(() => {
    // On ignore le tout premier rendu pour ne pas ÃƒÂ©craser la BDD avec des donnÃƒÂ©es vides
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // On ne sauvegarde pas si l'utilisateur n'est pas co ou si les donnÃƒÂ©es chargent
    if (!isAuthenticated || isProfileLoading || !cvData || Object.keys(cvData).length === 0) return;

    // Le "Debounce" : on attend 1.5s d'inactivitÃƒÂ© avant de faire l'appel rÃƒÂ©seau
    const timer = setTimeout(() => {
      saveProfileToDB(cvData);
    }, 1500);

    // Nettoyage : si l'utilisateur re-tape dans les 1.5s, on annule le timer prÃƒÂ©cÃƒÂ©dent
    return () => clearTimeout(timer);
  }, [cvData, isAuthenticated, isProfileLoading]);

  // --- LOGIQUE DE CHARGEMENT ---
  const loadProfile = async () => {
    setIsProfileLoading(true);
    try {
      // [FIX] Removed redundant /api prefix
      const response = await authenticatedFetch(`${API_BASE_URL}/cv/me/profile`);
      if (response.ok) {
        const rawProfileData = await response.json();
        if (rawProfileData && Object.keys(rawProfileData).length > 0) {
          const frontendData = transformProfileForFrontend(rawProfileData);
          setFormData(frontendData);
          if ((frontendData as any).target_language) { i18n.changeLanguage((frontendData as any).target_language.toLowerCase()); }

          const hasImportedProfileData = !!(
            normalizeText((frontendData as any).first_name) ||
            normalizeText((frontendData as any).last_name) ||
            normalizeText((frontendData as any).target_job) ||
            normalizeText((frontendData as any).target_company) ||
            normalizeText((frontendData as any).target_industry) ||
            normalizeText((frontendData as any).job_description) ||
            normalizeText((frontendData as any).bio) ||
            (Array.isArray((frontendData as any).experiences) && (frontendData as any).experiences.length > 0) ||
            (Array.isArray((frontendData as any).educations) && (frontendData as any).educations.length > 0)
          );

          if (!hasImportedProfileData) {
            setOnboardingCompleted(false);
            setCurrentStep(0);
          } else {
            const firstIncompleteStep = getFirstIncompleteStep(frontendData);
            const done = firstIncompleteStep === 8;
            setOnboardingCompleted(done);
            setCurrentStep(done ? 8 : firstIncompleteStep);
          }

          setLastSaveTime(new Date()); // On met ÃƒÂ  jour l'heure de sauvegarde avant la redirection potentielle
        }
      } else if (response.status === 404) {
        resetDashboard(); // Le hook gÃƒÂ¨re la rÃƒÂ©initialisation ÃƒÂ  INITIAL_DATA
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        setCurrentStep(1);
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        navigate('/', { replace: true });
      }
    } catch (e) {
      console.error("[PROFIL] Fatal error during fetch:", e);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // --- IMPORT CV / LINKEDIN ---
  const handleCVImport = async (payload: File | string) => {
    setIsImportLoading(true);
    try {
      const uploadData = new FormData();
      if (typeof payload === "string") {
        uploadData.append('raw_text', payload);
      } else {
        uploadData.append('file', payload);
      }
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/cv/parse-cv`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: uploadData
      });
      if (!res.ok) throw new Error("Erreur d'analyse du document");
      const parsedData = await res.json();
      const frontendData = transformProfileForFrontend(parsedData);
      setFormData((prev: any) => ({ ...prev, ...frontendData }));
      setToasts(prev => [...prev, { id: Date.now(), text: "Données extraites avec succès !" }]);
      setCurrentStep(1);
    } catch (e) {
      console.error(e);
      setToasts(prev => [...prev, { id: Date.now(), text: "Échec de l'import." }]);
    } finally {
      setIsImportLoading(false);
    }
  };

  // --- EFFETS DE BORD ---
  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);

      const storedUser = localStorage.getItem('user');
      let user = null;
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
          user = JSON.parse(storedUser);
        } catch (e) {
          console.warn("Could not parse user from localStorage", e);
        }
      }

      loadProfile();
      
      try {
        const isTester = user.is_admin || user.is_tester;
        const isExpired = !isTester && (user.subscription_status === 'expired' || (user.subscription_expiration_date && new Date(user.subscription_expiration_date) < new Date()));
        setIsFrozen(isExpired);
      } catch (e) { console.warn("Could not parse user subscription", e); }
      
    } else if (localStorage.getItem('token')) {
      setIsAuthenticated(true);
    } else {
      setIsProfileLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!cvData || !isAuthenticated) return;
    const isDone = getFirstIncompleteStep(cvData) === 8;
    setOnboardingCompleted(isDone);
    if ((currentStep === 8 || isDone) && (cvData?.target_company || cvData?.target_job)) {
      upsertTargetTree(cvData?.target_company, cvData?.target_job);
    }
  }, [cvData?.target_company, cvData?.target_job, currentStep, isAuthenticated, upsertTargetTree]);

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem('btcv_target_tree', JSON.stringify(targetTree));
    } catch {
      // non-blocking
    }
  }, [targetTree, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    hydrateTargetTreeFromApplications();
  }, [isAuthenticated, quotaRefreshToken, hydrateTargetTreeFromApplications]);

  useEffect(() => {
    if (researchResult || gapResult) {
      setQuotaRefreshToken(token => token + 1);
    }
  }, [researchResult, gapResult]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLatestQuotas();
    const interval = setInterval(fetchLatestQuotas, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchLatestQuotas]);

  // --- RESTAURATION DE CANDIDATURE (Depuis Mes Documents) ---
  useEffect(() => {
    if (isAuthenticated) {
      const restoredDataStr = sessionStorage.getItem('restored_application_data');
      if (restoredDataStr) {
        try {
          const parsedData = JSON.parse(restoredDataStr);
          setRestoredData(parsedData);
          setCurrentStep(8); // Redirection immediate vers le Dashboard
          setToasts(prev => [...prev, { id: Date.now(), text: "Dossier de candidature restaure avec succes." }]);
        } catch (e) {
          console.error("Erreur de parsing des donnees restaurees", e);
        }
        sessionStorage.removeItem('restored_application_data');
      }
    }
  }, [isAuthenticated, setCurrentStep, setToasts]);

  // Nettoyage de l'archive si le candidat lance une toute nouvelle analyse
  useEffect(() => {
    if (globalStatus === 'STARTING') {
      setRestoredData(null);
    }
  }, [globalStatus]);



  // [FIX EXPERT] Interception globale pour forcer l'ouverture de la page de paiement dans un nouvel onglet
  // Cela evite de perdre le contexte de l'application (ex: une reponse vocale en cours d'evaluation)
  // lorsque l'utilisateur clique sur une proposition de recharge.
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href && link.href.includes('/payment') && link.target !== '_blank') {
        e.preventDefault();
        window.open(link.href, '_blank');
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- LOGIQUE DE CACHE (DIRTY CHECK) ---
  const getCoreDataSignature = (data: any) => {
    if (!data) return "";
    return JSON.stringify({
      current_role: data.current_role,
      current_company: data.current_company,
      target_job: data.target_job,
      target_company: data.target_company,
      target_industry: data.target_industry,
      target_country: data.target_country,
      target_language: data.target_language,
      interview_type: data.interview_type,
      interview_format: data.interview_format,
      experiences: data.experiences,
      educations: data.educations,
      skills: data.skills,
      flaws: data.flaws,
      languages: data.languages,
      free_text: data.free_text,
      job_description: data.job_description
    });
  };

  // --- RENDU DES ETAPES ---
  const renderStepContent = () => {
    if (isProfileLoading) return <LoadingScreen title={t('loading_profile_title', "Chargement de votre profil...")} description={t('loading_profile_desc', "Récupération de vos données sécurisées...")} />;

    switch(currentStep) {
      case 0: return (
        <div className="step-wrapper">
          <StepImport onUpload={handleCVImport} loading={isImportLoading} />
          {/* [FIX] Bouton secondaire repousse a droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-outline" onClick={() => setCurrentStep(1)}>{t('or_fill_manually', 'Ou remplir manuellement')}</button></div>
        </div>);
      case 1: return (
        <div className="step-wrapper">
          <StepProfile data={cvData || {}} onChange={handleChange} />
          {/* [FIX] Alignement propre avec le bouton reset pousse a gauche (marginRight: 'auto') et les autres a droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => resetDashboard()} style={{ marginRight: 'auto' }}><RotateCcw size={16} style={{ marginRight: '0.5rem' }}/>{t('btn_reset')}</button>
            {lastSaveTime && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {t('last_saved_at', 'Sauvegardé à')} {lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-secondary" onClick={loadProfile}><RefreshCw size={16} style={{ marginRight: '0.5rem' }}/>{t('btn_sync', 'Synchroniser')}</button>
            <button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button>
          </div>
        </div>);
      case 2: return (
        <div className="step-wrapper">
          {/* Bloc quota permanent */}
          <PackStatusWidget
            onQuotasLoaded={handleQuotasLoaded}
            refreshToken={quotaRefreshToken}
          />
          <StepTarget data={cvData || {}} onChange={(key, val) => {
            handleChange(key, val);
            if (stepErrors[key]) setStepErrors(prev => ({ ...prev, [key]: false }));
          }} errors={stepErrors} loading={globalStatus === "STARTING"} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn-primary" onClick={handleTargetAnalysisContinue} disabled={globalStatus === "STARTING" || isCheckingAnalysisPreview}>
              {isCheckingAnalysisPreview ? <><Loader2 size={16} className="spin" style={{ marginRight: '0.5rem' }} />Verification...</> : t('btn_next')}
            </button>
          </div>
          {showConfirmModal && analysisPreview && (
            <ConfirmAnalysisModal
              companyName={cvData?.target_company || ''}
              quotas={currentQuotas}
              preview={analysisPreview}
              onCancel={() => {
                setShowConfirmModal(false);
                setAnalysisPreview(null);
              }}
              onConfirm={async () => {
                setShowConfirmModal(false);
                setAnalysisPreview(null);
                handleChange('last_target_analysis_signature', getTargetAnalysisSignature(cvData));
                if ((analysisPreview?.costs?.entreprises || 0) > 0) {
                  markCompanyConfirmationSeen(cvData);
                }
                await handleNextStep();
              }}
            />
          )}
        </div>);
      case 3: return (
        <div className="step-wrapper">
          <StepEducation list={cvData?.educations || []} onAdd={() => handleAddList('educations', { degree: '', school: '', year: '' })} onRemove={(id: number) => handleRemoveList('educations', id)} onUpdate={(id: number, field: string, val: any) => handleUpdateList('educations', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button></div>
        </div>);
      case 4: return (
        <div className="step-wrapper">
          <StepExperience list={cvData?.experiences || []} onAdd={() => handleAddList('experiences', { role: '', company: '', description: '' })} onRemove={(id: number) => handleRemoveList('experiences', id)} onUpdate={(id: number, field: string, val: any) => handleUpdateList('experiences', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button></div>
        </div>);
    case 5:
        if (["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)) return <LoadingScreen title={t('loading_strat_title', "Creation de votre profil strategique...")} description={t('loading_strat_desc', "Analyse de vos experiences et exigences du marche...")} />;
        return (
          <div className="step-wrapper">
          <StepQualitiesFlaws data={cvData || {}} onChange={handleChange} successes={[]} onAddSuccess={() => {}} onUpdateSuccess={() => {}} failures={[]} onAddFailure={() => {}} onUpdateFailure={() => {}} />
            {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('generation_error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
            <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                className="btn-primary" 
                onClick={(e) => { 
                  if (isFrozen) { 
                    e.preventDefault(); 
                    setShowPaywall(true); 
                  } else { 
                    const currentSignature = getCoreDataSignature(cvData);
                    // Si la signature n'a pas changÃƒÂ© et que nous avons dÃƒÂ©jÃƒÂ  des questions
                    if (cvData?.clarifications?.length > 0 && cvData?.last_clarification_signature === currentSignature) {
                    setCurrentStep(7); // On bypass le handleNextStep (pas d'appel API)
                    } else {
                      // Sinon, on sauvegarde la nouvelle signature et on lance l'IA
                      handleChange('last_clarification_signature', currentSignature);
                      handleNextStep(); 
                    }
                  } 
                }} 
                disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}
              >
                {["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('generating') : t('btn_generate_questions')}
              </button>
            </div>
          </div>);
    case 6:
      // [FIX EXPERT] Composant fantÃƒÂ´me pour rÃƒÂ©aligner la machine ÃƒÂ  ÃƒÂ©tats du DashboardContext
      return <Step6Ghost onNext={handleNextStep} t={t} />;
    case 7: 
        const clarificationAnswers = (cvData?.clarifications || []).reduce((acc: any, curr: any) => {
          if (curr.answer) acc[curr.id] = curr.answer;
          return acc;
        }, {});
        
        return (
        <div className="step-wrapper">
          <StepClarification clarifications={cvData?.clarifications || []} answers={clarificationAnswers} onAnswer={(id: any, val: any) => handleChange("clarifications", (cvData?.clarifications || []).map((c: any) => c.id === id ? { ...c, answer: val } : c))} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={(e) => { if (isFrozen) { e.preventDefault(); setShowPaywall(true); } else { handleNextStep(); } }} disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>{["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('btn_launching') : t('btn_launch_full_analysis')}</button></div>
        </div>);
    case 8: return (
        <div className="step-wrapper dashboard-wrapper">
          <TabProvider 
            initialCvData={cvData} 
            initialGapResult={restoredData?.gapResult || gapResult} 
            initialActionPlanResult={restoredData?.actionPlanResult || actionPlanResult} 
            initialResearchResult={restoredData?.researchResult || researchResult} 
            initialSalaryResult={restoredData?.salaryResult || salaryResult}
            initialJobDecoderResult={restoredData?.jobDecoderResult || (cvData as any)?.job_decoder_result || jobDecoderResult} 
            initialPitchResult={restoredData?.pitchResult || (cvData as any)?.pitch_result || pitchResult} 
            initialQuestionsResult={restoredData?.questionsResult || questionsResult} 
            initialRecruiterResult={restoredData?.recruiterResult || recruiterResult} 
            initialRealityResult={restoredData?.realityResult || realityResult} 
            initialFlawCoachingResult={restoredData?.flawCoachingResult || flawCoachingResult} 
            initialCustomScenariosResult={restoredData?.customScenariosResult || customScenariosResult} 
            initialGlobalStatus={restoredData ? "COMPLETED" : globalStatus} 
            onSetCurrentStep={setCurrentStep} 
            onTriggerResearch={triggerResearch}
            onUpdateFormData={handleChange}
          >
            <DashboardView
              remainingSessions={currentQuotas?.credits}
              remainingCompanies={currentQuotas?.entreprises}
              remainingOffers={currentQuotas?.offres}
              profileCompletion={getProfileCompletion(cvData)}
              profileRecommendations={getProfileRecommendations(cvData)}
              targetTree={targetTree}
              onPrepareCandidature={(company: string, job: string) => {
                setFormData((prev: any) => ({
                  ...(prev || {}),
                  target_company: company,
                  target_job: job,
                }));
                setShowLanding(false);
                setCurrentStep(8);
                setActiveTab('overview');
              }}
              onCreateCandidature={handleStartNewApplication}
            />
            {/* Exemple d'intÃƒÂ©gration si vous appelez ApplicationDossier depuis App.tsx : */}
            {/* <ApplicationDossier onGoToTraining={() => { setActiveTab('training'); setCurrentStep(8); }} /> */}
          </TabProvider>
        </div>);
      default: return null;
    }
  };

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleStartNewCompany = () => {
    setShowLanding(false);
    setCurrentStep(2);
    setFormData((prev: any) => ({
      ...(prev || {}),
      target_company: '',
      target_job: '',
      job_description: '',
    }));
  };

  const handleStartNewApplication = () => {
    setShowNewApplicationModal(true);
    setSelectedCompanyForApplication('');
    setNewCompanyForApplication('');
    setNewJobForApplication('');
  };

  const handleConfirmNewApplication = () => {
    const chosenCompany = normalizeText(newCompanyForApplication) || normalizeText(selectedCompanyForApplication);
    const chosenJob = normalizeText(newJobForApplication);

    if (!chosenCompany) {
      setToasts(prev => [...prev, { id: Date.now(), text: 'Sélectionnez ou créez une entreprise avant de continuer.' }]);
      return;
    }
    if (!chosenJob) {
      setToasts(prev => [...prev, { id: Date.now(), text: 'Renseignez un intitulé de candidature/poste.' }]);
      return;
    }

    upsertTargetTree(chosenCompany, chosenJob);
    setFormData((prev: any) => ({
      ...(prev || {}),
      target_company: chosenCompany,
      target_job: chosenJob,
      job_description: '',
    }));

    setShowNewApplicationModal(false);
    setShowLanding(false);
    setCurrentStep(2);
  };

  const handleSelectTargetNode = (company: string, job?: string) => {
    setFormData((prev: any) => ({
      ...(prev || {}),
      target_company: company,
      target_job: job || prev?.target_job || '',
    }));
    setCurrentStep(onboardingCompleted ? 8 : 2);
  };

  const LegalComponent = showCGU ? CGU : showPrivacy ? PrivacyPolicy : showLegal ? LegalNotice : null;
  const closeLegal = () => { setShowCGU(false); setShowPrivacy(false); setShowLegal(false); };
  if (LegalComponent) return (
    <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={closeLegal} className="btn-outline" style={{ marginBottom: '2rem' }}>{'<- Retour'}</button><LegalComponent /></main></div>);

  if (showAdmin) return (
    <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={() => setShowAdmin(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>{'<- Retour'}</button><AdminFeedbacks /></main></div>);

  // Interception de la route pour le mot de passe oubliÃƒÂ©
  if (location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  // [FIX] SÃƒÂ©curisation du parsing JSON du nom d'utilisateur pour ÃƒÂ©viter la page blanche au login
  let parsedUserName = undefined;
  let isAdmin = false;
  if (isAuthenticated) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
          const u = JSON.parse(storedUser);
          parsedUserName = u.first_name || u.name || t('default_candidate_name', "Candidat");
          isAdmin = !!u.is_admin;
      }
    } catch (e) {
        parsedUserName = t('default_candidate_name', "Candidat");
    }
      if (cvData?.first_name) {
        parsedUserName = cvData.first_name;
      }
  }

  // [FIX] S'assurer que le prÃƒÂ©nom commence toujours par une majuscule dans le Header
  if (parsedUserName && typeof parsedUserName === 'string') {
    parsedUserName = parsedUserName.charAt(0).toUpperCase() + parsedUserName.slice(1);
  }

  // Interception de la route pour l'interface Administrateur
  if (location.pathname === '/admin') {
    if (!isAuthenticated) {
      return (
        <div className="app-container">
          <main className="main-content" style={{ paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <Login onLoginSuccess={() => {
              setIsAuthenticated(true);
              const userStr = localStorage.getItem('user');
              if (userStr && userStr !== 'undefined') {
                const user = JSON.parse(userStr);
                if (user.is_admin) {
                  navigate('/admin', { replace: true });
                } else {
                  navigate('/candidate', { replace: true });
                }
              } else {
                // Fallback for safety
                navigate('/candidate', { replace: true });
              }
            }} />
          </main>
        </div>
      );
    }
    if (!isAdmin) {
      return (
        <div className="app-container"><main className="main-content" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--danger-text)', fontWeight: 'bold' }}>Acces refuse : Droits administrateur requis.</main></div>
      );
    }
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          {/* [NOUVEAU] Ajout de la navigation admin */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <button onClick={() => navigate('/admin')} className="btn-ghost">Dashboard</button>
            <button onClick={() => navigate('/admin/users')} className="btn-ghost">Utilisateurs</button>
            <button onClick={() => navigate('/admin/billing')} className="btn-ghost">Facturation</button>
            <button onClick={() => navigate('/admin/generations')} className="btn-ghost">Generations IA</button>
            <button onClick={() => navigate('/admin/feedbacks')} className="btn-ghost">Feedbacks</button>
            <button onClick={() => navigate('/admin/audit-logs')} className="btn-ghost">Audit Logs</button>
          </div>

          <button onClick={() => navigate('/candidate')} className="btn-outline" style={{ marginBottom: '2rem' }}>{'<- Retour a l\'application'}</button>
          <AdminDashboard />
        </main>
      </div>
    );
  }

  // [NOUVEAU] Routes admin specifiques
  if (location.pathname.startsWith('/admin/')) {
    if (!isAuthenticated || !isAdmin) {
      return <div className="app-container"><main className="main-content" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--danger-text)', fontWeight: 'bold' }}>Acces refuse.</main></div>;
    }
    
    let AdminComponent;
    if (location.pathname === '/admin/users') AdminComponent = AdminUsers;
    else if (location.pathname === '/admin/billing') AdminComponent = AdminBilling;
    else if (location.pathname === '/admin/generations') AdminComponent = AdminGenerations;
    else if (location.pathname === '/admin/feedbacks') AdminComponent = AdminFeedbacks;
    else if (location.pathname === '/admin/audit-logs') AdminComponent = AdminAuditLogs;
    else AdminComponent = AdminDashboard;

    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <button onClick={() => navigate('/admin')} className="btn-ghost">Dashboard</button>
            <button onClick={() => navigate('/admin/users')} className="btn-ghost">Utilisateurs</button>
            <button onClick={() => navigate('/admin/billing')} className="btn-ghost">Facturation</button>
            <button onClick={() => navigate('/admin/generations')} className="btn-ghost">Generations IA</button>
            <button onClick={() => navigate('/admin/feedbacks')} className="btn-ghost">Feedbacks</button>
            <button onClick={() => navigate('/admin/audit-logs')} className="btn-ghost">Audit Logs</button>
          </div>
          <AdminComponent />
        </main>
      </div>
    );
  }

  // [NOUVEAU] Routes admin specifiques
  if (location.pathname.startsWith('/admin/')) {
    if (!isAuthenticated || !isAdmin) {
      return <div className="app-container"><main className="main-content" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--danger-text)', fontWeight: 'bold' }}>Acces refuse.</main></div>;
    }
    
    let AdminComponent;
    if (location.pathname === '/admin/users') AdminComponent = AdminUsers;
    else if (location.pathname === '/admin/billing') AdminComponent = AdminBilling;
    else if (location.pathname === '/admin/generations') AdminComponent = AdminGenerations;
    else if (location.pathname === '/admin/feedbacks') AdminComponent = AdminFeedbacks;
    else if (location.pathname === '/admin/audit-logs') AdminComponent = AdminAuditLogs;
    else AdminComponent = AdminDashboard;

    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <button onClick={() => navigate('/admin')} className="btn-ghost">Dashboard</button>
            <button onClick={() => navigate('/admin/users')} className="btn-ghost">Utilisateurs</button>
            <button onClick={() => navigate('/admin/billing')} className="btn-ghost">Facturation</button>
            <button onClick={() => navigate('/admin/generations')} className="btn-ghost">Generations IA</button>
            <button onClick={() => navigate('/admin/feedbacks')} className="btn-ghost">Feedbacks</button>
            <button onClick={() => navigate('/admin/audit-logs')} className="btn-ghost">Audit Logs</button>
          </div>
          <AdminComponent />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isAuthenticated={isAuthenticated}
        userName={parsedUserName} 
        onOpenProfile={() => setShowDocsModal(true)} 
        onOpenRemainingSessions={() => {
          setShowLanding(false);
          setCurrentStep(2);
          if (location.pathname !== '/candidate') {
            navigate('/candidate', { replace: true });
          }
        }}
        remainingSessions={currentQuotas?.credits}
        remainingCompanies={currentQuotas?.entreprises}
        remainingOffers={currentQuotas?.offres}
        onboardingCompleted={onboardingCompleted}
        onStartNewCompany={handleStartNewCompany}
        onStartNewApplication={handleStartNewApplication}
        targetTree={targetTree}
        onSelectTargetNode={handleSelectTargetNode}
        onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); resetDashboard(); setIsAuthenticated(false); navigate('/login', { replace: true }); }} 
        onLanguageChange={handleLanguageChange} 
        steps={CAREER_EDGE_STEPS}
        currentStep={currentStep}
        goToStep={setCurrentStep}
      />
      <main className="main-content">
        {showLanding && !isAuthenticated ? (
          <LandingPage 
              darkMode={darkMode}
              onStart={() => navigate('/login')}
              onLoginRedirect={() => navigate('/login')}
              onShowCGU={() => setShowCGU(true)}
              onShowPrivacy={() => setShowPrivacy(true)} 
              onShowLegal={() => setShowLegal(true)} />        ) :
         !isAuthenticated ?
            <Login onLoginSuccess={(loginResponse) => {
              setIsAuthenticated(true);
              // [FIX] La redirection se base maintenant sur la reponse de l'API,
              // qui contient `role: "admin"` pour les administrateurs
              if (loginResponse?.role === 'admin') {
                navigate('/admin', { replace: true });
              } else if (loginResponse?.user?.is_admin) {
                // Fallback pour les anciens tokens ou structures
                navigate('/admin', { replace: true });
              } else if (location.state?.from) {
                navigate(location.state.from, { replace: true });
              } else {
                // Redirection par defaut pour un utilisateur standard
                navigate('/candidate', { replace: true });
              }
            }} /> :
          (<div className="candidate-layout" style={{ paddingTop: '100px', paddingBottom: '2rem' }}>
            {/* Sidebar stepper â€” visible on desktop (>= 1024px) */}
            <aside className="candidate-sidebar">
              <WizardStepper
                steps={CAREER_EDGE_STEPS}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
                orientation="vertical"
                navigationMode={onboardingCompleted}
                completedStepIds={getCompletedStepIds(cvData)}
              />
              <div className="quota-summary-desktop" style={{ marginTop: '0.9rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '0.85rem 0.9rem', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Séances d'entraînement</div>
                <div>{currentQuotas.credits} restante{currentQuotas.credits > 1 ? 's' : ''}</div>
                <div style={{ fontWeight: 700, marginTop: '0.45rem', marginBottom: '0.2rem' }}>Entreprises ciblées</div>
                <div>{targetCompaniesUsed} sur 5 utilisée{targetCompaniesUsed > 1 ? 's' : ''} - {Math.max(0, 5 - targetCompaniesUsed)} restante{Math.max(0, 5 - targetCompaniesUsed) > 1 ? 's' : ''}</div>
                <div style={{ fontWeight: 700, marginTop: '0.45rem', marginBottom: '0.2rem' }}>Offres préparées</div>
                <div>{targetOffersUsed} sur 15 utilisée{targetOffersUsed > 1 ? 's' : ''} - {Math.max(0, 15 - targetOffersUsed)} restante{Math.max(0, 15 - targetOffersUsed) > 1 ? 's' : ''}</div>
              </div>
              {onboardingCompleted && (
                <div style={{ marginTop: '0.9rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', padding: '0.85rem 0.9rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>MES CIBLES</div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.45rem' }} onClick={handleStartNewCompany}>+ Entreprise</button>
                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.45rem' }} onClick={handleStartNewApplication}>+ Candidature</button>
                  </div>
                  <div style={{ display: 'grid', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {targetTree.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aucune entreprise enregistree pour le moment.</div>
                    ) : targetTree.map((node, idx) => (
                      <details key={`${node.company}-${idx}`}>
                        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{node.company} ({node.jobs.length})</summary>
                        <div style={{ marginTop: '0.35rem', display: 'grid', gap: '0.28rem' }}>
                          <button className="btn-ghost" style={{ textAlign: 'left', fontSize: '0.75rem' }} onClick={() => handleSelectTargetNode(node.company)}>Ouvrir les candidatures de cette entreprise</button>
                          {node.jobs.map((job, jdx) => (
                            <button key={`${job}-${jdx}`} className="btn-ghost" style={{ textAlign: 'left', fontSize: '0.74rem', paddingLeft: '0.85rem' }} onClick={() => handleSelectTargetNode(node.company, job)}>{job}</button>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Horizontal stepper â€” visible on mobile / tablet (< 1024px) */}
            <div className="candidate-stepper-mobile" style={{ display: onboardingCompleted ? 'none' : undefined }}>
              <WizardStepper
                steps={CAREER_EDGE_STEPS}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
                orientation="horizontal"
                navigationMode={onboardingCompleted}
                completedStepIds={getCompletedStepIds(cvData)}
              />
            </div>

            {/* Main content */}
            <div className="candidate-content">
              <div className="card-container">{renderStepContent()}</div>
            </div>
          </div>)}
      </main>

      {isFrozen && isAuthenticated && !showLanding && !LegalComponent && !showAdmin && (
        <div className="frozen-banner"><Lock size={20} /> {t('frozen_banner_text', 'Acces expire. La generation IA est bloquee.')}<button onClick={() => setShowPaywall(true)} className="btn-reactivate">{t('btn_reactivate', 'Reactiver (30 EUR)')}</button></div>)}

      <div className="toast-container">{(toasts || []).map(t => (<div key={t.id} className="toast-notification"><LucideBell size={16} /> {t.text}<button onClick={() => removeToast(t.id)}><LucideX size={14}/></button></div>))}</div>

      {showPaywall && (
        <div className="modal-overlay">
           <div className="modal-content">
              <div className="modal-icon"><Lock size={40} color="#3b82f6" /></div>
              <h2>{t('paywall_title', 'Periode d\'acces expiree')}</h2>
              <p>{t('paywall_desc', 'Vos 3 mois d\'accès illimité sont terminés. Rassurez-vous, votre historique est sauvegardé.')}</p>
              <div className="modal-actions">
                 <button onClick={() => setShowPaywall(false)} className="btn-outline">{t('btn_later', 'Plus tard')}</button>
                 <button onClick={() => window.open('/payment?plan=renewal', '_blank')} className="btn-primary">{t('btn_unlock', 'Debloquer pour 30 EUR')}</button>
              </div>
           </div>
        </div>)}

      {showDocsModal && <DocumentsModal onClose={() => setShowDocsModal(false)} />}

      {showNewApplicationModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-icon"><Target size={40} color="#3b82f6" /></div>
            <h2>Nouvelle candidature</h2>
            <p>Choisissez une entreprise existante ou créez-en une nouvelle, puis indiquez le poste ciblé.</p>

            <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem' }}>Entreprise existante</label>
                <select
                  value={selectedCompanyForApplication}
                  onChange={(e) => {
                    setSelectedCompanyForApplication(e.target.value);
                    if (e.target.value) setNewCompanyForApplication('');
                  }}
                >
                  <option value="">Choisir une entreprise...</option>
                  {targetTree.map((node, idx) => (
                    <option key={`${node.company}-${idx}`} value={node.company}>{node.company}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>ou</div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem' }}>Nouvelle entreprise</label>
                <input
                  type="text"
                  value={newCompanyForApplication}
                  onChange={(e) => {
                    setNewCompanyForApplication(e.target.value);
                    if (e.target.value.trim()) setSelectedCompanyForApplication('');
                  }}
                  placeholder="Ex: Airbus"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem' }}>Intitulé du poste / candidature</label>
                <input
                  type="text"
                  value={newJobForApplication}
                  onChange={(e) => setNewJobForApplication(e.target.value)}
                  placeholder="Ex: Directeur cybersécurité"
                />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
              <button onClick={() => setShowNewApplicationModal(false)} className="btn-outline">Annuler</button>
              <button onClick={handleConfirmNewApplication} className="btn-primary">Créer la candidature</button>
            </div>
          </div>
        </div>
      )}

      {/* [FIX] Alignement centrÃƒÂ© et aÃƒÂ©rÃƒÂ© du Footer rÃƒÂ©glementaire */}
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        {isAdmin && (
          <>
            <button className="btn-ghost" onClick={() => navigate('/admin')}>Dashboard Admin</button><span className="footer-separator">|</span>
            <button className="btn-ghost" onClick={() => setShowAdmin(true)}>Feedbacks Admin</button><span>|</span>
          </>
        )}
        <button className="btn-ghost" onClick={() => setShowLegal(true)}>{t('footer_legal', 'Mentions Légales')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowCGU(true)}>{t('footer_cgu', 'CGU')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowPrivacy(true)}>{t('footer_privacy', 'Politique de Confidentialite')}</button>
      </footer>
    </div>
  );
}

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;

