import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo, FC } from 'react';
import { useDashboard } from '../hooks/DashboardContext';
import {
  Activity,
  Target,
  AlertTriangle,
  MessageSquare,
  FileText,
  Globe,
  Compass,
  Mic,
  Search,
  Eye,
  Navigation,
  Network,
  Loader2,
  RotateCcw,
  CheckSquare,
  Dumbbell,
  ArrowUp,
  Printer,
  Building,
  ShieldAlert,
  Calendar,
  UserCheck,
  Monitor,
  HeartPulse,
  Zap,
  Award,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  ChevronRight,
  Plus,
  Layers,
  TrendingUp,
  Briefcase,
  Play,
  HelpCircle,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PilotBento } from './PilotBento';
import { GapAnalysisFull } from './GapAnalysisFull';
import { InterviewTab } from './InterviewTab';
import { AnalysisTab } from './AnalysisTab';
import { JobDecoder } from './JobDecoder';
import { CareerRealityCheck } from './CareerRealityCheck';
import { CareerRadar } from './CareerRadar';
import { CareerGPS } from './CareerGPS';
import { CockpitTab } from './CockpitTab';
import { RecruiterView } from './RecruiterView';
import FlawCoaching from './FlawCoaching';
import TrainingTab from './TrainingTab';
import { PrintableDossier } from './PrintableDossier';
import { CoachingSummaryCard } from './CoachingSummaryCard';
import { StrategicProfileTab } from './StrategicProfileTab';
import { DashboardCard } from './DashboardCard';
import Gauge from './Gauge';
import { CompanyAnalysisCard } from './CompanyAnalysisCard';
import { MarketAnalysisCard } from './MarketAnalysisCard';
import { SituationSimulator } from './SituationSimulator';
import { VocalPitchTrainer } from './VocalPitchTrainer';
import Questionnaire from './Questionnaire';
import ObservedQuestionsPanel from './ObservedQuestionsPanel';
import { ApplicationKeyMessagesView } from './ApplicationKeyMessagesView';
import { SensitiveSituationsCard } from './SensitiveSituationsCard';
import { ModuleProvider } from '../context/ModuleContext';
import RoadmapGeneratorModal from './RoadmapGeneratorModal';
import { 
  PostureDataCard, 
  LastHourChecklistCard, 
  StrategicQuestionsCard, 
  SignalsToObserveCard, 
  PostureGuidesCard, 
  ContingencyPlanCard 
} from './PostureTab';
const DebriefTab = lazy(() => import('./DebriefTab'));
const PostureTab = lazy(() => import('./PostureTab'));

interface DeliverableItem {
  name: string;
  tab: string;
  anchor: string;
  data: any;
  icon: JSX.Element;
  disabled?: boolean;
  disabledReason?: string;
}

// --- Composant pour la pratique du Pitch ---
const PitchPractice = ({ title, pitchText, onSave }: { title: string, pitchText: string, onSave: (text: string) => void }) => {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(pitchText);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setTranscript('');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = i18n.language;
      recognitionRef.current.onresult = (event: any) => {
        const interimTranscript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
        setEditedText((prev: string) => prev ? `${prev} ${interimTranscript}` : interimTranscript);
      };
      recognitionRef.current.start();
    }
  }, [i18n.language]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleSave = () => {
    onSave(editedText);
    setIsEditing(false);
  };

  return (
    <div className="pitch-practice-card"></div>
  );
};


// --- STATIC DATA ---
const moduleColors: Record<string, string> = {
  overview: '#102E5C',
  job: '#2563EB',
  company: '#B8325A',
  speech: '#8B3FD1',
  training: '#E89112',
  progress: '#168A5B'
};

const moduleNames: Record<string, string> = {
  overview: 'Centre de préparation',
  job: '1. Comprendre le poste',
  company: '2. Comprendre l\'entreprise',
  speech: '3. Construire le discours',
  training: '4. S\'entraîner',
  progress: '5. Progresser'
};

const subMenus: Record<string, {label: string, id: string}[]> = {
  overview: [
    { label: 'Candidature active', id: 'banner_section' },
    { label: 'Conseil d\'urgence', id: 'emergency_section' },
    { label: 'Actions prioritaires', id: 'priorities_section' },
    { label: 'Parcours de préparation', id: 'path_section' },
    { label: 'Aperçu des modules', id: 'modules_summary_section' },
    { label: 'Mes candidatures', id: 'candidatures_section' },
    { label: 'Radar de carrière', id: 'career_radar_section' },
    { label: 'GPS de carrière', id: 'career_gps_section' },
  ],
  job: [
    { label: 'Décoder l\'annonce', id: 'decoder_section' },
    { label: 'Forces & Écarts', id: 'gap_section' },
    { label: 'Vue Recruteur', id: 'recruiter_section' },
    { label: 'Signaux à observer', id: 'signals_section' }
  ],
  company: [
    { label: 'Comprendre l\'entreprise', id: 'company_section' },
    { label: 'Comprendre le marché', id: 'market_section' },
    { label: 'Guides de posture', id: 'posture_guides_section' }
  ],
  speech: [
    { label: 'Préparer mon pitch', id: 'pitch_section' },
    { label: 'Arguments clés', id: 'key_messages_section' },
    { label: 'Situations sensibles', id: 'sensitive_section' },
    { label: 'Parades aux défauts', id: 'flaws_section' },
    { label: 'Questions stratégiques', id: 'strategic_questions_section' }
  ],
  training: [
    { label: 'Questions probables', id: 'questionnaire_section' },
    { label: 'Simulations métier', id: 'training_mes_section' },
    { label: 'Entraînement oral & Rituels', id: 'oral_training_section' }
  ],
  progress: [
    { label: 'Profil stratégique', id: 'profile_graph_section' },
    { label: 'Données de posture', id: 'posture_data_section' },
    { label: 'Débrief & suivi', id: 'debrief_section' },
    { label: 'Plan de progression', id: 'recommendations_section' }
  ]
};

const interviewTypeLabels: Record<string, string> = { rh: 'Ressources Humaines', manager: 'Manager / Opérationnel', tech: 'Équipe Technique', final: 'Direction (Final)' };
const formatLabels: Record<string, string> = { visio: 'Visioconférence', phone: 'Téléphone', onsite: 'En Présentiel' };

const getQuestionsArray = (data: any): any[] => {
  if (!data) return [];
  let actualData = data.result !== undefined ? data.result : data;
  let depth = 0;
  while (typeof actualData === 'string' && depth < 5) {
    try {
      const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      actualData = JSON.parse(match ? match[1] : actualData);
      depth += 1;
    } catch {
      break;
    }
  }
  if (Array.isArray(actualData)) return actualData;
  const payload = actualData?.interview_questions_result || actualData?.interview_questions || actualData;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.questions)) return payload.questions;
  return [];
};

interface DashboardViewProps {
  remainingSessions?: number;
  remainingCompanies?: number;
  remainingOffers?: number;
  profileCompletion?: number;
  profileRecommendations?: string[];
  targetTree?: Array<{ company: string; jobs: string[] }>;
  onPrepareCandidature?: (company: string, job: string) => void;
  onCreateCandidature?: () => void;
}

