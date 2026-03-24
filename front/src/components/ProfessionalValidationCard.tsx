import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Lightbulb, Loader2, XCircle, Edit3 } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

interface ValidationData {
  professionalism_score: number;
  alerts: string[];
  suggestions: string[];
  corrected_profile_preview: string;
}

interface Props {
  data: ValidationData | null;
  loading?: boolean;
  error?: boolean;
}

export function ProfessionalValidationCard({ data, loading, error }: Props) {
  if (error) return null;

  if (loading) {
    return (
      <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: 'var(--text-main)' }}>
          <ShieldCheck size={24} color="var(--primary)" /> Audit de Professionnalisme
        </h3>
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 className="spin" size={32} color="var(--primary)" />
          <p style={{ margin: 0 }}>Nettoyage et validation de vos données...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getScoreColor = (val: number) => {
    if (val < 50) return "#ef4444";
    if (val < 80) return "#eab308";
    return "#10b981";
  };

  const scoreColor = getScoreColor(data.professionalism_score);

  return (
    <div className="result-card" style={{ border: `1px solid ${data.professionalism_score < 80 ? '#fecaca' : 'var(--border-color)'}`, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
          <ShieldCheck size={24} color={scoreColor} /> Audit de Professionnalisme
        </h3>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: scoreColor }}>
          {data.professionalism_score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        <div style={{ background: data.alerts?.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: `1px solid ${data.alerts?.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: data.alerts?.length > 0 ? '#b91c1c' : '#15803d', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {data.alerts?.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle size={18} />} Alertes Candidature
          </h4>
          {data.alerts?.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#7f1d1d', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.alerts.map((alert, idx) => <li key={idx}>{alert}</li>)}
            </ul>
          ) : <div style={{ color: '#166534', fontSize: '0.9rem' }}>Votre profil est propre et professionnel.</div>}
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> Suggestions d'Amélioration</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.suggestions?.map((sug, idx) => <li key={idx}>{sug}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}