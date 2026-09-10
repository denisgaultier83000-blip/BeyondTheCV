import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface ObservedQuestion {
  theme: string;
  confidence: 'very_likely' | 'likely' | 'to_prepare';
  rationale: string;
  occurrence_count: number;
  themes: string[];
}

interface Props {
  companyName?: string;
  sector?: string;
  jobFamily?: string;
  seniority?: string;
  interviewStage?: string;
}

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  very_likely: { label: 'Très probable', color: '#16a34a' },
  likely: { label: 'Probable', color: '#f59e0b' },
  to_prepare: { label: 'À préparer', color: '#64748b' },
};

// Panneau alimenté par la base de connaissance mutualisée et anonymisée des questions d'entretien.
export default function ObservedQuestionsPanel({ companyName, sector, jobFamily, seniority, interviewStage }: Props) {
  const [insights, setInsights] = useState<ObservedQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyName && !sector && !jobFamily) {
      setInsights(null);
      return;
    }
    const params = new URLSearchParams();
    if (companyName) params.set('company_name', companyName);
    if (sector) params.set('sector', sector);
    if (jobFamily) params.set('job_family', jobFamily);
    if (seniority) params.set('seniority', seniority);
    if (interviewStage) params.set('interview_stage', interviewStage);

    let cancelled = false;
    setLoading(true);
    authenticatedFetch(`${API_BASE_URL}/debriefs/insights/questions?${params.toString()}`)
      .then(res => (res.ok ? res.json() : { insights: [] }))
      .then(data => { if (!cancelled) setInsights(data.insights || []); })
      .catch(() => { if (!cancelled) setInsights(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyName, sector, jobFamily, seniority, interviewStage]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Loader2 size={16} className="spin" /> Recherche de questions déjà observées pour ce contexte...
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
        <Sparkles size={18} /> Questions particulièrement pertinentes pour votre entretien
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
        Basé sur les retours d'entretiens anonymisés d'autres candidats dans un contexte comparable.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {insights.map((item, idx) => {
          const conf = CONFIDENCE_LABELS[item.confidence] || CONFIDENCE_LABELS.to_prepare;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: conf.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{conf.label}</span>
              <strong style={{ color: 'var(--text-main)' }}>{item.theme}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.rationale}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
