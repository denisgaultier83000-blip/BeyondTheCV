import React from 'react';
import { Zap, ShieldAlert, Mic, MicOff } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface CoachingNotes {
  strongest_angle?: string;
  main_risk?: string;
  phrases_to_avoid?: string[];
  recommended_pitch_for_interview?: string;
}

interface CoachingSummaryCardProps {
  data?: CoachingNotes;
  loading?: boolean;
}

export const CoachingSummaryCard: React.FC<CoachingSummaryCardProps> = ({ data, loading }) => {
  if (!data && !loading) return null;

  return (
    <DashboardCard
      title="Synthèse du Coaching Vocal"
      icon={<Mic size={24} />}
      loading={loading}
      loadingText="Analyse de votre posture et de vos angles d'attaque..."
      featureId="coaching_summary"
    >
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
          {/* Angle le plus fort */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', margin: '0 0 1rem 0', fontSize: '1rem' }}>
              <Zap size={18} /> Votre Angle d'Attaque
            </h4>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {data.strongest_angle || "Non défini."}
            </p>
          </div>

          {/* Risque Principal */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)', margin: '0 0 1rem 0', fontSize: '1rem' }}>
              <ShieldAlert size={18} /> Risque Principal à Anticiper
            </h4>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {data.main_risk || "Aucun risque majeur identifié."}
            </p>
          </div>

          {/* Phrases à éviter */}
          {data.phrases_to_avoid && data.phrases_to_avoid.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706', margin: '0 0 1rem 0', fontSize: '1rem' }}>
                <MicOff size={18} /> Phrases à Éviter
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {data.phrases_to_avoid.map((phrase, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem' }}>
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
};