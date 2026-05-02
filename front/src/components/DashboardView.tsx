import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from './DashboardContext';
import { Activity, Target, AlertTriangle, MessageSquare, FileText, Globe, Compass, Mic, Search, Eye, Navigation, Network, Loader2, RotateCcw, CheckSquare, Dumbbell, ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PilotBento } from './PilotBento';
import { GapAnalysisFull } from './GapAnalysisFull';
import { CVTab } from './CVTab';
import { InterviewTab } from './InterviewTab';
import { AnalysisTab } from './AnalysisTab';
import { CareerGPS } from './CareerGPS';
import { CareerRadar } from './CareerRadar';
import { JobDecoder } from './JobDecoder';
import { HiddenMarket } from './HiddenMarket';
import { CareerRealityCheck } from './CareerRealityCheck';
import { CareerSimulator } from './CareerSimulator';
import { RecruiterView } from './RecruiterView';
import { DashboardCard } from './DashboardCard';
import FlawCoaching from './FlawCoaching';
import { ToDoListCard } from './ToDoListCard';
import TrainingTab from './TrainingTab';

export const DashboardView = () => {
  const { t } = useTranslation();
  const { 
    activeTab, setActiveTab, pilotData, isPilotLoading, cvData, fetchPilotData,
    researchResult, salaryResult, careerGpsResult, careerRadarResult, setCurrentStep,
    jobDecoderResult, hiddenMarketResult, recruiterResult, realityResult, flawCoachingResult,
    globalStatus, triggerResearch,
    pitchResult, questionsResult, cvResult, gapResult, actionPlanResult
  } = useDashboard();

  // --- GESTION DES NOTIFICATIONS ---
  const [viewedTabs, setViewedTabs] = useState<string[]>(['overview']);
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const subMenus: Record<string, {label: string, id: string}[]> = {
    interview: [
      { label: t('submenu_pitch', 'Pitch'), id: 'pitch_section' },
      { label: t('submenu_questionnaire', 'Questionnaire'), id: 'questionnaire_section' },
      { label: t('submenu_mes', 'Mises en situation'), id: 'mes_section' },
      { label: t('submenu_flaws', 'Parades aux Défauts'), id: 'flaws_section' }
    ],
    market: [
      { label: t('submenu_gap', 'Gap Analysis'), id: 'gap_section' },
      { label: t('submenu_market', 'Entreprise & Marché'), id: 'analysis_section' },
      { label: t('submenu_decoder', 'Décodeur d\'Annonce'), id: 'decoder_section' }
    ],
    career: [
      { label: t('submenu_recruiter', 'Vue Recruteur'), id: 'recruiter_section' },
      { label: t('submenu_gps', 'GPS de Carrière'), id: 'gps_section' },
      { label: t('submenu_radar', 'Radar de Carrière'), id: 'radar_section' },
      { label: t('submenu_hidden', 'Marché Caché'), id: 'hidden_section' },
      { label: t('submenu_simulator', 'Simulateur'), id: 'simulator_section' }
    ]
  };

  const isProcessing = globalStatus === "PROCESSING" || globalStatus === "STARTING";

  // Liste de tous les livrables avec leur état
  const deliverableItems = [
    { name: t('deliv_cv', "CV & ATS"), tab: "cv", data: cvResult, icon: <FileText size={18}/> },
    { name: t('deliv_pitch', "Pitch de 3 minutes"), tab: "interview", anchor: "pitch_section", data: pitchResult, icon: <Mic size={18}/> },
    { name: t('deliv_questions', "Questions d'Entretien"), tab: "interview", anchor: "questionnaire_section", data: questionsResult, icon: <MessageSquare size={18}/> },
    { name: t('deliv_flaws', "Parades aux Défauts"), tab: "interview", anchor: "flaws_section", data: flawCoachingResult, icon: <AlertTriangle size={18}/> },
    { name: t('deliv_gap', "Analyse d'Écarts (Gap)"), tab: "market", anchor: "gap_section", data: gapResult, icon: <Target size={18}/> },
    { name: t('deliv_market', "Rapport Entreprise & Marché"), tab: "market", anchor: "analysis_section", data: researchResult, icon: <Globe size={18}/> },
    { name: t('deliv_decoder', "Décodeur d'Annonce"), tab: "market", anchor: "decoder_section", data: jobDecoderResult, icon: <Search size={18}/> },
    { name: t('deliv_recruiter', "Vue Recruteur"), tab: "career", anchor: "recruiter_section", data: recruiterResult, icon: <Eye size={18}/> },
    { name: t('deliv_gps', "GPS de Carrière"), tab: "career", anchor: "gps_section", data: careerGpsResult, icon: <Navigation size={18}/> },
    { name: t('deliv_radar', "Radar de Carrière"), tab: "career", anchor: "radar_section", data: careerRadarResult, icon: <Compass size={18}/> },
    { name: t('deliv_hidden', "Marché Caché"), tab: "career", anchor: "hidden_section", data: hiddenMarketResult, icon: <Network size={18}/> },
    { name: t('deliv_todo', "To-Do List d'Action"), tab: "actions", data: actionPlanResult, icon: <CheckSquare size={18}/> }
  ];

  // Calcul des pastilles par onglet
  const hasUnseen = (tabName: string, items: any[]) => {
    if (viewedTabs.includes(tabName)) return false;
    return items.some(item => !!item);
  };

  const cvUnseen = hasUnseen('cv', [cvResult]);
  const interviewUnseen = hasUnseen('interview', [pitchResult, questionsResult, flawCoachingResult]);
  const marketUnseen = hasUnseen('market', [gapResult, researchResult, jobDecoderResult]);
  const careerUnseen = hasUnseen('career', [careerGpsResult, careerRadarResult, hiddenMarketResult, recruiterResult]);
  const actionsUnseen = hasUnseen('actions', [actionPlanResult]);

  // [FIX CRITIQUE] On force le chargement du résumé si les données sont absentes pour briser la boucle de crash
  useEffect(() => {
    if (activeTab === 'overview' && !pilotData && typeof fetchPilotData === 'function') {
      fetchPilotData();
    }
  }, [activeTab, pilotData, fetchPilotData]);

  // La condition de chargement est maintenant robuste grâce à l'état explicite `isPilotLoading`
  const isLoadingOverview = isPilotLoading || !pilotData;

  return (
    <div className="dashboard-wrapper">
      {/* GROUPE NAVIGATION : Onglets + Sous-menus collés */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className={`tabs-navigation ${subMenus[activeTab] ? 'has-sub' : ''}`}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
          <Activity size={18} /> {t('tab_overview', "Vue d'ensemble")}
        </button>
        <button className={`tab-btn ${activeTab === 'cv' ? 'active' : ''}`} onClick={() => handleTabChange('cv')} style={{ position: 'relative' }}>
          <FileText size={18} /> {t('tab_cv_ats', "CV & ATS")} {cvUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => handleTabChange('interview')} style={{ position: 'relative' }}>
          <MessageSquare size={18} /> {t('tab_interview_short', "Entretien")} {interviewUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => handleTabChange('market')} style={{ position: 'relative' }}>
          <Globe size={18} /> {t('tab_market_offer', "Marché & Offre")} {marketUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'career' ? 'active' : ''}`} onClick={() => handleTabChange('career')} style={{ position: 'relative' }}>
          <Compass size={18} /> {t('tab_strategy', "Stratégie & Trajectoires")} {careerUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => handleTabChange('actions')} style={{ position: 'relative' }}>
          <CheckSquare size={18} /> {t('tab_actions', "Actions")} {actionsUnseen && <span className="notification-dot"></span>}
        </button>
        <button className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`} onClick={() => handleTabChange('training')}>
          <Dumbbell size={18} /> {t('tab_training', "S'entrainer")}
        </button>
      </div>

      {/* SOUS-MENUS */}
      {subMenus[activeTab] && (
        <div className="sub-tabs-navigation">
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
        {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* [FIX ARCHITECTURE] Le Hub est sorti de la condition de chargement. 
                  Il s'affiche instantanément. Les analyses terminées en amont (ex: Marché) 
                  seront cliquables immédiatement sans attendre la synthèse IA. */}
              <div className="bento-card col-span-3" style={{ background: 'var(--bg-card)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div className="bento-header" style={{ marginBottom: '0.5rem' }}><Activity size={20} color="var(--primary)"/> {t('hub_title', 'Centre de Suivi des Analyses')}</div>
                 </div>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 1.5rem 0' }}>{t('hub_desc', 'Suivez la génération de vos outils en temps réel et cliquez pour y accéder.')}</p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {deliverableItems.map((item, idx) => {
                       const isReady = !!item.data;
                       const isPending = isProcessing && !isReady;
                       const isNew = isReady && !viewedTabs.includes(item.tab);
                       return (
                          <div key={idx} onClick={() => handleTabChange(item.tab, (item as any).anchor)} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${isReady ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: isPending ? 0.7 : 1, transition: 'all 0.2s', boxShadow: isNew ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none' }} onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseOut={(e) => (e.currentTarget.style.transform = 'none')}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: isReady ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isReady ? 600 : 400 }}>
                                <div style={{ color: isReady ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}>{item.icon}</div>
                                <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
                             </div>
                             {isNew ? (
                                <span style={{ background: '#ef4444', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700, animation: 'pulse-new 2s infinite' }}>{t('badge_new', 'NEW')}</span>
                             ) : isReady ? (
                                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>{t('badge_ready', 'PRÊT')}</span>
                             ) : isPending ? (
                                <Loader2 size={16} className="spin" color="var(--text-muted)" />
                             ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('badge_pending', 'En attente')}</span>
                             )}
                          </div>
                       );
                    })}
                 </div>
              </div>

              {/* Seules les cartes dépendantes de la synthèse affichent le Skeleton */}
              {isLoadingOverview ? (
                <div className="bento-grid">
                   <div className="bento-card row-span-2 skeleton-pulse" style={{ minHeight: '350px' }}></div>
                   <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
                   <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
                </div>
              ) : (
                <>
                  <PilotBento 
                      data={pilotData} 
                      careerRadarData={careerRadarResult}
                      careerGpsData={careerGpsResult}
                      onGoToGap={() => handleTabChange('market')} 
                      onGoToRadar={() => handleTabChange('career')}
                      onGoToGps={() => handleTabChange('career')}
                  />
                  <CareerRealityCheck data={realityResult} score={pilotData?.matchScore} loading={isProcessing && !realityResult} />
                </>
              )}
            </div>
        )}
        
        {activeTab === 'cv' && (
           <CVTab data={pilotData} />
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
             <div id="analysis_section">
               <AnalysisTab researchResult={researchResult} salaryResult={salaryResult} onRefresh={triggerResearch} isRefreshing={globalStatus === "PROCESSING"} />
             </div>
             <div id="decoder_section">
               <JobDecoder data={jobDecoderResult} loading={isProcessing && !jobDecoderResult} />
             </div>
           </div>
        )}

        {activeTab === 'career' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <div id="recruiter_section">
               <RecruiterView data={recruiterResult} loading={isProcessing && !recruiterResult} />
             </div>
             <div id="gps_section">
               <DashboardCard title="GPS de Carrière" icon={<Navigation size={24} />} featureId="career_gps" loading={isProcessing && !careerGpsResult} error={!isProcessing && !careerGpsResult}>
                 <CareerGPS data={careerGpsResult} />
               </DashboardCard>
             </div>
             <div id="radar_section">
               <DashboardCard title="Radar de Carrière" icon={<Compass size={24} />} featureId="career_radar" loading={isProcessing && !careerRadarResult} error={!isProcessing && !careerRadarResult}>
                 <CareerRadar data={careerRadarResult} />
               </DashboardCard>
             </div>
             <div id="hidden_section">
               <DashboardCard title="Marché Caché & Réseau" icon={<Network size={24} />} featureId="hidden_market" loading={isProcessing && !hiddenMarketResult} error={!isProcessing && !hiddenMarketResult}>
                 <HiddenMarket data={hiddenMarketResult} />
               </DashboardCard>
             </div>
             <div id="simulator_section">
               <CareerSimulator candidateData={cvData} />
             </div>
           </div>
        )}

        {activeTab === 'actions' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <ToDoListCard data={actionPlanResult} loading={isProcessing && !actionPlanResult} />
           </div>
        )}

        {activeTab === 'training' && (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
             <TrainingTab />
           </div>
        )}
      </div>

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
        
        .template-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
        .template-btn { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; border: 2px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-card); cursor: pointer; transition: 0.2s; color: var(--text-muted); }
        .template-btn:hover { border-color: var(--primary); }
        .template-btn.active { border-color: var(--primary); color: var(--primary); background: rgba(59, 130, 246, 0.1); }
        
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
      `}</style>
    </div>
  );
};