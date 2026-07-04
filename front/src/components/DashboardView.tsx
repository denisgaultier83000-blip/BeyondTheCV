import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo, FC } from 'react';
import { useDashboard } from './DashboardContext';
import { Activity, Target, AlertTriangle, MessageSquare, FileText, Globe, Compass, Mic, Search, Eye, Navigation, Network, Loader2, RotateCcw, CheckSquare, Dumbbell, ArrowUp, Printer, Building, ShieldAlert, Calendar, UserCheck, Monitor, HeartPulse, Zap, Award, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PilotBento } from './PilotBento';
import { GapAnalysisFull } from './GapAnalysisFull';
import { InterviewTab } from './InterviewTab';
import { AnalysisTab } from './AnalysisTab';
import { JobDecoder } from './JobDecoder';
import { CareerRealityCheck } from './CareerRealityCheck';
import { CockpitTab } from './CockpitTab';
import { RecruiterView } from './RecruiterView';
import FlawCoaching from './FlawCoaching';
import TrainingTab from './TrainingTab';
import { PrintableDossier } from './PrintableDossier';
import { CoachingSummaryCard } from './CoachingSummaryCard';
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

  // [FIX] Déplacement de la logique du hook ici pour isoler l'état de chaque instance
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


// --- STATIC DATA (Moved outside component) ---
const subMenus: Record<string, {label: string, id: string}[]> = {
  overview: [
    { label: 'Centre de Suivi', id: 'hub_section' },
    { label: 'Vue Recruteur', id: 'recruiter_section' }
  ],
  interview: [
    { label: 'Pitch', id: 'pitch_section' },
    { label: 'Questions & Mises en situation', id: 'questionnaire_section' },
    { label: 'Parades aux Défauts', id: 'flaws_section' }
  ],
  market: [
    { label: 'Gap Analysis', id: 'gap_section' },
    { label: 'Entreprise', id: 'company_section' },
    { label: 'Marché', id: 'market_section' },
    { label: 'Décodeur d\'Annonce', id: 'decoder_section' }
  ],
  training: [
    { label: 'Mises en situation', id: 'training_mes_section' }, // ID déjà présent
    { label: 'Entraînement au Pitch', id: 'training_pitch_section' } // ID déjà présent
  ],
  posture: [
    { label: 'Dernière Heure', id: 'last_hour_section' },
    { label: 'Questions Stratégiques', id: 'strategic_questions_section' },
    { label: 'Signaux à Observer', id: 'signals_section' },
    { label: 'Guides de Posture', id: 'posture_guides_section' },
    { label: 'Plan de Secours', id: 'contingency_plan_section' }
  ]
};

const interviewTypeLabels: Record<string, string> = { rh: 'Ressources Humaines', manager: 'Manager / Opérationnel', tech: 'Équipe Technique', final: 'Direction (Final)' };
const formatLabels: Record<string, string> = { visio: 'Visioconférence', phone: 'Téléphone', onsite: 'En Présentiel' };

// --- [FIX] SUB-COMPONENTS (for readability) ---

