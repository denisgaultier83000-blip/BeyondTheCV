import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { Activity, Target, AlertTriangle, MessageSquare, FileText, Globe, Navigation, Search, Loader2, Building, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PilotBento } from './PilotBento';
import { CareerRealityCheck } from './CareerRealityCheck';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';

export const DashboardView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // [EXPERT FIX] V2 : Source de vérité unique via le routeur. 
  // On s'affranchit de DashboardContext.
  const { applicationData } = useOutletContext<any>() || {};
  const appData = applicationData?.data || {};

  // Extraction des résultats
  const cvData = appData.cvData;
  const cvResult = appData.cvResult;
  const pitchResult = appData.pitchResult;
  const questionsResult = appData.questionsResult;
  const customScenariosResult = appData.customScenariosResult;
  const flawCoachingResult = appData.flawCoachingResult;
  const gapResult = appData.gapResult;
  const researchResult = appData.researchResult;
  const jobDecoderResult = appData.jobDecoderResult;
  const careerGpsResult = appData.careerGpsResult;
  const careerRadarResult = appData.careerRadarResult;
  const realityResult = appData.realityResult;
  const globalStatus = appData.globalStatus || applicationData?.application?.status || 'COMPLETED';

  const isProcessing = globalStatus === "PROCESSING" || globalStatus === "STARTING";

  // [EXPERT FIX] Gestion locale de la synthèse IA (PilotBento) pour briser la dépendance à la V1
  const [pilotData, setPilotData] = useState<any>(null);
  const [isPilotLoading, setIsPilotLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchPilotData = async () => {
      if (!cvData) return;
      setIsPilotLoading(true);
      try {
        const payload = { ...cvData };
        if (researchResult) payload.research_data = researchResult;
        if (gapResult) payload.gap_analysis = gapResult;

        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/dashboard/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const data = await response.json();
          setPilotData(data);
        }
      } catch (error) {
        console.error("[DashboardView] Error fetching pilot data:", error);
      } finally {
        setIsPilotLoading(false);
      }
    };

    if (!pilotData) fetchPilotData();
  }, [cvData, researchResult, gapResult, pilotData]);

  const isDataReady = (data: any) => {
    if (!data) return false;
    if (data.status === "pending" || data.status === "PENDING" || data.status === "processing") return false;
    if (data.error) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') return Object.keys(data).length > 0;
    return true;
  };

  const hasJobDesc = !!(cvData?.job_description && cvData.job_description.trim().length > 0);

  // [EXPERT FIX] Mapping direct vers les URLs gérées par DossierLayout (V2)
  const deliverableItems = [
    { name: t('deliv_cv', "CV ATS"), path: "cv", data: cvResult, icon: <FileText size={18}/> },
    { name: t('deliv_pitch', "Pitch de 3 minutes"), path: "pitch", data: pitchResult, icon: <Mic size={18}/> },
    { name: t('deliv_questions', "Questions d'Entretien"), path: "questions-reponses", data: questionsResult, icon: <MessageSquare size={18}/> },
    { name: t('deliv_mes', "Mises en situation"), path: "mises-en-situation", data: customScenariosResult || cvData, icon: <ShieldAlert size={18}/> },
    { name: t('deliv_flaws', "Parades aux Défauts"), path: "defauts", data: flawCoachingResult, icon: <AlertTriangle size={18}/> },
    { name: t('deliv_gap', "Analyse d'Écarts (Gap)"), path: "marche", data: gapResult, icon: <Target size={18}/> },
    { name: t('deliv_company', "Rapport Entreprise"), path: "entreprise", data: researchResult, icon: <Building size={18}/> },
    { name: t('deliv_market', "Rapport Marché"), path: "marche", data: researchResult, icon: <Globe size={18}/> },
    { 
      name: t('deliv_decoder', "Décodeur d'Annonce"), 
      path: "marche", 
      data: jobDecoderResult, 
      icon: <Search size={18}/>,
      disabled: !hasJobDesc,
      disabledReason: t('card_decoder_disabled', "Annonce non renseignée.")
    },
    { name: t('deliv_gps', "GPS de Carrière"), path: "marche", data: careerGpsResult, icon: <Navigation size={18}/> }
  ];

  return (
    <div className="dashboard-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* HUB DES LIVRABLES */}
        <div className="bento-card col-span-3" style={{ background: 'var(--bg-card)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
             <div className="bento-header" style={{ marginBottom: 0 }}><Activity size={20} color="var(--primary)"/> {t('hub_title', 'Centre de Suivi des Analyses')}</div>
           </div>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0 0 1rem 0' }}>{t('hub_desc', 'Suivez la génération de vos outils en temps réel et cliquez pour y accéder.')}</p>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {deliverableItems.map((item, idx) => {
                 const isReady = isDataReady(item.data) && !item.disabled;
                 const isPending = isProcessing && !isReady && !item.disabled;
                 return (
                    <div 
                       key={idx} 
                       onClick={() => isReady && navigate(`/app/recherches/${id}/${item.path}`)} 
                       style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: `1px solid ${isReady ? 'var(--primary)' : 'var(--border-color)'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: item.disabled ? 'not-allowed' : (isReady ? 'pointer' : 'default'), opacity: item.disabled ? 0.5 : (isPending ? 0.7 : 1), transition: 'all 0.2s' }} 
                       onMouseOver={(e) => isReady && (e.currentTarget.style.transform = 'translateY(-2px)')} 
                       onMouseOut={(e) => isReady && (e.currentTarget.style.transform = 'none')}
                    >
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: isReady ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isReady ? 600 : 400 }}>
                             <div style={{ color: isReady ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}>{item.icon}</div>
                             <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
                          </div>
                          {item.disabled ? null : isReady ? (
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

        {/* BENTO GRID (SYNTHESE IA) */}
        {isPilotLoading || !pilotData ? (
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
                onGoToGap={() => navigate(`/app/recherches/${id}/entreprise`)} 
                onGoToRadar={() => navigate(`/app/recherches/${id}/marche`)}
                onGoToGps={() => navigate(`/app/recherches/${id}/marche`)}
            />
            <CareerRealityCheck data={realityResult} score={pilotData?.matchScore} loading={isProcessing && !realityResult} />
          </>
        )}
      </div>

      <style>{`
        .dashboard-wrapper { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
        .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; grid-auto-rows: minmax(150px, auto); }
        .bento-card { background: var(--bg-card); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border-color); display: flex; flex-direction: column; position: relative; overflow: hidden; color: var(--text-main); }
        .bento-card.col-span-2 { grid-column: span 2; }
        .bento-card.col-span-3 { grid-column: span 3; }
        .bento-card.row-span-2 { grid-row: span 2; }
        .bento-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; font-weight: 700; color: var(--text-main); font-size: 1.1rem; }
        .skeleton-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; background: #e2e8f0; border: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .spin { animation: spin 1s linear infinite; } 
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};