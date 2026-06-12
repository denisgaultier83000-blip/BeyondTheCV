import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, Zap, Target, CheckCircle2, Circle, Mic, CalendarDays, Timer, Lock, RefreshCw, Loader2, AlertTriangle, Flame, Activity } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useDashboard } from './DashboardContext';
import OralSimulatorModal from './OralSimulatorModal';

interface TrainingModule {
  day: string;
  module: string;
  duration_minutes: number;
  stage?: 'current' | 'upcoming';
  focus?: string;
}

interface ActionTask {
  task: string;
  advice: string;
  estimated_duration?: string;
}

interface CockpitProps {
  actionPlanData: {
    action_plan?: ActionTask[];
    training_plan?: TrainingModule[];
    strategy_advice?: string;
  };
  interviewDate: string;
  interviewFormat: string;
  interviewTarget: string;
}

export const CockpitTab: React.FC<CockpitProps> = ({ 
  actionPlanData, 
  interviewDate, 
  interviewFormat, 
  interviewTarget 
}) => {
  const { t } = useTranslation();
  const { cvData, updateFormData } = useDashboard();
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localData, setLocalData] = useState(actionPlanData);
  const [error, setError] = useState<string | null>(null);
  const [isOralModalOpen, setIsOralModalOpen] = useState(false);

  useEffect(() => {
    setLocalData(actionPlanData);
  }, [actionPlanData]);

  const handleRegenerate = async () => {
    if (!window.confirm("Voulez-vous forcer l'IA à calculer une nouvelle stratégie d'action ?")) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/regenerate/action-plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cvData)
      });
      if (!res.ok) throw new Error("Erreur réseau");
      const newData = await res.json();
      setLocalData(newData);
      if (updateFormData) updateFormData('actionPlanResult', newData);
    } catch (e) {
      setError("Erreur lors de la regénération. Veuillez réessayer.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Sécurisation des données en cas de génération partielle de l'IA
  const getParsedData = (data: any) => {
    if (!data) return {};
    let parsed = (data as any).result !== undefined ? (data as any).result : data;
    let depth = 0;
    // Boucle pour casser la double-stringification (très fréquent avec les données stockées en JSONB)
    while (typeof parsed === 'string' && depth < 5) {
      try {
        const match = parsed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        parsed = JSON.parse(match ? match[1] : parsed);
        depth++;
      } catch(e) {
        break;
      }
    }
    return parsed || {};
  };

  const actualData = getParsedData(localData);
  const plan: ActionTask[] = actualData.action_plan || actualData.actionPlan || [];
  const training: TrainingModule[] = actualData.training_plan || actualData.trainingPlan || [];
  const advice = actualData.strategy_advice || actualData.strategyAdvice || "Aucun conseil stratégique disponible pour le moment.";
  
  const dateStr = interviewDate || "";
  const displayDate = dateStr ? `Entretien : ${dateStr}` : "Date non définie";

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleVocalScoreUpdate = (score: number) => {
    const currentBest = cvData?.bestVocalScore || 0;
    if (score > currentBest) {
      if (updateFormData) updateFormData('bestVocalScore', score);
    }
  };

  // Calcul de la jauge de préparation
  const bestVocalScore = cvData?.bestVocalScore || 0;
  const actionScore = plan.length > 0 ? (checkedItems.length / plan.length) * 100 : 0;
  
  let progressPercentage = 0;
  if (plan.length > 0 && training.length > 0) {
    progressPercentage = Math.round((actionScore + bestVocalScore) / 2);
  } else if (plan.length > 0) {
    progressPercentage = Math.round(actionScore);
  } else if (training.length > 0) {
    progressPercentage = Math.round(bestVocalScore);
  }
  const readinessColor = progressPercentage === 100 ? '#10b981' : progressPercentage >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="animate-fade-in w-full" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. EN-TÊTE WAR ROOM & POSTURE */}
      <div className="bento-card" style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Target size={24} color="#6DBEF7" />
            {t('cockpit_title', 'Cockpit Stratégique')}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleRegenerate} disabled={isRegenerating} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '2rem', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
              {isRegenerating ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} {isRegenerating ? "Calcul IA..." : "Régénérer"}
            </button>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-text)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <Activity size={16} style={{ animation: 'pulse 2s infinite' }} /> {displayDate}
            </div>
          </div>
        </div>

        {/* Jauge de Préparation Globale */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Niveau de Préparation</span>
            <span style={{ fontWeight: 800, color: readinessColor, fontSize: '1.1rem' }}>{progressPercentage}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <div style={{ width: `${progressPercentage}%`, height: '100%', background: readinessColor, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.5s ease' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
            <span>Logistique : {Math.round(actionScore)}%</span>
            <span>Oral : {Math.round(bestVocalScore)}%</span>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0' }}>
            <ShieldAlert size={16} style={{ animation: 'pulse 2s infinite' }} />
            {t('cockpit_strategy_title', "Conseil Stratégique d'Urgence")} ({interviewFormat} - {interviewTarget})
          </h3>
          <p style={{ color: 'var(--text-main)', margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>
            {advice}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
        
        {/* PHASE 1: IMMÉDIAT (Action Plan) */}
        <div className="bento-card" style={{ borderTop: '4px solid #ef4444', boxShadow: '0 4px 20px -5px rgba(239, 68, 68, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Flame size={20} />
                Actions Prioritaires
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>À faire immédiatement pour sécuriser la logistique.</p>
            </div>
            <div style={{ background: progressPercentage === 100 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)', color: progressPercentage === 100 ? '#10b981' : 'var(--text-muted)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 700, border: `1px solid ${progressPercentage === 100 ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}` }}>
              {checkedItems.length} / {plan.length}
            </div>
          </div>
          
          {plan.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {plan.map((item: ActionTask, idx: number) => {
                const isChecked = checkedItems.includes(idx);
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleCheck(idx)}
                    style={{ 
                      display: 'flex', gap: '1rem', padding: '1rem', 
                      background: isChecked ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-secondary)', 
                      borderRadius: '0.75rem', 
                      border: `1px solid ${isChecked ? 'var(--success)' : 'var(--border-color)'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      opacity: isChecked ? 0.6 : 1,
                      boxShadow: isChecked ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ marginTop: '2px', color: isChecked ? 'var(--success)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                      {isChecked ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ margin: 0, fontWeight: 700, color: isChecked ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isChecked ? 'line-through' : 'none', transition: 'all 0.2s', fontSize: '1rem' }}>{item.task}</h4>
                        {item.estimated_duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                            <Timer size={12} /> {item.estimated_duration}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, textDecoration: isChecked ? 'line-through' : 'none' }}>{item.advice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {(localData as any)?.status === 'PENDING' || (localData as any)?.status === 'PROCESSING' ? <><Loader2 className="spin" size={18} style={{ marginRight: '8px' }} /> Stratégie d'actions en cours de calcul...</> : "Aucune action disponible."}
            </div>
          )}
        </div>

        {/* PHASE 2: ENTRAINEMENT (Training Plan) */}
        <div className="bento-card" style={{ borderTop: '4px solid #8b5cf6' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Mic size={20} />
            Rituels Vocaux (Répétitions)
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>Votre routine quotidienne. La maîtrise vient par la répétition à voix haute.</p>
          
          {training.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {training.map((planItem: TrainingModule, idx: number) => {
                const isUpcoming = planItem.stage === 'upcoming';
                const accentColor = isUpcoming ? '#94a3b8' : '#8b5cf6'; // Gris ardoise si futur, sinon Violet
                
                return (
                  <div key={idx} style={{ background: isUpcoming ? 'var(--bg-card)' : 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: `1px ${isUpcoming ? 'dashed' : 'solid'} var(--border-color)`, display: 'flex', gap: '1rem', alignItems: 'flex-start', opacity: isUpcoming ? 0.7 : 1 }}>
                    {/* Icon Calendrier stylisé */}
                    <div style={{ background: isUpcoming ? 'transparent' : '#f8fafc', border: `1px solid ${isUpcoming ? 'transparent' : '#e2e8f0'}`, borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', minWidth: '55px', flexShrink: 0 }}>
                      <div style={{ background: accentColor, color: 'white', width: '100%', fontSize: '0.65rem', fontWeight: 800, textAlign: 'center', padding: '0.2rem 0', textTransform: 'uppercase' }}>
                        {isUpcoming ? <Lock size={12} style={{ margin: '0 auto' }} /> : "JOUR"}
                      </div>
                      <div style={{ padding: '0.4rem 0', fontWeight: 800, color: isUpcoming ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '0.9rem' }}>{planItem.day.replace('J-', '-')}</div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: isUpcoming ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '1rem' }}>{planItem.module}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{planItem.focus || "Répétez cet exercice chronométré à voix haute."}</p>
                      {isUpcoming && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>💡</span> Cette étape s'activera lors de votre prochain round d'entretien. Concentrez-vous sur l'immédiat !
                        </div>
                      )}
                      
                      <button 
                        onClick={() => setIsOralModalOpen(true)}
                        className={`btn-outline ${isUpcoming ? '' : 'active'}`}
                        style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: '2rem', background: isUpcoming ? 'transparent' : 'var(--primary)', color: isUpcoming ? 'var(--text-muted)' : 'white', border: `1px solid ${isUpcoming ? 'var(--border-color)' : 'var(--primary)'}`, transition: 'all 0.2s', cursor: 'pointer' }}
                      >
                        <Mic size={14} /> S'entraîner avec le Coach IA
                      </button>
                    </div>
                    
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, background: isUpcoming ? '#f1f5f9' : 'rgba(139, 92, 246, 0.1)', color: accentColor, padding: '0.3rem 0.6rem', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                      {isUpcoming ? 'Prochaine étape' : `${planItem.duration_minutes} min`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {(localData as any)?.status === 'PENDING' || (localData as any)?.status === 'PROCESSING' ? <><Loader2 className="spin" size={18} style={{ marginRight: '8px' }} /> Planification de l'entraînement en cours...</> : "Aucun entraînement disponible."}
            </div>
          )}
        </div>
      </div>

      <OralSimulatorModal 
        isOpen={isOralModalOpen} 
        onClose={() => setIsOralModalOpen(false)} 
        targetJob={interviewTarget} 
        targetLanguage={cvData?.target_language || 'fr'} 
        onScoreUpdate={handleVocalScoreUpdate}
      />
    </div>
  );
};