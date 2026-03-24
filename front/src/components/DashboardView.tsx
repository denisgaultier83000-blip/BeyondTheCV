import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { Activity, Target, Zap, AlertTriangle, TrendingUp, Download, Presentation, MessageSquare, ChevronRight, FileText, Sparkles, User, RefreshCw, LayoutTemplate, Mic, HelpCircle, ChevronDown, CheckCircle2, Lightbulb, Briefcase, Star, Building, Globe, Newspaper, Shield, LineChart, Wallet, X, Play, Loader2, Linkedin, Trophy, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import Dashboard from './Dashboard';
import Gauge from './Gauge';
import { FeedbackWidget } from './FeedbackWidget';
import { PilotBento } from './PilotBento';
import { GapAnalysisFull } from './GapAnalysisFull';
import { CVTab } from './CVTab';
import { InterviewTab } from './InterviewTab';
import { AnalysisTab } from './AnalysisTab';

export const DashboardView = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, pilotData, isPilotLoading, cvData, researchResult, salaryResult, globalStatus, setCurrentStep } = useDashboard();
  
  console.log("researchResult in DashboardView:", researchResult);

  // 💡 FIX ARCHITECTURAL : Initialisation intelligente du viewMode selon le contexte global
  const [viewMode, setViewMode] = useState<'pilot' | 'compact' | 'detailed'>(() => {
    // On force l'atterrissage sur la vue Pilote (Bento) selon les spécifications produit
    return 'pilot'; 
  });


  // Navigation fluide : si on bascule sur "Détaillé", on affiche le sous-onglet actif ou "cv" par défaut
  const handleSetViewMode = (mode: 'pilot' | 'compact' | 'detailed') => {
    setViewMode(mode);
    if (mode === 'detailed' && (activeTab === 'pilot' || activeTab === 'compact')) {
      setActiveTab('cv');
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* LE SÉLECTEUR STRICT DES 3 VUES POUR LE TEST */}
      <div className="view-mode-selector">
        <button className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => handleSetViewMode('compact')}>
          <LayoutTemplate size={20} /> Vue Compacte
        </button>
        <button className={`view-btn ${viewMode === 'detailed' ? 'active' : ''}`} onClick={() => handleSetViewMode('detailed')}>
          <FileText size={20} /> Vue Détaillée
        </button>
        <button className={`view-btn ${viewMode === 'pilot' ? 'active' : ''}`} onClick={() => handleSetViewMode('pilot')}>
          <Activity size={20} /> Vue Pilote
        </button>
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="tab-content">
        {/* 1. VUE PILOTE */}
        {viewMode === 'pilot' && (
          isPilotLoading ? (
            <div className="bento-grid">
               {/* Skeletons pour faire patienter */}
               <div className="bento-card row-span-2 skeleton-pulse" style={{ minHeight: '350px' }}></div>
               <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
               <div className="bento-card col-span-2 skeleton-pulse" style={{ minHeight: '150px' }}></div>
            </div>
          ) : <PilotBento data={pilotData} onGoToGap={() => { handleSetViewMode('detailed'); setActiveTab('gap'); }} />
        )}

        {/* 2. VUE COMPACTE */}
        {viewMode === 'compact' && (
          <Dashboard 
            data={cvData || {}}
            experiences={cvData?.experiences || []}
            educations={cvData?.educations || []}
            loading={globalStatus === "PROCESSING" || globalStatus === "STARTING"}
            onBack={() => setCurrentStep(7)}
            salaryData={salaryResult}
            researchData={researchResult}
            gapAnalysis={pilotData}
            onAction={(action) => {
              handleSetViewMode('detailed');
              if (action.includes('CV')) setActiveTab('cv');
              else if (action.includes('Pitch') || action.includes('Questionnaire')) setActiveTab('interview');
              else if (action.includes('Gap')) setActiveTab('gap');
              else setActiveTab('analysis');
            }}
          />
        )}

        {/* 3. VUE DÉTAILLÉE (Avec sous-navigation) */}
        {viewMode === 'detailed' && (
          <div className="detailed-view-wrapper">
            <div className="tabs-navigation">
              <button className={`tab-btn ${activeTab === 'cv' ? 'active' : ''}`} onClick={() => setActiveTab('cv')}><Target size={16} /> CV & ATS</button>
              <button className={`tab-btn ${activeTab === 'interview' ? 'active' : ''}`} onClick={() => setActiveTab('interview')}><MessageSquare size={16} /> Entretien</button>
              <button className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}><TrendingUp size={16} /> Analyses</button>
              <button className={`tab-btn ${activeTab === 'gap' ? 'active' : ''}`} onClick={() => setActiveTab('gap')}><AlertTriangle size={16} /> Gap Analysis</button>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              {activeTab === 'cv' && <CVTab data={pilotData} />}
              {activeTab === 'interview' && <InterviewTab />}
              {activeTab === 'analysis' && <AnalysisTab researchResult={researchResult} salaryResult={salaryResult} />}
              {activeTab === 'gap' && <GapAnalysisFull data={pilotData} onBack={() => handleSetViewMode('pilot')} />}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-wrapper { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
        
        /* Sélecteur principal des 3 Vues - RENDU EXTRÊMEMENT VISIBLE ET HARMONISÉ */
        .view-mode-selector { display: flex; gap: 1rem; justify-content: center; background: var(--bg-card); padding: 1rem; border-radius: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid var(--border-color); margin-bottom: 1rem; }
        .view-btn { flex: 1; max-width: 280px; display: flex; justify-content: center; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 0.75rem; font-weight: 700; color: var(--text-main); cursor: pointer; transition: all 0.2s; font-size: 1.05rem; }
        .view-btn:hover { border-color: var(--primary); background: var(--bg-card); transform: translateY(-2px); }
        .view-btn.active { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); transform: translateY(0); }
        
        .tabs-navigation { display: flex; gap: 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 1rem; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; color: var(--text-muted); border-radius: 0.5rem; transition: all 0.2s; }
        .tab-btn:hover { background: var(--bg-secondary); color: var(--text-main); }
        .tab-btn.active { background: var(--primary); color: white; }
        
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
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};