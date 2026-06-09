import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, Zap, Target, CheckCircle2, Circle, Mic, CalendarDays, Timer, Lock } from 'lucide-react';

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
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  // Sécurisation des données en cas de génération partielle de l'IA
  const plan = actionPlanData?.action_plan || [];
  const training = actionPlanData?.training_plan || [];
  const advice = actionPlanData?.strategy_advice || "Aucun conseil stratégique disponible pour le moment.";
  
  const dateStr = interviewDate || "";
  const displayDate = dateStr ? `Entretien : ${dateStr}` : "Date non définie";

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  return (
    <div className="animate-fade-in w-full" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. EN-TÊTE WAR ROOM & POSTURE */}
      <div className="bento-card" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <Target size={24} color="var(--primary)" />
            {t('cockpit_title', 'Cockpit Stratégique')}
          </h2>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-text)', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <Clock size={16} />
            {displayDate}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0' }}>
            <ShieldAlert size={16} />
            {t('cockpit_strategy_title', "Conseil Stratégique d'Urgence")} ({interviewFormat} - {interviewTarget})
          </h3>
          <p style={{ color: 'var(--text-main)', margin: 0, lineHeight: 1.6, fontSize: '0.95rem' }}>
            {advice}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
        
        {/* PHASE 1: IMMÉDIAT (Action Plan) */}
        <div className="bento-card" style={{ borderTop: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Zap size={20} />
            Actions Commando (One-Off)
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>À faire immédiatement pour sécuriser votre préparation logistique.</p>
          
          {plan.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {plan.map((item, idx) => {
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
            <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '0.75rem' }}></div>
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
              {training.map((planItem, idx) => {
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
                    </div>
                    
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 700, background: isUpcoming ? '#f1f5f9' : 'rgba(139, 92, 246, 0.1)', color: accentColor, padding: '0.3rem 0.6rem', borderRadius: '1rem', whiteSpace: 'nowrap' }}>
                      {isUpcoming ? 'Prochaine étape' : `${planItem.duration_minutes} min`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="skeleton-pulse" style={{ height: '200px', borderRadius: '0.75rem' }}></div>
          )}
        </div>
      </div>
    </div>
  );
};