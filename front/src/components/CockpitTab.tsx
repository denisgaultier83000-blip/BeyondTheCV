import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Clock, Zap, Target, CheckCircle2, Circle } from 'lucide-react';

interface TrainingModule {
  day: string;
  module: string;
  duration_minutes: number;
}

interface ActionTask {
  task: string;
  advice: string;
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

      <div className="bento-card">
        <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} color="#f59e0b" />
          Feuille de Route (Plan de Bataille)
        </h3>
        
        <div style={{ position: 'relative', borderLeft: '2px solid var(--border-color)', marginLeft: '12px', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* PHASE 1: IMMÉDIAT (Action Plan) */}
          {plan.length > 0 && (
            <div style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', width: '16px', height: '16px', background: '#f59e0b', borderRadius: '50%', left: '-33px', top: '2px', border: '3px solid var(--bg-card)' }}></div>
               <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Phase 1 : Actions Immédiates (Aujourd'hui)
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                          opacity: isChecked ? 0.7 : 1
                        }}
                      >
                        <div style={{ marginTop: '2px', color: isChecked ? 'var(--success)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                          {isChecked ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: isChecked ? 'var(--text-muted)' : 'var(--text-main)', textDecoration: isChecked ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item.task}</h4>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.advice}</p>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}

          {/* PHASE 2: ENTRAINEMENT (Training Plan) */}
          {training.length > 0 && (
            <div style={{ position: 'relative' }}>
               <div style={{ position: 'absolute', width: '16px', height: '16px', background: 'var(--primary)', borderRadius: '50%', left: '-33px', top: '2px', border: '3px solid var(--bg-card)' }}></div>
               <div style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Phase 2 : Entraînement Régulier
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {training.map((planItem, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {planItem.day}
                         </div>
                         <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.95rem' }}>{planItem.module}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', whiteSpace: 'nowrap' }}>
                        {planItem.duration_minutes} {t('cockpit_duration', 'min')}
                      </span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {plan.length === 0 && training.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Génération en cours ou données non disponibles...</p>
          )}
        </div>
      </div>
    </div>
  );
};