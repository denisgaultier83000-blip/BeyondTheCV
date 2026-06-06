import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, CalendarDays, Clock, Zap, Target } from 'lucide-react';

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

  // Sécurisation des données en cas de génération partielle de l'IA
  const plan = actionPlanData?.action_plan || [];
  const training = actionPlanData?.training_plan || [];
  const advice = actionPlanData?.strategy_advice || "Aucun conseil stratégique disponible pour le moment.";

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
            {t('cockpit_countdown_prefix', 'Entretien dans')} {interviewDate}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* 2. LA TO-DO LIST (ACTION PLAN) */}
        <div className="bento-card" style={{ height: '100%' }}>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="#f59e0b" />
            {t('cockpit_action_plan_title', "Plan d'Action Immédiat")}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {plan.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <div style={{ marginTop: '0.1rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {idx + 1}
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: 'var(--text-main)' }}>{item.task}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.advice}</p>
                </div>
              </div>
            ))}
            {plan.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Génération en cours ou données non disponibles...</p>
            )}
          </div>
        </div>

        {/* 3. LE PLAN D'ENTRAÎNEMENT (TRAINING PLAN) */}
        <div className="bento-card" style={{ height: '100%' }}>
          <h3 style={{ fontSize: '1.25rem', margin: '0 0 1.5rem 0', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={20} color="var(--primary)" />
            {t('cockpit_training_plan_title', "Votre Entraînement Jour par Jour")}
          </h3>
          <div style={{ position: 'relative', borderLeft: '2px solid var(--border-color)', marginLeft: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {training.map((planItem, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', left: '-27px', top: '4px', border: '2px solid var(--bg-card)' }}></div>
                <div style={{ marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {planItem.day}
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.95rem' }}>{planItem.module}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', whiteSpace: 'nowrap' }}>
                    {planItem.duration_minutes} {t('cockpit_duration', 'min')}
                  </span>
                </div>
              </div>
            ))}
            {training.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Génération en cours ou données non disponibles...</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};