export const DashboardView: FC<DashboardViewProps> = ({ remainingSessions, remainingCompanies, remainingOffers, profileCompletion, profileRecommendations, targetTree = [], onPrepareCandidature, onCreateCandidature }) => {
  const { t } = useTranslation();
  const dashboard: any = useDashboard();
  const {
    activeTab,
    setActiveTab,
    pilotData,
    isPilotLoading,
    cvData,
    fetchPilotData,
    researchResult,
    salaryResult,
    setCurrentStep,
    jobDecoderResult,
    recruiterResult,
    realityResult,
    flawCoachingResult,
    globalStatus,
    triggerResearch,
    pitchResult,
    questionsResult,
    gapResult,
    customScenariosResult,
    actionPlanResult,
    careerGpsResult,
    careerRadarResult,
    taskIds,
  } = dashboard;

  const pilotError = dashboard?.pilotError ?? dashboard?.error ?? null;

  // [FIX] Le spinner d'une carte ne doit dépendre que de sa propre tâche,
  // pas du statut global. Sinon toutes les cartes tournent dès qu'une tâche
  // quelconque est en cours.
  const isMarketResearchRunning = !!taskIds?.market_research;

  // --- GESTION DES NOTIFICATIONS ---
  const [viewedTabs, setViewedTabs] = useState<string[]>(['cockpit']);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [candidatureFilter, setCandidatureFilter] = useState<'all' | 'active' | 'done'>('all');
  const [candidatureSort, setCandidatureSort] = useState<'recent' | 'alpha'>('recent');
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  
  // --- GESTION DE L'IMPRESSION ---
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelection, setPrintSelection] = useState({
    pitch: true, questions: true, mes: true, flaws: true,
    gap: true, research: true, decoder: true, todo: true
  });
  const togglePrintSelection = (key: keyof typeof printSelection) => {
    setPrintSelection(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const handlePrintConfirm = () => {
    setIsPrintModalOpen(false);
    // On laisse le temps à React de passer les props au composant caché avant de déclencher l'impression
    setTimeout(() => window.print(), 300);
  };

  const handleTabChange = useCallback((tab: string, anchor?: string) => {
    let targetTab = tab;
    if (tab === 'cockpit') targetTab = 'overview';
    else if (tab === 'profile') targetTab = 'progress';
    else if (tab === 'interview') targetTab = 'speech';
    else if (tab === 'market') {
      if (anchor === 'company_section' || anchor === 'market_section' || anchor === 'culture_section') targetTab = 'company';
      else targetTab = 'job';
    }
    else if (tab === 'posture' || tab === 'debrief') targetTab = 'progress';

    (setActiveTab as any)(targetTab);
    if (!viewedTabs.includes(targetTab)) {
      setViewedTabs(prev => [...prev, targetTab]);
    }

    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setActiveTab, viewedTabs]);

  // --- ECOUTEUR GLOBAL POUR LE BOUTON "MES DOCUMENTS" DU HEADER ---
  useEffect(() => {
    const handleOpenPrint = () => setIsPrintModalOpen(true);
    window.addEventListener('open-print-modal', handleOpenPrint);
    return () => window.removeEventListener('open-print-modal', handleOpenPrint);
  }, []);

  useEffect(() => {
    const handleGoTraining = () => {
      handleTabChange('training');
      setTimeout(() => {
        const el = document.getElementById('training_section');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 110;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    };

    window.addEventListener('btcv-go-training', handleGoTraining);
    return () => window.removeEventListener('btcv-go-training', handleGoTraining);
  }, [handleTabChange]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isProcessing = globalStatus === "PROCESSING" || globalStatus === "STARTING";

  // --- GESTION DES TIMEOUTS ET MESSAGES DE PATIENCE ---
  const [longLoading, setLongLoading] = useState(false);
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isProcessing) {
      // Déclenche un message rassurant après 15 secondes pour éviter la frustration
      timeoutId = setTimeout(() => setLongLoading(true), 15000);
    } else {
      setLongLoading(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isProcessing]);

  // Vérification stricte de la disponibilité des données pour éviter les "faux positifs" sur des objets/tableaux vides
  const isDataReady = (data: any) => {
    if (!data) return false;
    if (data.status === "pending" || data.status === "PENDING" || data.status === "processing") return false;
    if (data.error) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return false;
      return Object.values(data).some(val => val !== null && val !== undefined);
    }
    return true;
  };

  // --- EXTRACTION DU CONTEXTE CANDIDAT ---
  // [FIX] Fusionne les métadonnées et les champs racine : interview_date, format et type
  // peuvent être stockés directement dans cvData ou dans cvData.meta. On privilégie
  // la valeur la plus spécifique (meta) si elle existe, sans écraser les champs racine.
  const meta = { ...cvData, ...(cvData?.meta || {}) };

  // Détection du Mode Commando (Entretien dans < 48h)
  const getDaysUntilInterview = (dateStr: string): number => {
    if (!dateStr) return 999;
    const lowerStr = dateStr.toLowerCase().trim();
    
    // 1. Détection des chaînes relatives
    if (lowerStr.includes("aujourd'hui") || lowerStr.includes("today") || lowerStr.includes("ce jour")) return 0;
    if (lowerStr.includes("demain") || lowerStr.includes("tomorrow") || lowerStr.includes("24h") || lowerStr.includes("24 h")) return 1;
    if (lowerStr.includes("48h") || lowerStr.includes("48 h") || lowerStr.includes("2 jours") || lowerStr.includes("2 days")) return 2;
    
    // 2. Détection des dates exactes (YYYY-MM-DD ou DD/MM/YYYY)
    let match = lowerStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    let parsedDate: Date | null = null;
    if (match) {
      parsedDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    } else {
      match = lowerStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) parsedDate = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      parsedDate.setHours(0, 0, 0, 0);
      const diffTime = parsedDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 999;
  };
  const isCommando = useMemo(() => getDaysUntilInterview(meta.interview_date || "") <= 2, [meta.interview_date]);
  const commandoReason = t('commando_disabled_reason', "Désactivé (Urgence : Entretien imminent)");

  const hasJobDesc = !!(cvData?.job_description && cvData.job_description.trim().length > 0);
  const hasDecoderResult = !!jobDecoderResult;

  const normalizeText = (value: any) => String(value || '').trim().toLowerCase();
  const isCurrentTarget = (company: string, job: string) => {
    return normalizeText(company) === normalizeText(cvData?.target_company) && normalizeText(job) === normalizeText(cvData?.target_job);
  };

  const currentTrainingCount =
    (Array.isArray(cvData?.trainingHistory) ? cvData.trainingHistory.length : 0) +
    (Array.isArray(cvData?.interviewHistory) ? cvData.interviewHistory.length : 0) +
    (Array.isArray(cvData?.negotiationHistory) ? cvData.negotiationHistory.length : 0);

  const currentLastInterview = meta.interview_date
    ? String(meta.interview_date)
    : '—';

  const currentAnalysisDone = Boolean(researchResult || gapResult || jobDecoderResult || pitchResult || questionsResult);

  const candidatureCards = useMemo(() => {
    const base = targetTree.flatMap((node, companyIdx) =>
      (node.jobs || []).map((job, jobIdx) => {
        const current = isCurrentTarget(node.company, job);
        const done = current ? currentAnalysisDone : false;
        return {
          key: `${node.company}-${job}-${companyIdx}-${jobIdx}`,
          company: node.company,
          job,
          done,
          trainings: current ? currentTrainingCount : 0,
          lastInterview: current ? currentLastInterview : '—',
          statusLabel: current
            ? (done ? 'Analyse terminée' : (isProcessing ? 'Analyse en cours' : 'Analyse à lancer'))
            : 'Analyse à lancer',
          order: companyIdx * 1000 + jobIdx,
        };
      })
    );

    let filtered = base;
    if (candidatureFilter === 'done') filtered = filtered.filter((c) => c.done);
    if (candidatureFilter === 'active') filtered = filtered.filter((c) => !c.done);

    if (candidatureSort === 'alpha') {
      filtered = [...filtered].sort((a, b) => `${a.company} ${a.job}`.localeCompare(`${b.company} ${b.job}`, 'fr'));
    } else {
      filtered = [...filtered].sort((a, b) => b.order - a.order);
    }
    return filtered;
  }, [targetTree, candidatureFilter, candidatureSort, cvData?.target_company, cvData?.target_job, currentAnalysisDone, currentTrainingCount, currentLastInterview, isProcessing]);

  // Nombre de nouvelles candidatures encore autorisées par le quota mensuel
  const remainingSlots = useMemo(() => {
    return Math.max(0, Math.min(remainingCompanies ?? 5, remainingOffers ?? 5));
  }, [remainingCompanies, remainingOffers]);

  // Liste de tous les livrables avec leur état
  const deliverableItems: DeliverableItem[] = useMemo(() => [
      { name: t('deliv_pitch', "Préparer mon pitch"), tab: "interview", anchor: "pitch_section", data: pitchResult, icon: <Mic size={18}/> },
      { name: t('card_interview_title', "Questions probables"), tab: "interview", anchor: "questionnaire_section", data: questionsResult, icon: <MessageSquare size={18}/> },
      { name: t('deliv_mes', "Simulations métier"), tab: "interview", anchor: "mes_anchor", data: customScenariosResult, icon: <ShieldAlert size={18}/> },
      { name: t('deliv_flaws', "Répondre à mes points faibles"), tab: "interview", anchor: "flaws_section", data: flawCoachingResult, icon: <AlertTriangle size={18}/> },
      { name: t('deliv_gap', "Mes forces et mes écarts"), tab: "market", anchor: "gap_section", data: gapResult, icon: <Target size={18}/> },
      { name: t('deliv_company', "Comprendre l'entreprise"), tab: "market", anchor: "company_section", data: researchResult, icon: <Building size={18}/> },
      { name: t('deliv_market', "Comprendre le marché"), tab: "market", anchor: "market_section", data: researchResult, icon: <Globe size={18}/> },
      { 
        name: t('deliv_decoder', "Décoder l'annonce"), 
        tab: "market", 
        anchor: "decoder_section", 
        data: jobDecoderResult, 
        icon: <Search size={18}/>,
        disabled: (!hasJobDesc && !hasDecoderResult) || (isCommando && !jobDecoderResult),
        disabledReason: (!hasJobDesc && !hasDecoderResult) ? t('card_decoder_disabled', "Annonce non renseignée. Ajoutez l'annonce dans votre profil pour l'analyser.") : (isCommando ? commandoReason : undefined)
      },
      { name: t('deliv_recruiter', "Me voir comme un recruteur"), tab: "overview", anchor: "recruiter_section", data: recruiterResult, icon: <Eye size={18}/>, disabled: isCommando && !recruiterResult, disabledReason: isCommando ? commandoReason : undefined }
    ], 
    [
      t, pitchResult, questionsResult, customScenariosResult, cvData, flawCoachingResult, 
      gapResult, researchResult, jobDecoderResult, recruiterResult, hasJobDesc, hasDecoderResult, isCommando, commandoReason
    ]
  );

  // Calcul du score global de préparation
  const prepScore = useMemo(() => {
    let score = 20; // Profil de base
    if (cvData?.target_company) score += 15;
    if (cvData?.target_job) score += 15;
    if (researchResult) score += 15;
    if (gapResult) score += 15;
    if (pitchResult) score += 10;
    if (questionsResult || customScenariosResult) score += 10;
    return Math.min(100, Math.max(30, score));
  }, [cvData, researchResult, gapResult, pitchResult, questionsResult, customScenariosResult]);

  const daysRemainingText = useMemo(() => {
    if (!meta.interview_date) return "8 jours";
    const days = getDaysUntilInterview(meta.interview_date);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Demain";
    if (days < 99) return `${days} jours`;
    return "8 jours";
  }, [meta.interview_date]);

  // Calcul des pastilles par onglet
  const hasUnseen = (tabName: string, items: any[]) => {
    if (viewedTabs.includes(tabName)) return false;
    return items.some(item => isDataReady(item));
  };
  
  const jobUnseen = hasUnseen('job', [jobDecoderResult, gapResult, recruiterResult]);
  const companyUnseen = hasUnseen('company', [researchResult, salaryResult]);
  const speechUnseen = hasUnseen('speech', [pitchResult, flawCoachingResult]);
  const trainingUnseen = hasUnseen('training', [questionsResult, customScenariosResult]);
  const progressUnseen = hasUnseen('progress', [actionPlanResult]);

  // [FIX CRITIQUE] On force le chargement du résumé si les données sont absentes pour briser la boucle de crash
  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'cockpit') && !pilotData && !pilotError && typeof fetchPilotData === 'function') {
      fetchPilotData();
    }
  }, [activeTab, pilotData, pilotError, fetchPilotData]);

  // La condition de chargement est maintenant robuste grâce à l'état explicite `isPilotLoading`
  const isLoadingOverview = isPilotLoading || (!pilotData && !pilotError);

  const activeCompany = cvData?.target_company || "THALES";
  const activeJob = cvData?.target_job || "Responsable cybersécurité opérationnelle";
  const activeDate = meta.interview_date || "Non définie";
  const activeTarget = meta.interview_type ? (interviewTypeLabels[meta.interview_type as string] || meta.interview_type) : "Manager opérationnel";
  const activeFormat = meta.interview_format ? (formatLabels[meta.interview_format as string] || meta.interview_format) : "Visio";

  const matchScore = useMemo(() => {
    if (gapResult?.match_score) return gapResult.match_score;
    if (gapResult?.matchScore) return gapResult.matchScore;
    if (gapResult?.score_adequation) return gapResult.score_adequation;
    if (gapResult?.overall_score) return gapResult.overall_score;
    if (pilotData?.matchScore) return pilotData.matchScore;
    if (pilotData?.match_score) return pilotData.match_score;
    let score = 78;
    if (cvData?.experiences?.length > 2) score += 2;
    if (cvData?.skills?.length > 3) score += 2;
    if (researchResult) score += 3;
    return Math.min(95, score);
  }, [gapResult, pilotData, cvData, researchResult]);

  const matchBreakdown = useMemo(() => ({
    skills: gapResult?.skills_score || gapResult?.skillsScore || pilotData?.skillsScore || 82,
    exp: gapResult?.experience_score || gapResult?.expScore || pilotData?.expScore || 74,
    sector: gapResult?.sector_score || gapResult?.sectorScore || pilotData?.sectorScore || 68,
    leadership: gapResult?.leadership_score || gapResult?.leadershipScore || pilotData?.leadershipScore || 88
  }), [gapResult, pilotData]);

  return (
    <div className="dashboard-wrapper">
      {/* GROUPE NAVIGATION STICKY : 6 Onglets principaux + Sous-menus collés */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: '70px', zIndex: 90, background: 'var(--bg-body)', paddingTop: '0.5rem', paddingBottom: '0.25rem', marginBottom: '1rem' }}>
        <div className={`tabs-navigation ${subMenus[activeTab] ? 'has-sub' : ''}`}>
          <button className={`tab-btn tab-btn--overview ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
            <Activity size={18} color={activeTab === 'overview' ? '#FFFFFF' : '#102E5C'} /> Centre de préparation
          </button>
          <button className={`tab-btn tab-btn--job ${activeTab === 'job' ? 'active' : ''}`} onClick={() => handleTabChange('job')} style={{ position: 'relative' }}>
            <Search size={18} color={activeTab === 'job' ? '#FFFFFF' : '#2563EB'} /> Comprendre le poste {jobUnseen && <span className="notification-dot"></span>}
          </button>
          <button className={`tab-btn tab-btn--company ${activeTab === 'company' ? 'active' : ''}`} onClick={() => handleTabChange('company')} style={{ position: 'relative' }}>
            <Building size={18} color={activeTab === 'company' ? '#FFFFFF' : '#B8325A'} /> Comprendre l'entreprise {companyUnseen && <span className="notification-dot"></span>}
          </button>
          <button className={`tab-btn tab-btn--speech ${activeTab === 'speech' ? 'active' : ''}`} onClick={() => handleTabChange('speech')} style={{ position: 'relative' }}>
            <Sparkles size={18} color={activeTab === 'speech' ? '#FFFFFF' : '#8B3FD1'} /> Construire le discours {speechUnseen && <span className="notification-dot"></span>}
          </button>
          <button className={`tab-btn tab-btn--training ${activeTab === 'training' ? 'active' : ''}`} onClick={() => handleTabChange('training')} style={{ position: 'relative' }}>
            <Dumbbell size={18} color={activeTab === 'training' ? '#FFFFFF' : '#E89112'} /> S'entraîner {trainingUnseen && <span className="notification-dot"></span>}
          </button>
          <button className={`tab-btn tab-btn--progress ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => handleTabChange('progress')} style={{ position: 'relative' }}>
            <Award size={18} color={activeTab === 'progress' ? '#FFFFFF' : '#168A5B'} /> Progresser {progressUnseen && <span className="notification-dot"></span>}
          </button>
        </div>

        {/* SOUS-MENUS COLLÉS AVEC RAPPEL STICKY DU MODULE */}
        {subMenus[activeTab] && (
          <div className={`sub-tabs-navigation sub-tabs-${activeTab}`} key={activeTab}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', paddingRight: '0.85rem', borderRight: '1px solid var(--border-color)', flexShrink: 0 }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: moduleColors[activeTab], display: 'inline-block' }}></span>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{moduleNames[activeTab]}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {subMenus[activeTab].map((sub) => (
                <button key={sub.id} className="sub-tab-btn" onClick={() => {
                  const el = document.getElementById(sub.id);
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 130;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }}>
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="tab-content">
        {/* 1. OVERVIEW: Centre de préparation */}
        {activeTab === 'overview' && (
          <ModuleProvider module="overview">
          <div className="tab-module-content tab-module-overview" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* BANDEAU SUPÉRIEUR : Candidature en cours avec 3 zones distinctes */}
            <div className="banner-card" id="banner_section">
              <div className="banner-top-badge" style={{ background: '#DCEEFF', color: '#102E5C' }}>
                <Sparkles size={14} color="#2878C8" /> Candidature en cours
              </div>
              
              <div className="banner-grid-3">
                {/* Zone Gauche: Contexte */}
                <div className="banner-col-left">
                  <h2 className="banner-title">
                    {activeCompany} — {activeJob}
                  </h2>
                  <div className="banner-meta">
                    <span><Calendar size={15} color="#2878C8" /> Entretien : {activeDate}</span>
                    <span className="banner-dot">•</span>
                    <span><UserCheck size={15} color="#2878C8" /> Interlocuteur : {activeTarget}</span>
                    <span className="banner-dot">•</span>
                    <span><Monitor size={15} color="#2878C8" /> Format : {activeFormat}</span>
                  </div>
                </div>

                {/* Zone Jauges Circulaires : Adéquation au poste & Avancement de la préparation */}
                <div className="banner-gauges-row">
                  {/* Cercle 1 : Adéquation au poste */}
                  <div className="banner-gauge-card" style={{ borderLeft: '4px solid #10B981' }}>
                    <div className="gauge-wrapper-desktop">
                      <Gauge score={matchScore} color="#10B981" size={104} strokeWidth={10} subText="%" />
                    </div>
                    <div className="gauge-wrapper-mobile">
                      <Gauge score={matchScore} color="#10B981" size={68} strokeWidth={7} subText="%" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                      <span className="indicator-label" style={{ fontSize: '0.78rem', letterSpacing: '0.06em' }}>Adéquation au poste</span>
                      <span style={{ background: matchScore >= 75 ? '#DCFCE7' : '#FFF4D6', color: matchScore >= 75 ? '#065f46' : '#92400e', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '999px', width: 'fit-content' }}>
                        {matchScore >= 75 ? 'Bon alignement' : (matchScore >= 55 ? 'Alignement moyen' : 'Écarts à combler')}
                      </span>
                      <div className="gauge-submetrics">
                        <span>Compétences : <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{matchBreakdown.skills}%</strong></span>
                        <span>Expérience : <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{matchBreakdown.exp}%</strong></span>
                        <span>Secteur : <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{matchBreakdown.sector}%</strong></span>
                        <span>Leadership : <strong style={{ color: 'var(--text-main)', fontWeight: 700 }}>{matchBreakdown.leadership}%</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Cercle 2 : Avancement de la préparation */}
                  <div className="banner-gauge-card" style={{ borderLeft: '4px solid #2878C8' }}>
                    <div className="gauge-wrapper-desktop">
                      <Gauge score={prepScore} color="#2878C8" size={104} strokeWidth={10} subText="%" />
                    </div>
                    <div className="gauge-wrapper-mobile">
                      <Gauge score={prepScore} color="#2878C8" size={68} strokeWidth={7} subText="%" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                      <span className="indicator-label" style={{ fontSize: '0.78rem', letterSpacing: '0.06em' }}>Préparation</span>
                      <span style={{ background: '#DCEEFF', color: '#102E5C', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '999px', width: 'fit-content' }}>
                        {prepScore >= 80 ? 'Prêt à postuler' : 'Préparation en cours'}
                      </span>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Temps restant : <strong style={{ color: '#2878C8', fontWeight: 800 }}>{daysRemainingText}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="banner-actions">
                {isCommando && (
                  <button className="btn-primary" style={{ background: '#EF6461', borderColor: '#EF6461' }} onClick={() => {
                    const el = document.getElementById('last_hour_section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    <Clock size={16} /> Mode J-1 / Dernière heure
                  </button>
                )}
                <button className="btn-primary" onClick={() => {
                  const el = document.getElementById('priorities_section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}>
                  <Play size={16} /> Continuer ma préparation
                </button>
                <button className="btn-secondary" onClick={() => handleTabChange('training')}>
                  <Dumbbell size={16} /> M’entraîner maintenant
                </button>
                <button className="btn-outline" onClick={() => handleTabChange('progress', 'debrief_section')}>
                  <ClipboardList size={16} /> Ajouter un débrief
                </button>
              </div>
            </div>

            {/* CONSEIL STRATÉGIQUE D'URGENCE (Court & Percutant) */}
            <div id="emergency_section" style={{ background: 'linear-gradient(135deg, #102E5C 0%, #1e3a8a 100%)', borderRadius: '1rem', padding: '1.25rem 1.6rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1.2rem', boxShadow: '0 6px 20px rgba(16,46,92,0.12)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={24} color="#F59E0B" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.05rem', fontWeight: 800, color: '#F7FAFC' }}>
                  💡 À garder en tête pour cet entretien
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, opacity: 0.95 }}>
                  {activeTarget.toLowerCase().includes('manager') || activeTarget.toLowerCase().includes('opérationnel')
                    ? "Face à un manager opérationnel, insistez sur vos résultats concrets et votre capacité à piloter une équipe. En visio, regard caméra et réponses structurées."
                    : "Face au recruteur RH, valorisez la cohérence de votre parcours, votre motivation pour l'entreprise et votre intelligence relationnelle."}
                </p>
              </div>
            </div>

            {/* FEUILLE DE ROUTE PERSONNALISÉE */}
            <div id="roadmap_section">
              <DashboardCard title="Feuille de Route Personnalisée" icon={<Compass size={24} color="var(--primary)" />}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
                  Générez un plan d'action sur-mesure en fonction du type d'entretien, de votre interlocuteur et de votre niveau de séniorité.
                </p>
                <button onClick={() => setIsRoadmapModalOpen(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} /> Ouvrir le Générateur de Feuille de Route
                </button>
              </DashboardCard>
            </div>

            {/* ACTIONS PRIORITAIRES */}
            <div className="bento-card col-span-3" id="priorities_section" style={{ background: 'var(--bg-card)' }}>
              <div className="bento-header">
                <Zap size={20} color="var(--warning)" /> Ce que vous devez travailler maintenant
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-0.4rem', marginBottom: '1.2rem' }}>
                Recommandations prioritaires de votre coach IA pour réussir cet entretien.
              </p>
              <div className="priorities-grid">
                <div className="priority-card" style={{ background: '#FFF5F5', borderColor: '#FCA5A5', borderLeft: '5px solid #EF6461' }}>
                  <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#FEE2E2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', alignSelf: 'flex-start' }}>
                    1 — PRIORITÉ HAUTE
                  </div>
                  <div className="priority-body">
                    <h4 className="priority-head">Retravailler votre réponse sur le manque d’expérience sectorielle</h4>
                    <p className="priority-why"><strong>Pourquoi :</strong> Risque probable détecté côté recruteur</p>
                  </div>
                  <button className="btn-primary-action" style={{ background: '#2878C8' }} onClick={() => handleTabChange('speech', 'flaws_section')}>
                    Lancer 3 questions ciblées <ArrowRight size={14} />
                  </button>
                </div>

                <div className="priority-card" style={{ background: '#F0F7FF', borderColor: '#BFDBFE', borderLeft: '5px solid #2878C8' }}>
                  <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#DCEEFF', color: '#1e40af', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', alignSelf: 'flex-start' }}>
                    2 — À PRÉPARER
                  </div>
                  <div className="priority-body">
                    <h4 className="priority-head">Préparer votre pitch manager en 1 minute</h4>
                    <p className="priority-why"><strong>Pourquoi :</strong> Entretien prévu avec un profil opérationnel</p>
                  </div>
                  <button className="btn-primary-action" style={{ background: '#2878C8' }} onClick={() => handleTabChange('speech', 'pitch_section')}>
                    Ouvrir la matrice de pitch <ArrowRight size={14} />
                  </button>
                </div>

                <div className="priority-card" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', borderLeft: '5px solid #10B981' }}>
                  <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#DCFCE7', color: '#065f46', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', alignSelf: 'flex-start' }}>
                    3 — À ANTICIPER
                  </div>
                  <div className="priority-body">
                    <h4 className="priority-head">Préparer 2 questions intelligentes sur l’entreprise</h4>
                    <p className="priority-why"><strong>Pourquoi :</strong> Rapport marché et enjeux récents disponibles</p>
                  </div>
                  <button className="btn-primary-action" style={{ background: '#2878C8' }} onClick={() => handleTabChange('company', 'company_section')}>
                    Voir les questions à poser <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* PARCOURS DE PRÉPARATION EN 5 BLOCS */}
            <div className="bento-card col-span-3" id="path_section" style={{ background: 'var(--bg-card)' }}>
              <div className="bento-header">
                <Layers size={20} color="var(--bleu-action)" /> Votre parcours de préparation
              </div>
              <div className="path-stepper-grid">
                <div className="path-step-card" style={{ background: '#DCFCE7', borderColor: '#10B981' }}>
                  <div className="step-header">
                    <span className="step-number" style={{ background: '#10B981' }}>1</span>
                    <span className="step-title">Comprendre le poste</span>
                    <span className="step-badge-ok">✓ OK</span>
                  </div>
                  <p className="step-detail" style={{ color: '#065f46' }}>Annonce décodée — {gapResult ? 'Écarts calculés' : 'Analyse prête'}</p>
                  <button className="step-action-btn" style={{ color: '#047857' }} onClick={() => handleTabChange('job')}>
                    Explorer le poste <ChevronRight size={14} />
                  </button>
                </div>

                <div className="path-step-card" style={{ background: '#DCFCE7', borderColor: '#10B981' }}>
                  <div className="step-header">
                    <span className="step-number" style={{ background: '#10B981' }}>2</span>
                    <span className="step-title">Comprendre l'entreprise</span>
                    <span className="step-badge-ok">✓ OK</span>
                  </div>
                  <p className="step-detail" style={{ color: '#065f46' }}>{researchResult ? 'Rapport généré — 3 actualités' : 'Rapport disponible'}</p>
                  <button className="step-action-btn" style={{ color: '#047857' }} onClick={() => handleTabChange('company')}>
                    Voir le rapport <ChevronRight size={14} />
                  </button>
                </div>

                <div className="path-step-card" style={{ background: '#FFF4D6', borderColor: 'var(--mod-training-accent)' }}>
                  <div className="step-header">
                    <span className="step-number" style={{ background: '#F59E0B' }}>3</span>
                    <span className="step-title">Construire le discours</span>
                    <span className="step-badge-warn">! À finaliser</span>
                  </div>
                  <p className="step-detail" style={{ color: '#78350f' }}>Pitch 30s prêt — Arguments à peaufiner</p>
                  <button className="step-action-btn" style={{ color: '#b45309' }} onClick={() => handleTabChange('speech')}>
                    Affiner le discours <ChevronRight size={14} />
                  </button>
                </div>

                <div className="path-step-card" style={{ background: '#DCEEFF', borderColor: '#2878C8' }}>
                  <div className="step-header">
                    <span className="step-number" style={{ background: '#2878C8' }}>4</span>
                    <span className="step-title">S'entraîner</span>
                    <span className="step-badge-blue">● En cours</span>
                  </div>
                  <p className="step-detail" style={{ color: '#1e40af' }}>12 réponses analysées sur 150</p>
                  <button className="step-action-btn" style={{ color: '#1d4ed8' }} onClick={() => handleTabChange('training')}>
                    S'entraîner <ChevronRight size={14} />
                  </button>
                </div>

                <div className="path-step-card" style={{ background: '#EEF3F8', borderColor: '#CBD5E1' }}>
                  <div className="step-header">
                    <span className="step-number" style={{ background: '#94A3B8' }}>5</span>
                    <span className="step-title">Progresser</span>
                    <span className="step-badge-gray">○ En cours</span>
                  </div>
                  <p className="step-detail" style={{ color: '#64748b' }}>Profil stratégique & Débriefs</p>
                  <button className="step-action-btn" style={{ color: '#475569' }} onClick={() => handleTabChange('progress')}>
                    Voir mes progrès <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Aperçu synthétique des 5 modules */}
            <div className="bento-card col-span-3" id="modules_summary_section" style={{ background: 'var(--bg-card)' }}>
              <div className="bento-header">
                <Compass size={20} color="var(--bleu-action)" /> Aperçu de vos 5 modules de préparation
              </div>
              <div className="modules-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'var(--mod-job-bg-soft)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--mod-job-border)', borderTop: '4px solid var(--mod-job-accent)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>1. Comprendre le poste</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Annonce décodée & forces/écarts</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--mod-job-accent)', marginBottom: '0.5rem' }}>72 %</div>
                  <button onClick={() => handleTabChange('job')} className="btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', borderColor: 'var(--mod-job-accent)', color: 'var(--mod-job-accent)' }}>Ouvrir</button>
                </div>

                <div style={{ background: 'var(--mod-company-bg-soft)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--mod-company-border)', borderTop: '4px solid var(--mod-company-accent)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>2. Comprendre l'entreprise</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Rapport entreprise & marché</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--mod-company-accent)', marginBottom: '0.5rem' }}>Terminé</div>
                  <button onClick={() => handleTabChange('company')} className="btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', borderColor: 'var(--mod-company-accent)', color: 'var(--mod-company-accent)' }}>Ouvrir</button>
                </div>

                <div style={{ background: 'var(--mod-speech-bg-soft)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--mod-speech-border)', borderTop: '4px solid var(--mod-speech-accent)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>3. Construire le discours</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Pitchs, marqueurs & parades</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--mod-speech-accent)', marginBottom: '0.5rem' }}>55 %</div>
                  <button onClick={() => handleTabChange('speech')} className="btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', borderColor: 'var(--mod-speech-accent)', color: 'var(--mod-speech-accent)' }}>Ouvrir</button>
                </div>

                <div style={{ background: 'var(--mod-training-bg-soft)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--mod-training-border)', borderTop: '4px solid var(--mod-training-accent)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>4. S'entraîner</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Questions, simulations & rituels</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--mod-training-accent)', marginBottom: '0.5rem' }}>12 / 150</div>
                  <button onClick={() => handleTabChange('training')} className="btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', borderColor: 'var(--mod-training-accent)', color: 'var(--mod-training-accent)' }}>Ouvrir</button>
                </div>

                <div style={{ background: 'var(--mod-progress-bg-soft)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--mod-progress-border)', borderTop: '4px solid var(--mod-progress-accent)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>5. Progresser</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Profil stratégique & débriefs</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--mod-progress-accent)', marginBottom: '0.5rem' }}>1 débrief</div>
                  <button onClick={() => handleTabChange('progress')} className="btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem', borderColor: 'var(--mod-progress-accent)', color: 'var(--mod-progress-accent)' }}>Ouvrir</button>
                </div>
              </div>
            </div>

            {/* Candidatures */}
            <div className="bento-card col-span-3" id="candidatures_section" style={{ background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div className="bento-header" style={{ marginBottom: 0 }}>
                  <Building size={20} color="var(--primary)"/> Mes candidatures ({candidatureCards.length})
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={candidatureFilter} onChange={(e) => setCandidatureFilter(e.target.value as any)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem', borderRadius: '0.4rem' }}>
                    <option value="all">Toutes</option>
                    <option value="active">À traiter</option>
                    <option value="done">Terminées</option>
                  </select>
                  <select value={candidatureSort} onChange={(e) => setCandidatureSort(e.target.value as any)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem', borderRadius: '0.4rem' }}>
                    <option value="recent">Plus récentes</option>
                    <option value="alpha">Ordre alphabétique</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                {candidatureCards.map((card) => {
                  const isCurrent = isCurrentTarget(card.company, card.job);
                  return (
                    <div key={card.key} style={{ background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)', border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '0.75rem', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{card.company}</strong>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: card.done ? '#dcfce7' : 'rgba(245, 158, 11, 0.15)', color: card.done ? '#16a34a' : '#d97706' }}>{card.statusLabel}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{card.job}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.8rem' }}>
                        <span>Entraînements : {card.trainings}</span>
                        <span>Entretien : {card.lastInterview}</span>
                      </div>
                      <button className="btn-outline" style={{ marginTop: '0.4rem', padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => onPrepareCandidature && onPrepareCandidature(card.company, card.job)}>
                        {isCurrent ? 'Continuer la préparation' : 'Activer cette candidature'}
                      </button>
                    </div>
                  );
                })}

                {/* Cartes d'ajout avec "+" : une par candidature restante dans le quota mensuel */}
                {Array.from({ length: remainingSlots }, (_, index) => index + 1).map((index) => (
                  <div
                    key={`add-card-${index}`}
                    onClick={() => {
                      if (onCreateCandidature) {
                        onCreateCandidature();
                      } else if (typeof setCurrentStep === 'function') {
                        setCurrentStep(2);
                      }
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '0.75rem',
                      padding: '1.2rem 0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '140px',
                      color: 'var(--text-muted)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary)';
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      border: '2px dashed currentColor',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center'
                    }}>
                      <Plus size={20} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ajouter une candidature</span>
                  </div>
                ))}
                {remainingSlots === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Vous avez atteint votre quota de candidatures pour ce cycle.
                  </div>
                )}
              </div>
            </div>

            {/* RADAR DE CARRIÈRE */}
            <div id="career_radar_section">
              <DashboardCard
                title="Radar de Carrière"
                icon={<Compass size={24} color="var(--primary)" />}
              >
                <CareerRadar data={careerRadarResult} loading={isProcessing && !careerRadarResult} />
              </DashboardCard>
            </div>

            {/* GPS DE CARRIÈRE */}
            <div id="career_gps_section">
              <DashboardCard
                title="GPS de Carrière"
                icon={<Navigation size={24} color="var(--primary)" />}
              >
                <CareerGPS data={careerGpsResult} loading={isProcessing && !careerGpsResult} />
              </DashboardCard>
            </div>

            {/* DERNIÈRE HEURE AVANT L'ENTRETIEN */}
            <LastHourChecklistCard />

            {/* PLAN DE SECOURS (GÉRER LES IMPRÉVUS) */}
            <ContingencyPlanCard />
          </div>
          </ModuleProvider>
        )}

        {/* 2. JOB: Comprendre le poste */}
        {activeTab === 'job' && (
          <ModuleProvider module="job">
          <div className="tab-module-content tab-module-job" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--mod-job-bg-soft)', borderRadius: '1rem', border: '1px solid var(--mod-job-border)', borderLeft: '5px solid var(--mod-job-accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Search size={26} color="#2F6BFF" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>1. Comprendre le poste</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Décodez les exigences de l'annonce, analysez vos forces et vos écarts, et visualisez le regard du recruteur.</p>
              </div>
            </div>

            {(!isCommando || jobDecoderResult) && (
              <div id="decoder_section">
                <JobDecoder data={jobDecoderResult} loading={isProcessing && !jobDecoderResult} />
              </div>
            )}

            <div id="gap_section">
              <GapAnalysisFull data={gapResult || pilotData} loading={isProcessing && !gapResult} onBack={() => handleTabChange('overview')} />
            </div>

            {(!isCommando || recruiterResult) && (
              <div id="recruiter_section">
                <RecruiterView data={recruiterResult} loading={isProcessing && !recruiterResult} />
              </div>
            )}

            <div id="signals_section">
              <SignalsToObserveCard />
            </div>
          </div>
          </ModuleProvider>
        )}

        {/* 3. COMPANY: Comprendre l'entreprise */}
        {activeTab === 'company' && (
          <ModuleProvider module="company">
          <div className="tab-module-content tab-module-company" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--mod-company-bg-soft)', borderRadius: '1rem', border: '1px solid var(--mod-company-border)', borderLeft: '5px solid var(--mod-company-accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Building size={26} color="#00A6A6" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>2. Comprendre l'entreprise</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Explorez l'actualité récente de la société, l'analyse du marché et la culture d'entreprise.</p>
              </div>
            </div>

            <div id="company_section">
              <CompanyAnalysisCard data={researchResult} loading={isMarketResearchRunning && !researchResult} error={researchResult?.error} />
            </div>

            <div id="market_section">
              <MarketAnalysisCard data={researchResult} salaryData={salaryResult} loading={isMarketResearchRunning && !researchResult} error={researchResult?.error || salaryResult?.error} />
            </div>

            <div id="posture_guides_section">
              <PostureGuidesCard />
            </div>
          </div>
          </ModuleProvider>
        )}

        {/* 4. SPEECH: Construire le discours */}
        {activeTab === 'speech' && (
          <ModuleProvider module="speech">
          <div className="tab-module-content tab-module-speech" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--mod-speech-bg-soft)', borderRadius: '1rem', border: '1px solid var(--mod-speech-border)', borderLeft: '5px solid var(--mod-speech-accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Sparkles size={26} color="#7C5CFC" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>3. Construire le discours</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Formulez vos pitchs de présentation, vos marqueurs différenciants et vos parades aux objections.</p>
              </div>
            </div>

            <div id="pitch_section">
              <InterviewTab />
            </div>

            <div id="key_messages_section">
              <ApplicationKeyMessagesView applicationId={cvData?.application_id || cvData?.id} />
            </div>

            <div id="sensitive_section">
              <SensitiveSituationsCard />
            </div>

            <div id="flaws_section">
              <FlawCoaching data={flawCoachingResult} inline={true} loading={isProcessing && !flawCoachingResult} />
            </div>

            <div id="strategic_questions_section">
              <StrategicQuestionsCard />
            </div>
          </div>
          </ModuleProvider>
        )}

        {/* 5. TRAINING: S'entraîner */}
        {activeTab === 'training' && (
          <ModuleProvider module="training">
          <div className="tab-module-content tab-module-training" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--mod-training-bg-soft)', borderRadius: '1rem', border: '1px solid var(--mod-training-border)', borderLeft: '5px solid var(--mod-training-accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Dumbbell size={26} color="#F59E0B" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>4. S'entraîner</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mises en situation, rituels vocaux et entraînement intensif aux questions cibles.</p>
              </div>
            </div>

            <div id="questionnaire_section">
              <DashboardCard
                title="Questions probables d'entretien"
                icon={<MessageSquare size={24} color="#F59E0B" />}
                featureId="interview_questions"
              >
                <Questionnaire questions={getQuestionsArray(questionsResult)} />
                <ObservedQuestionsPanel />
              </DashboardCard>
            </div>

            <div id="training_mes_section">
              <DashboardCard
                title="Simulations métier & Mises en situation"
                icon={<ShieldAlert size={24} color="#F59E0B" />}
              >
                <SituationSimulator />
              </DashboardCard>
            </div>

            <div id="oral_training_section">
              <DashboardCard
                title="Entraînement oral & Rituels vocaux"
                icon={<Mic size={24} color="#F59E0B" />}
              >
                <VocalPitchTrainer targetJob={cvData?.target_job} targetCompany={cvData?.target_company} jobDescription={cvData?.job_description} />
              </DashboardCard>
            </div>

            <TrainingTab />
          </div>
          </ModuleProvider>
        )}

        {/* 6. PROGRESS: Progresser */}
        {activeTab === 'progress' && (
          <ModuleProvider module="progress">
          <div className="tab-module-content tab-module-progress" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--mod-progress-bg-soft)', borderRadius: '1rem', border: '1px solid var(--mod-progress-border)', borderLeft: '5px solid var(--mod-progress-accent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Award size={26} color="#16A36A" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>5. Progresser</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Suivez votre profil stratégique évolutif, vos débriefs et vos recommandations de progression.</p>
              </div>
            </div>

            <div id="profile_graph_section">
              <StrategicProfileTab
                onNavigate={handleTabChange}
                profileCompletion={profileCompletion}
                profileRecommendations={profileRecommendations}
              />
            </div>

            <div id="posture_data_section">
              <PostureDataCard />
            </div>

            <div id="debrief_section">
              <Suspense fallback={<div className="p-8 text-center">Chargement des débriefs...</div>}>
                <DebriefTab />
              </Suspense>
            </div>

            <div id="recommendations_section">
              <CockpitTab 
                actionPlanData={actionPlanResult || { status: isProcessing ? 'PROCESSING' : globalStatus }}
                interviewDate={meta.interview_date || "Non définie"}
                interviewFormat={meta.interview_format ? (formatLabels[meta.interview_format as string] || meta.interview_format) : "Non défini"}
                interviewTarget={meta.interview_type ? (interviewTypeLabels[meta.interview_type as string] || meta.interview_type) : "Non défini"}
              />
            </div>
          </div>
          </ModuleProvider>
        )}
      </div>

      {/* MODALE D'IMPRESSION */}
      {isPrintModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '1rem', padding: '2rem', maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Personnaliser l'impression</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Sélectionnez les éléments que vous souhaitez inclure dans votre dossier (PDF / Papier) :</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '1rem' }}>
              {Object.keys(printSelection).map((key) => {
                const labels: Record<string, string> = {
                  pitch: "Pitch de présentation", questions: "Questions d'entretien", mes: "Mises en situation",
                  flaws: "Parades aux défauts", gap: "Analyse d'écarts (Gap)", research: "Rapports Entreprise & Marché",
                  decoder: "Décodeur d'annonce", todo: "Plan d'action (To-Do)"
                };
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    <input type="checkbox" checked={printSelection[key as keyof typeof printSelection]} onChange={() => togglePrintSelection(key as keyof typeof printSelection)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    {labels[key as keyof typeof labels]}
                  </label>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setIsPrintModalOpen(false)}>Annuler</button>
              <button className="btn-primary" onClick={handlePrintConfirm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} /> Générer le Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Feuille de Route */}
      {isRoadmapModalOpen && <RoadmapGeneratorModal onClose={() => setIsRoadmapModalOpen(false)} />}

      {/* Composant d'impression invisible à l'écran */}
      <PrintableDossier selection={printSelection} />

      {/* BOUTON RETOUR EN HAUT */}
      {showBackToTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)', zIndex: 1000, transition: 'all 0.2s' }}
          title={t('btn_back_to_top', 'Revenir en haut')}
        >
          <ArrowUp size={24} />
        </button>
      )}

      <style>{`
        @media print {
          .tabs-navigation, .sub-tabs-navigation, .btn-action, .btn-primary, .btn-secondary, .btn-outline, .btn-ghost, .notification-dot, .user-profile-btn, header { display: none !important; }
          /* On cache tout le contenu interactif du dashboard pour ne laisser que le PrintableDossier */
          .tab-content, .bento-grid, .dashboard-grid-new, .dashboard-container-new { display: none !important; }
          .printable-dossier { display: block !important; }
          body { background: white; margin: 0; padding: 0; }
        }
        .dashboard-wrapper { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
        
        .tabs-navigation { display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0; overflow-x: auto; align-items: flex-end; scrollbar-width: none; -ms-overflow-style: none; }
        .tabs-navigation::-webkit-scrollbar { display: none; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-bottom: none; padding: 0.75rem 1.25rem; cursor: pointer; font-weight: 600; color: var(--text-muted); border-radius: 0.75rem 0.75rem 0 0; transition: all 0.2s; white-space: nowrap; margin-bottom: -2px; z-index: 1; }
        .tab-btn:hover { background: #DCEEFF; color: #102E5C; }
        
        .tab-btn--overview { border-color: var(--mod-overview-accent); }
        .tab-btn--job { border-color: var(--mod-job-accent); }
        .tab-btn--company { border-color: var(--mod-company-accent); }
        .tab-btn--speech { border-color: var(--mod-speech-accent); }
        .tab-btn--training { border-color: var(--mod-training-accent); }
        .tab-btn--progress { border-color: var(--mod-progress-accent); }

        .tab-btn--overview.active { background: var(--mod-overview-accent) !important; color: white !important; border-color: var(--mod-overview-accent) !important; }
        .tab-btn--job.active { background: var(--mod-job-accent) !important; color: white !important; border-color: var(--mod-job-accent) !important; }
        .tab-btn--company.active { background: var(--mod-company-accent) !important; color: white !important; border-color: var(--mod-company-accent) !important; }
        .tab-btn--speech.active { background: var(--mod-speech-accent) !important; color: white !important; border-color: var(--mod-speech-accent) !important; }
        .tab-btn--training.active { background: var(--mod-training-accent) !important; color: white !important; border-color: var(--mod-training-accent) !important; }
        .tab-btn--progress.active { background: var(--mod-progress-accent) !important; color: white !important; border-color: var(--mod-progress-accent) !important; }
        
        .sub-tabs-navigation { display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 1rem 1rem; box-shadow: 0 4px 6px -2px rgba(16, 35, 63, 0.04); }
        .sub-tabs-overview { background: var(--mod-overview-bg-soft); border-color: var(--mod-overview-border); border-top: 3px solid var(--mod-overview-accent); }
        .sub-tabs-job { background: var(--mod-job-bg-soft); border-color: var(--mod-job-border); border-top: 3px solid var(--mod-job-accent); }
        .sub-tabs-company { background: var(--mod-company-bg-soft); border-color: var(--mod-company-border); border-top: 3px solid var(--mod-company-accent); }
        .sub-tabs-speech { background: var(--mod-speech-bg-soft); border-color: var(--mod-speech-border); border-top: 3px solid var(--mod-speech-accent); }
        .sub-tabs-training { background: var(--mod-training-bg-soft); border-color: var(--mod-training-border); border-top: 3px solid var(--mod-training-accent); }
        .sub-tabs-progress { background: var(--mod-progress-bg-soft); border-color: var(--mod-progress-border); border-top: 3px solid var(--mod-progress-accent); }

        .sub-tab-btn { background: var(--bg-card); border: 1px solid var(--border-color); padding: 0.45rem 1.1rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600; color: var(--text-main); cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .sub-tabs-overview .sub-tab-btn:hover { background: var(--mod-overview-accent); color: white; border-color: var(--mod-overview-accent); }
        .sub-tabs-job .sub-tab-btn:hover { background: var(--mod-job-accent); color: white; border-color: var(--mod-job-accent); }
        .sub-tabs-company .sub-tab-btn:hover { background: var(--mod-company-accent); color: white; border-color: var(--mod-company-accent); }
        .sub-tabs-speech .sub-tab-btn:hover { background: var(--mod-speech-accent); color: white; border-color: var(--mod-speech-accent); }
        .sub-tabs-training .sub-tab-btn:hover { background: var(--mod-training-accent); color: white; border-color: var(--mod-training-accent); }
        .sub-tabs-progress .sub-tab-btn:hover { background: var(--mod-progress-accent); color: white; border-color: var(--mod-progress-accent); }

        .tab-module-overview .bento-card, .tab-module-overview .card, .tab-module-overview .result-card, .tab-module-overview .info-card { border-top: 4px solid var(--mod-overview-accent) !important; }
        .tab-module-job .bento-card, .tab-module-job .card, .tab-module-job .result-card, .tab-module-job .info-card { border-top: 4px solid var(--mod-job-accent) !important; }
        .tab-module-company .bento-card, .tab-module-company .card, .tab-module-company .result-card, .tab-module-company .info-card { border-top: 4px solid var(--mod-company-accent) !important; }
        .tab-module-speech .bento-card, .tab-module-speech .card, .tab-module-speech .result-card, .tab-module-speech .info-card { border-top: 4px solid var(--mod-speech-accent) !important; }
        .tab-module-training .bento-card, .tab-module-training .card, .tab-module-training .result-card, .tab-module-training .info-card { border-top: 4px solid var(--mod-training-accent) !important; }
        .tab-module-progress .bento-card, .tab-module-progress .card, .tab-module-progress .result-card, .tab-module-progress .info-card { border-top: 4px solid var(--mod-progress-accent) !important; }
        
        /* BANDEAU CANDIDATURE EN COURS */
        .banner-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 58, 138, 0.05) 100%), var(--bg-card);
          border: 1px solid var(--border-color);
          border-left: 5px solid var(--primary);
          border-radius: 1rem;
          padding: 1.8rem;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }
        .banner-top-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.12);
          color: var(--primary);
          font-size: 0.82rem;
          font-weight: 700;
          align-self: flex-start;
        }
        .banner-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .banner-title {
          font-size: 1.65rem;
          font-weight: 850;
          color: var(--text-main);
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }
        .banner-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.6rem;
          font-size: 0.92rem;
          color: var(--text-muted);
        }
        .banner-meta span { display: inline-flex; align-items: center; gap: 0.4rem; }
        .banner-dot { opacity: 0.4; }
        .banner-grid-3 {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          flex-wrap: wrap;
          gap: 1.5rem;
          width: 100%;
        }
        .banner-col-left {
          flex: 1 1 300px;
          min-width: 260px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .banner-gauges-row {
          flex: 2.4 1 560px;
          display: flex;
          align-items: stretch;
          gap: 1.25rem;
        }
        .banner-gauge-card {
          flex: 1 1 260px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1.1rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.35rem;
          box-shadow: 0 4px 14px rgba(16, 35, 63, 0.05);
          transition: all 0.25s ease;
          min-width: 0;
        }
        .banner-gauge-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(16, 35, 63, 0.09);
        }
        .gauge-wrapper-desktop { display: block; flex-shrink: 0; }
        .gauge-wrapper-mobile { display: none; flex-shrink: 0; }
        .gauge-submetrics {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          display: flex;
          gap: 0.85rem;
          flex-wrap: wrap;
        }
        .indicator-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 700;
        }
        .indicator-value-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        .indicator-score { font-size: 1.35rem; font-weight: 850; color: #10b981; }
        .indicator-bar { flex: 1; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
        .indicator-fill { height: 100%; background: #10b981; border-radius: 4px; transition: width 0.5s ease; }
        .indicator-days { font-size: 1.35rem; font-weight: 850; color: var(--primary); }
        .banner-actions { display: flex; gap: 0.8rem; flex-wrap: wrap; }

        /* PARCOURS DE PRÉPARATION */
        .path-stepper-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .path-step-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.85rem;
          padding: 1.1rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.7rem;
        }
        .step-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 0.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .step-title { font-weight: 700; font-size: 0.95rem; color: var(--text-main); flex: 1; }
        .step-badge-ok { background: #dcfce7; color: #16a34a; padding: 0.15rem 0.55rem; border-radius: 1rem; font-size: 0.72rem; font-weight: 700; }
        .step-badge-warn { background: rgba(245, 158, 11, 0.15); color: #d97706; padding: 0.15rem 0.55rem; border-radius: 1rem; font-size: 0.72rem; font-weight: 700; }
        .step-badge-blue { background: rgba(59, 130, 246, 0.15); color: var(--primary); padding: 0.15rem 0.55rem; border-radius: 1rem; font-size: 0.72rem; font-weight: 700; }
        .step-badge-gray { background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-color); padding: 0.15rem 0.55rem; border-radius: 1rem; font-size: 0.72rem; font-weight: 700; }
        .step-detail { font-size: 0.82rem; color: var(--text-muted); margin: 0; line-height: 1.4; flex: 1; }
        .step-action-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-top: auto;
        }
        .step-action-btn:hover { text-decoration: underline; }

        /* PRIORITÉS RECOMMANDÉES */
        .priorities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.2rem;
        }
        .priority-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--primary);
          border-radius: 0.85rem;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
        }
        .priority-num {
          font-size: 1.4rem;
          font-weight: 900;
          color: var(--primary);
          line-height: 1;
        }
        .priority-head { font-size: 1rem; font-weight: 750; color: var(--text-main); margin: 0 0 0.4rem 0; line-height: 1.35; }
        .priority-why { font-size: 0.85rem; color: var(--text-muted); margin: 0; line-height: 1.4; }
        .btn-primary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary-action:hover { filter: brightness(0.95); transform: translateY(-1px); }

        /* CARTES FAMILLES */
        .families-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.1rem;
        }
        .family-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.85rem;
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 0.9rem;
        }
        .family-head { display: flex; align-items: center; gap: 0.6rem; }
        .family-head h4 { font-size: 1rem; font-weight: 750; margin: 0; color: var(--text-main); }
        .family-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.83rem; color: var(--text-muted); }
        .family-status { font-size: 0.78rem; font-weight: 600; color: var(--primary); background: rgba(59, 130, 246, 0.08); padding: 0.4rem 0.7rem; border-radius: 0.5rem; }
        .family-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 0.55rem 0.8rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.2s;
        }
        .family-btn:hover { border-color: var(--primary); color: var(--primary); }

        /* WIDGET PROFIL STRATÉGIQUE */
        .widget-profile-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.8rem;
        }
        @media (max-width: 850px) { .widget-profile-grid { grid-template-columns: 1fr; } }
        .widget-scores-col { display: flex; flex-direction: column; gap: 0.75rem; }
        .widget-score-row { display: flex; align-items: center; gap: 0.75rem; }
        .widget-score-label { font-size: 0.88rem; font-weight: 600; color: var(--text-main); width: 170px; flex-shrink: 0; }
        .widget-score-bar { flex: 1; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
        .widget-score-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
        .widget-score-num { font-size: 0.88rem; font-weight: 750; color: var(--text-main); width: 48px; text-align: right; flex-shrink: 0; }
        .widget-feedback-box {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.85rem;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          justify-content: space-between;
        }
        .feedback-tag { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #d97706; }
        .feedback-text { font-size: 0.9rem; color: var(--text-main); margin: 0; line-height: 1.45; }
        .feedback-rec { font-size: 0.85rem; color: var(--text-muted); background: var(--bg-card); padding: 0.7rem 0.9rem; border-radius: 0.5rem; border-left: 3px solid var(--primary); }

        /* BENTO GRID CSS */
        .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; grid-auto-rows: minmax(150px, auto); }
        .bento-card { background: var(--bg-card); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border-color); border-top: 3px solid var(--primary); display: flex; flex-direction: column; position: relative; overflow: hidden; color: var(--text-main); }
        .bento-card.col-span-2 { grid-column: span 2; }
        .bento-card.col-span-3 { grid-column: span 3; }
        .bento-card.row-span-2 { grid-row: span 2; }
        
        .bento-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; font-weight: 700; color: var(--text-main); font-size: 1.1rem; }
        .skeleton-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; background: #e2e8f0; border: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        
        .badge-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .badge { background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 600; }
        
        .gap-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
        .gap-table th { text-align: left; padding-bottom: 0.75rem; border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-size: 0.875rem; text-transform: uppercase; }
        .gap-table td { padding: 1rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.95rem; color: var(--text-main); }
        .impact-high { color: var(--danger-text); font-weight: 600; background: rgba(239, 68, 68, 0.1); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.8rem; }
        
        .strategy-text { line-height: 1.6; color: var(--text-muted); }
        
        /* Boutons d'action */
        .action-buttons { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-action { flex: 1; display: flex; justify-content: center; align-items: center; gap: 0.5rem; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; }
        .btn-primary-action { background: #0F2650; color: white; }
        .btn-primary-action:hover { background: #1e3a8a; }
        .btn-secondary-action { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; }
        .btn-secondary-action:hover { background: #e2e8f0; }
        .btn-glass { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
        .btn-glass:hover { background: rgba(255,255,255,0.2); }
        
        /* Onglet CV */
        .cv-tab-container { display: flex; flex-direction: column; gap: 1.5rem; }
        .cv-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); padding: 1rem; border-radius: 1rem; border: 1px solid var(--border-color); }
        .cv-type-selector { display: flex; gap: 0.5rem; background: var(--bg-secondary); padding: 0.25rem; border-radius: 0.5rem; }
        .cv-type-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; background: transparent; border-radius: 0.375rem; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
        .cv-type-btn.active { background: var(--bg-card); color: var(--text-main); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        
        .cv-content-split { display: grid; grid-template-columns: 350px 1fr; gap: 1.5rem; min-height: 600px; }
        .cv-controls { background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); }
        .section-title { margin: 0 0 0.5rem 0; color: var(--text-main); font-size: 1.1rem; }
        .text-muted { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        
        .editor-placeholder { margin-top: 1.5rem; padding: 2rem; background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: 0.5rem; text-align: center; color: var(--text-muted); }
        
        .progress-bar { width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; margin: 0.5rem 0; overflow: hidden; }
        .progress-fill { height: 100%; background: #16a34a; border-radius: 4px; }
        
        .cv-preview { background: var(--bg-secondary); border-radius: 1rem; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color); }
        .preview-header { background: var(--bg-card); color: var(--text-main); border-bottom: 1px solid var(--border-color); padding: 0.75rem 1rem; font-size: 0.9rem; font-weight: 600; display: flex; justify-content: space-between; }
        .preview-document { flex: 1; padding: 2rem; display: flex; justify-content: center; overflow-y: auto; }
        .pdf-placeholder { background: var(--bg-card); width: 100%; max-width: 800px; aspect-ratio: 1 / 1; object-fit: cover; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); border-radius: 4px; border: 1px solid var(--border-color); }
        
        /* Onglet Entretien */
        .interview-tab-container { display: flex; flex-direction: column; gap: 1.5rem; }
        .pitch-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .pitch-card { background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem; }
        .pitch-textarea { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; min-height: 120px; resize: vertical; font-family: inherit; font-size: 0.95rem; line-height: 1.5; color: var(--text-main); outline: none; transition: 0.2s; }
        .pitch-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        
        .qa-list { display: flex; flex-direction: column; gap: 1rem; }
        .qa-item { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 1rem; overflow: hidden; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.02); animation: slideUp 0.5s ease-out forwards; opacity: 0; transform: translateY(10px); }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
        .qa-header { display: flex; align-items: flex-start; gap: 1rem; padding: 1.25rem; cursor: pointer; transition: background 0.2s; }
        .qa-header:hover { background: var(--bg-secondary); }
        .qa-icon { background: rgba(59, 130, 246, 0.1); color: var(--primary); padding: 0.5rem; border-radius: 0.5rem; flex-shrink: 0; }
        .qa-question-content { flex: 1; }
        .qa-category { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; letter-spacing: 0.05em; }
        .qa-question { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--text-main); }
        .qa-chevron { color: #94a3b8; transition: transform 0.2s; }
        .qa-chevron.open { transform: rotate(180deg); }
        .qa-body { padding: 0 1.25rem 1.25rem 3.75rem; display: flex; flex-direction: column; gap: 1rem; }
        .qa-answer-box { background: rgba(34, 197, 94, 0.05); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 0.5rem; padding: 1rem; }
        .qa-answer-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #166534; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .qa-answer-textarea { width: 100%; background: transparent; border: none; resize: vertical; min-height: 80px; font-family: inherit; font-size: 0.95rem; line-height: 1.5; color: var(--text-main); outline: none; }
        .qa-advice { font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 0.5rem; align-items: flex-start; padding-top: 1rem; border-top: 1px dashed var(--border-color); }
        
        /* Onglet Analyse */
        .analysis-tab-container { display: flex; flex-direction: column; gap: 1.5rem; }
        .analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
        .analysis-card { background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem; color: var(--text-main); }
        .analysis-card.full-width { grid-column: span 2; }
        .analysis-card-title { display: flex; align-items: center; gap: 0.75rem; margin: 0; font-size: 1.1rem; color: var(--text-main); font-weight: 600; }
        .analysis-card-content { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }
        .news-item { padding: 1rem; background: var(--bg-secondary); border-left: 3px solid #3b82f6; border-radius: 0 0.5rem 0.5rem 0; margin-bottom: 0.75rem; }
        .news-item-title { font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem; }
        
        /* Mode Téléprompteur */
        .teleprompter-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0f172a; z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
        .teleprompter-close { position: absolute; top: 2rem; right: 2rem; background: rgba(255,255,255,0.1); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .teleprompter-close:hover { background: rgba(255,255,255,0.2); }
        .teleprompter-text-container { max-width: 900px; width: 100%; max-height: 75vh; overflow-y: auto; text-align: center; }
        .teleprompter-text-container::-webkit-scrollbar { display: none; }
        .teleprompter-paragraph { color: rgba(255,255,255,0.4); font-size: 2.2rem; line-height: 1.6; margin-bottom: 2.5rem; transition: color 0.3s; font-weight: 600; cursor: default; }
        .teleprompter-paragraph:hover { color: white; }
        .teleprompter-controls { position: absolute; bottom: 2rem; display: flex; gap: 1rem; }
        
        /* Notifications & Animations */
        .notification-dot { position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background-color: #EF6461; border-radius: 50%; border: 2px solid var(--bg-card); animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(239, 100, 97, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 100, 97, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 100, 97, 0); }
        }
        @keyframes pulse-new {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }

        /* --- RESPONSIVE & MOBILE OPTIMIZATIONS --- */
        @media (max-width: 768px) {
          .banner-card { padding: 1.25rem !important; gap: 1rem !important; }
          .banner-grid-3 { flex-direction: column; align-items: stretch; gap: 1rem; }
          .banner-col-left { min-width: 0; }
          .banner-gauges-row { flex-direction: column; gap: 0.65rem; width: 100%; flex: auto; }
          .banner-gauge-card { padding: 0.65rem 0.85rem; gap: 0.8rem; min-width: 0; width: 100%; box-sizing: border-box; border-radius: 0.75rem; }
          .gauge-wrapper-desktop { display: none !important; }
          .gauge-wrapper-mobile { display: block !important; }
          .gauge-submetrics { font-size: 0.75rem; gap: 0.5rem; }

          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-card.col-span-2, .bento-card.col-span-3 { grid-column: span 1 !important; }
          .bento-card.row-span-2 { grid-row: auto !important; }
          .pitch-grid, .analysis-grid, .cv-content-split { grid-template-columns: 1fr !important; }
          .dashboard-wrapper { gap: 1rem !important; }
          .tabs-navigation { padding-bottom: 0.5rem; }
          .sub-tabs-navigation { padding: 0.75rem 1rem !important; justify-content: flex-start !important; flex-wrap: nowrap !important; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
          .sub-tabs-navigation::-webkit-scrollbar { display: none; }
          .bento-card { padding: 1.25rem !important; }

          /* En mode paysage sur téléphone, les sous-menus prennent trop de hauteur : on les masque */
          @media (orientation: landscape) and (max-height: 500px) {
            .sub-tabs-navigation { display: none !important; }
          }
          
          /* Prévention des dépassements de texte (Mots/URL trop longs) */
          .bento-card p, .bento-card h3, .bento-card h4, .bento-card div { overflow-wrap: break-word; word-break: break-word; hyphens: auto; }
        }
      `}</style>
    </div>
  );
};