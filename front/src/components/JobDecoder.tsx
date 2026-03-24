import React from 'react';
import { Search, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { DashboardCard } from './DashboardCard';

interface DecoderData {
  reality_check: { jargon: string; translation: string }[];
  real_expectations: string[];
  red_flags: string[];
  culture_fit: string;
}

interface JobDecoderProps {
  data: { decoder: DecoderData } | null;
  loading?: boolean;
  error?: boolean;
}

export function JobDecoder({ data, loading, error }: JobDecoderProps) {
  const decoder = data?.decoder;

  return (
    <DashboardCard
      title="Décodeur de Fiche de Poste"
      icon={<Search size={24} />}
      loading={loading}
      loadingText="Traduction du jargon RH..."
      error={error || (!loading && !decoder)}
      errorText="Impossible de décoder le poste."
      featureId="job_decoder"
      feedbackQuestion="Cette analyse du poste vous est-elle utile ?"
      feedbackBullets={[
        "Le jargon n'est pas bien expliqué ?",
        "Les attentes sont irréalistes ?",
        "L'analyse est hors sujet ?"
      ]}
    >
      {decoder && (
        <>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Traduction du jargon RH en réalité opérationnelle.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Reality Check */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>🔍 Réalité vs Jargon</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {decoder.reality_check?.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', flex: 1 }}>"{item.jargon}"</span>
                <ArrowRight size={16} color="#94a3b8" />
                <span style={{ color: 'var(--text-main)', fontWeight: 600, flex: 1 }}>{item.translation}</span>
              </div>
            ))}
          </div>
        </div>

        {/* [FIX] Utilisation de .grid-2 pour le responsive (1 col mobile, 2 cols desktop) */}
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          {/* Real Expectations */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} /> Ce qui est vraiment attendu
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--success)', fontSize: '0.9rem' }}>
              {decoder.real_expectations?.map((exp: any, idx: number) => <li key={idx} style={{ marginBottom: '0.25rem' }}>{typeof exp === 'string' ? exp : (exp.text || exp.description || JSON.stringify(exp))}</li>)}
            </ul>
          </div>

          {/* Red Flags */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} /> Pièges potentiels
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--danger-text)', fontSize: '0.9rem' }}>
              {decoder.red_flags?.map((flag: any, idx: number) => <li key={idx} style={{ marginBottom: '0.25rem' }}>{typeof flag === 'string' ? flag : (flag.text || flag.description || JSON.stringify(flag))}</li>)}
            </ul>
          </div>
        </div>

        {/* Culture Fit (Nouvelle section avec Markdown) */}
        {decoder.culture_fit && (
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎭 Culture d'Entreprise
            </h4>
            <div 
              style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}
              dangerouslySetInnerHTML={formatMarkdown(decoder.culture_fit)}
            />
          </div>
        )}
      </div>
        </>
      )}
    </DashboardCard>
  );
}
