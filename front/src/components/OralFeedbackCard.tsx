import React from 'react';
import { Activity, AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';

interface OralMetrics {
  wpm?: number;
  pace_status?: string;
  word_count?: number;
  filler_words_detected?: string[];
  filler_count?: number;
  negative_words_detected?: string[];
  negative_count?: number;
  length_assessment?: string;
}

interface SpecificCriterion {
  label: string;
  score: number;
  max?: number;
}

interface OralFeedbackCardProps {
  metrics?: OralMetrics | null;
  impactScore?: number;
  impactLabel?: string;
  specificCriteria?: SpecificCriterion[];
  title?: string;
}

const statusColor = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'bon') return '#10b981';
  if (s === 'lent' || s === 'rapide') return '#f59e0b';
  return '#6b7280';
};

export const OralFeedbackCard: React.FC<OralFeedbackCardProps> = ({
  metrics,
  impactScore,
  impactLabel,
  specificCriteria,
  title = 'Qualité de votre réponse orale',
}) => {
  if (!metrics && impactScore === undefined) return null;

  const wpm = metrics?.wpm ?? 0;
  const paceStatus = metrics?.pace_status || 'non mesuré';
  const fillers = metrics?.filler_words_detected || [];
  const fillerCount = metrics?.filler_count ?? fillers.length;
  const negatives = metrics?.negative_words_detected || [];
  const negativeCount = metrics?.negative_count ?? negatives.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={20} color="var(--primary)" />
        {title}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <Activity size={22} color="#3b82f6" style={{ margin: '0 auto 0.5rem auto' }} />
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{wpm}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mots / minute</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: statusColor(paceStatus), marginTop: '0.25rem' }}>{paceStatus}</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <AlertTriangle size={22} color="#f59e0b" style={{ margin: '0 auto 0.5rem auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: fillerCount > 0 ? '#b45309' : '#10b981' }}>
            {fillerCount > 0 ? fillerCount : 'Aucun'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tics de langage</div>
          {fillers.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '0.25rem', wordBreak: 'break-word' }}>
              {fillers.slice(0, 3).join(', ')}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <Ban size={22} color="#ef4444" style={{ margin: '0 auto 0.5rem auto' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: negativeCount > 0 ? '#b91c1c' : '#10b981' }}>
            {negativeCount > 0 ? negativeCount : 'Aucun'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mots dévalorisants</div>
          {negatives.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', wordBreak: 'break-word' }}>
              {negatives.slice(0, 3).join(', ')}
            </div>
          )}
        </div>

        {impactScore !== undefined && (
          <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <CheckCircle2 size={22} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857' }}>{impactScore}/100</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Score d'impact</div>
            {impactLabel && (
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', marginTop: '0.25rem' }}>{impactLabel}</div>
            )}
          </div>
        )}
      </div>

      {specificCriteria && specificCriteria.length > 0 && (
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Critères spécifiques</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {specificCriteria.map((criterion, idx) => {
              const max = criterion.max ?? 100;
              const pct = Math.round((criterion.score / max) * 100);
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{criterion.label}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{criterion.score}/{max}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