const DeliverablesHub = ({ deliverableItems, isProcessing, longLoading, viewedTabs, isDataReady, onPrintClick, onItemClick }: any) => {
  const { t } = useTranslation();
  return (
    <div className="bento-card col-span-3" id="hub_section" style={{ background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="bento-header" style={{ marginBottom: 0 }}><Activity size={20} color="var(--primary)"/> {t('hub_title', 'Centre de Suivi des Analyses')}</div>
        <button 
          onClick={onPrintClick} 
          disabled={isProcessing}
          className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
          <Printer size={16} /> Imprimer mon Dossier
        </button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{t('hub_desc', 'Suivez la génération de vos outils en temps réel et cliquez pour y accéder.')}</p>
    
      {isProcessing && longLoading && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <Loader2 size={16} className="spin" />
          {t('hub_long_loading', "L'analyse IA est très approfondie et prend un peu plus de temps. Merci de patienter (jusqu'à 60 secondes)...")}
        </div>
      )}
    
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {deliverableItems.map((item: DeliverableItem, idx: number) => {
            const isReady = isDataReady(item.data) && !item.disabled;
            const isPending = isProcessing && !isReady && !item.disabled;
            const isNew = isReady && !viewedTabs.includes(item.tab) && !item.disabled;
            return (
              <div 
                  key={idx} 
                  onClick={() => !item.disabled && !isPending && onItemClick(item.tab, item.anchor)} 
                  style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${isReady ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: (item.disabled || isPending) ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.5 : (isPending ? 0.7 : 1), transition: 'all 0.2s', boxShadow: isNew ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none' }} 
                  onMouseOver={(e) => !item.disabled && !isPending && (e.currentTarget.style.transform = 'translateY(-2px)')} 
                  onMouseOut={(e) => !item.disabled && !isPending && (e.currentTarget.style.transform = 'none')}
              >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: isReady ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isReady ? 600 : 400 }}>
                        <div style={{ color: isReady ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}>{item.icon}</div>
                        <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
                    </div>
                    {item.disabled ? null : isNew ? (
                        <span style={{ background: '#ef4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, animation: 'pulse-new 2s infinite' }}>{t('badge_new', 'NEW')}</span>
                    ) : isReady ? (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>{t('badge_ready', 'PRÊT')}</span>
                    ) : isPending ? (
                        <Loader2 size={16} className="spin" color="var(--text-muted)" />
                    ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('badge_pending', 'En attente')}</span>
                    )}
                  </div>
                  {item.disabled && item.disabledReason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', fontWeight: 600 }}>
                      {item.disabledReason}
                    </div>
                  )}
              </div>
            );
        })}
      </div>
    </div>
  );
};

export const DashboardView: FC = () => {
  const { t } = useTranslation();
  const { 
    activeTab, setActiveTab, pilotData, isPilotLoading, pilotError, cvData, fetchPilotData,
    researchResult, salaryResult, setCurrentStep,
    jobDecoderResult, recruiterResult, realityResult, flawCoachingResult,
    globalStatus, triggerResearch,
    pitchResult, questionsResult, gapResult, customScenariosResult, actionPlanResult
  } = useDashboard();

  // --- GESTION DES NOTIFICATIONS ---
  const [viewedTabs, setViewedTabs] = useState<string[]>(['cockpit']);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
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

  const handleTabChange = (tab: string, anchor?: string) => {
    setActiveTab(tab);
    if (!viewedTabs.includes(tab)) {
      setViewedTabs(prev => [...prev, tab]);
    }
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- ECOUTEUR GLOBAL POUR LE BOUTON "MES DOCUMENTS" DU HEADER ---
  useEffect(() => {
    const handleOpenPrint = () => setIsPrintModalOpen(true);
    window.addEventListener('open-print-modal', handleOpenPrint);
    return () => window.removeEventListener('open-print-modal', handleOpenPrint);
  }, []);

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
  const meta = cvData?.meta || cvData || {};

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

  // Liste de tous les livrables avec leur état
  const deliverableItems: DeliverableItem[] = useMemo(() => [
      { name: t('deliv_pitch', "Pitch de 3 minutes"), tab: "interview", anchor: "pitch_section", data: pitchResult, icon: <Mic size={18}/> },
      { name: t('card_interview_title', "Questionnaire d'Entretien"), tab: "interview", anchor: "questionnaire_section", data: questionsResult, icon: <MessageSquare size={18}/> },
      { name: t('deliv_mes', "Mises en situation"), tab: "interview", anchor: "mes_anchor", data: customScenariosResult || cvData, icon: <ShieldAlert size={18}/> },
      { name: t('deliv_flaws', "Parades aux Défauts"), tab: "interview", anchor: "flaws_section", data: flawCoachingResult, icon: <AlertTriangle size={18}/> },
      { name: t('deliv_gap', "Analyse d'Écarts (Gap)"), tab: "market", anchor: "gap_section", data: gapResult, icon: <Target size={18}/> },
      { name: t('deliv_company', "Rapport Entreprise"), tab: "market", anchor: "company_section", data: researchResult, icon: <Building size={18}/> },
      { name: t('deliv_market', "Rapport Marché"), tab: "market", anchor: "market_section", data: researchResult, icon: <Globe size={18}/> },
      { 
        name: t('deliv_decoder', "Décodeur d'Annonce"), 
        tab: "market", 
        anchor: "decoder_section", 
        data: jobDecoderResult, 
        icon: <Search size={18}/>,
        disabled: !hasJobDesc || (isCommando && !jobDecoderResult),
        disabledReason: !hasJobDesc ? t('card_decoder_disabled', "Annonce non renseignée. Ajoutez l'annonce dans votre profil pour l'analyser.") : (isCommando ? commandoReason : undefined)
      },
      { name: t('deliv_recruiter', "Vue Recruteur"), tab: "overview", anchor: "recruiter_section", data: recruiterResult, icon: <Eye size={18}/>, disabled: isCommando && !recruiterResult, disabledReason: isCommando ? commandoReason : undefined }
    ], 
    [
      t, pitchResult, questionsResult, customScenariosResult, cvData, flawCoachingResult, 
      gapResult, researchResult, jobDecoderResult, recruiterResult, hasJobDesc, isCommando, commandoReason
    ]
  );

  // Calcul des pastilles par onglet
  const hasUnseen = (tabName: string, items: any[]) => {
    if (viewedTabs.includes(tabName)) return false;
    return items.some(item => isDataReady(item));
  };
  
  const interviewUnseen = hasUnseen('interview', [pitchResult, questionsResult, flawCoachingResult]);
  const marketUnseen = hasUnseen('market', [gapResult, researchResult, jobDecoderResult]);
  const cockpitUnseen = hasUnseen('cockpit', [actionPlanResult]);

  // [FIX CRITIQUE] On force le chargement du résumé si les données sont absentes pour briser la boucle de crash
  useEffect(() => {
    if ((activeTab === 'overview' || activeTab === 'cockpit') && !pilotData && !pilotError && typeof fetchPilotData === 'function') {
      fetchPilotData();
    }
  }, [activeTab, pilotData, pilotError, fetchPilotData]);

  // La condition de chargement est maintenant robuste grâce à l'état explicite `isPilotLoading`
  const isLoadingOverview = isPilotLoading || (!pilotData && !pilotError);

  // Extraction de la logique d'affichage du hub dans un composant mémoïsé
  const MemoizedDeliverablesHub = React.memo(DeliverablesHub as any);

  return (
    <div className="dashboard-wrapper">
      {/* GROUPE NAVIGATION : Onglets + Sous-menus collés */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className={`tabs-navigation ${subMenus[activeTab] ? 'has-sub' : ''}`}>
        <button className={`tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`} onClick={() => handleTabChange('cockpit')} style={{ position: 'relative' }}>
          <Target size={18} /> {t('cockpit_title', "Stratégie d'entretien")} {cockpitUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
          <Activity size={18} /> {t('tab_overview', "Vue d'ensemble")}
        </button>
        <button className={`tab-btn ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => handleTabChange('interview')} style={{ position: 'relative' }}>
          <MessageSquare size={18} /> {t('tab_interview_short', "Entretien")} {interviewUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`} onClick={() => handleTabChange('training')}>
          <Dumbbell size={18} /> {t('tab_training', "S'entrainer")}
        </button>
        <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => handleTabChange('market')} style={{ position: 'relative' }}>
          <Globe size={18} /> {t('tab_market_offer', "Marché & Offre")} {marketUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'posture' ? 'active' : ''}`} onClick={() => handleTabChange('posture')}>
          <Award size={18} /> {t('tab_posture', "Réussir l'entretien")}
        </button>
        <button className={`tab-btn ${activeTab === 'debrief' ? 'active' : ''}`} onClick={() => handleTabChange('debrief')}>
          <ClipboardList size={18} /> {t('tab_debrief', "Débrief & Suivi")}
        </button>
      </div>

      {/* SOUS-MENUS */}
      {subMenus[activeTab] && (
        <div className="sub-tabs-navigation" key={activeTab}>
          {subMenus[activeTab].map((sub) => (
            <button key={sub.id} className="sub-tab-btn" onClick={() => {
              const el = document.getElementById(sub.id);
              if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 120;
                window.scrollTo({ top: y, behavior: 'smooth' });
              }
            }}>
              {sub.label}
            </button>
          ))}
        </div>
      )}
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="tab-content">
        {activeTab === 'cockpit' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} id="cockpit_section">
             <CockpitTab 
               actionPlanData={actionPlanResult || { status: isProcessing ? 'PROCESSING' : globalStatus }}
               interviewDate={meta.interview_date || "Non définie"}
               interviewFormat={meta.interview_format ? (formatLabels[meta.interview_format as string] || meta.interview_format) : "Non défini"}
               interviewTarget={meta.interview_type ? (interviewTypeLabels[meta.interview_type as string] || meta.interview_type) : "Non défini"}
             />
           </div>
        )}

        {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* AVERTISSEMENTS / ASTUCES */}
              {((!cvData?.target_company && cvData?.target_industry) || !hasJobDesc) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(!cvData?.target_company && cvData?.target_industry) && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.95rem', lineHeight: '1.5' }}><strong>Attention :</strong> Vous avez renseigné le secteur (<strong>{cvData.target_industry}</strong>) mais laissé l'entreprise cible vide. L'IA générera des conseils génériques pour ce secteur. Modifiez votre profil pour cibler une entreprise précise si vous en avez une.</span>
                    </div>
                  )}
                  {!hasJobDesc && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={20} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.95rem', lineHeight: '1.5' }}><strong>Astuce :</strong> Le module <strong>Décodeur d'Annonce</strong> est actuellement inactif. Renseignez la description de l'offre d'emploi dans votre profil pour l'activer et découvrir les attentes cachées du recruteur.</span>
                    </div>
                  )}
                </div>
              )}

              {/* [FIX ARCHITECTURE] Le Hub est sorti de la condition de chargement. 
                  Il s'affiche instantanément. Les analyses terminées en amont (ex: Marché) 
                  seront cliquables immédiatement sans attendre la synthèse IA. */}
              <MemoizedDeliverablesHub
                deliverableItems={deliverableItems}
                isProcessing={isProcessing}
                longLoading={longLoading}
                viewedTabs={viewedTabs}
                isDataReady={isDataReady}
                onPrintClick={() => setIsPrintModalOpen(true)}
                onItemClick={handleTabChange}
              />

              {/* Seules les cartes dépendantes de la synthèse affichent le Skeleton */}
              {isLoadingOverview ? (
                <div className="bento-grid">
                   <div className="bento-card row-span-2 skeleton-pulse" style={{ minHeight: '350px' }}></div> {/* This was the unclosed div */}
                   <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
                   <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
                </div>
              ) : pilotError ? (
                <div className="bento-card col-span-3" style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px solid var(--danger-text)', background: 'var(--bg-card)' }}>
                  <AlertTriangle size={48} color="var(--danger-text)" style={{ margin: '0 auto 1rem auto' }} />
                  <h3 style={{ color: 'var(--danger-text)', marginBottom: '0.5rem' }}>Analyse momentanément interrompue</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{pilotError}</p>
                  <button onClick={fetchPilotData} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={16} /> Réessayer
                  </button>
                </div>
              ) : (
                <>
                  <PilotBento 
                      data={pilotData} 
                      onGoToGap={() => handleTabChange('market', 'gap_section')} 
                  />
                  {/* [NOUVEAU] Carte de synthèse du coaching vocal */}
                  <CoachingSummaryCard 
                    data={pitchResult?.coaching_notes}
                    loading={isProcessing && !pitchResult}
                  />
                  <CareerRealityCheck data={realityResult} score={realityResult?.score} loading={isProcessing && !realityResult && !isCommando} />
                  {(!isCommando || recruiterResult) && (
                    <div id="recruiter_section">
                      <RecruiterView data={recruiterResult} loading={isProcessing && !recruiterResult} />
                    </div>
                  )}
                </>
              )}
            </div>
        )}
        
        {activeTab === 'interview' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <InterviewTab />
             <div id="flaws_section">
               <FlawCoaching data={flawCoachingResult} inline={true} loading={isProcessing && !flawCoachingResult} />
             </div>
           </div>
        )}

        {activeTab === 'market' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div id="gap_section">
               <GapAnalysisFull data={gapResult || pilotData} loading={isProcessing && !gapResult} onBack={() => handleTabChange('overview')} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <AnalysisTab researchResult={researchResult} salaryResult={salaryResult} onRefresh={triggerResearch} isRefreshing={isProcessing} />
             </div>
             {(!isCommando || jobDecoderResult) && (
               <div id="decoder_section">
                 <JobDecoder data={jobDecoderResult} loading={isProcessing && !jobDecoderResult} />
               </div>
             )}
           </div>
        )}

        {activeTab === 'training' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <TrainingTab />
           </div>
        )}

        {activeTab === 'posture' && (
          <Suspense fallback={<div className="p-8 text-center">Chargement du module...</div>}>
            <PostureTab />
          </Suspense>
        )}

        {activeTab === 'debrief' && (
          <Suspense fallback={<div className="p-8 text-center">Chargement du module...</div>}>
            <DebriefTab />
          </Suspense>
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
        .tabs-navigation.has-sub { border-bottom: 2px solid var(--primary); }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-bottom: none; padding: 0.75rem 1.25rem; cursor: pointer; font-weight: 600; color: var(--text-muted); border-radius: 0.75rem 0.75rem 0 0; transition: all 0.2s; white-space: nowrap; margin-bottom: -2px; z-index: 1; }
        .tab-btn:hover { background: var(--bg-card); color: var(--text-main); border-color: var(--primary); }
        .tab-btn.active { background: var(--primary); color: white; border-color: var(--primary); border-bottom: 2px solid var(--primary); z-index: 10; }
        
        .sub-tabs-navigation { display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 1rem 1.5rem; background: rgba(59, 130, 246, 0.05); border: 2px solid var(--primary); border-top: none; border-radius: 0 0 1rem 1rem; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05); }
        .sub-tab-btn { background: var(--bg-card); border: 1px solid rgba(59, 130, 246, 0.3); padding: 0.5rem 1.25rem; border-radius: 2rem; font-size: 0.85rem; font-weight: 600; color: var(--primary); cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .sub-tab-btn:hover { background: var(--primary); color: white; border-color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); }
        
        /* BENTO GRID CSS */
        .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; grid-auto-rows: minmax(150px, auto); }
        .bento-card { background: var(--bg-card); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border-color); display: flex; flex-direction: column; position: relative; overflow: hidden; color: var(--text-main); }
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
        .pdf-placeholder { background: var(--bg-card); width: 100%; max-width: 800px; aspect-ratio: 1 / 1.414; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); border-radius: 4px; border: 1px solid var(--border-color); }
        
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
        .notification-dot { position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; border: 2px solid var(--bg-card); animation: pulse-dot 2s infinite; }
        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes pulse-new {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }

        /* --- RESPONSIVE & MOBILE OPTIMIZATIONS --- */
        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-card.col-span-2, .bento-card.col-span-3 { grid-column: span 1 !important; }
          .bento-card.row-span-2 { grid-row: auto !important; }
          .pitch-grid, .analysis-grid, .cv-content-split { grid-template-columns: 1fr !important; }
          .dashboard-wrapper { gap: 1rem !important; }
          .tabs-navigation { padding-bottom: 0.5rem; }
          .sub-tabs-navigation { padding: 0.75rem 1rem !important; justify-content: flex-start !important; flex-wrap: nowrap !important; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
          .sub-tabs-navigation::-webkit-scrollbar { display: none; }
          .bento-card { padding: 1.25rem !important; }
          
          /* Prévention des dépassements de texte (Mots/URL trop longs) */
          .bento-card p, .bento-card h3, .bento-card h4, .bento-card div { overflow-wrap: break-word; word-break: break-word; hyphens: auto; }
        }
      `}</style>
    </div>
  );
};