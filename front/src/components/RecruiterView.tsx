// e:\BeyondTheCV\front\src\components\RecruiterView.tsx
import React from 'react';
import { Eye, ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useTranslation } from 'react-i18next';

interface RecruiterData {
  recruiter_persona: {
    first_impression: string;
    red_flags: string[];
    reassurance_points: string[];
    interview_probability: number;
    verdict: string;
    brutal_truth: string;
  }
}

interface RecruiterViewProps {
  data: RecruiterData | null;
  loading?: boolean;
  error?: boolean;
}

export function RecruiterView({ data, loading, error }: RecruiterViewProps) {
  const { t } = useTranslation();
  const recruiter_persona = data?.recruiter_persona;

  const rawVerdict = recruiter_persona?.verdict || "À l'étude";
  
  // Traduction "Intelligente" des réponses brutes de l'IA française
  let verdict = rawVerdict;
  if (rawVerdict.toLowerCase().includes('convoquer')) verdict = t('rv_verdict_invite', 'Convoquer');
  else if (rawVerdict.toLowerCase().includes('rejeter')) verdict = t('rv_verdict_reject', 'Rejeter');
  else if (rawVerdict.toLowerCase().includes('coude')) verdict = t('rv_verdict_keep', 'Garder sous le coude');
  else if (rawVerdict === "À l'étude") verdict = t('rv_under_review', "À l'étude");

  const getVerdictColor = (v: string) => {
      if (!v) return '#ca8a04';
      if (v.toLowerCase().includes('convoquer')) return '#16a34a';
      if (v.toLowerCase().includes('rejeter')) return '#dc2626';
      return '#ca8a04';
  };

  return (
    <DashboardCard
      title={t('rv_title', 'Vue Recruteur')}
      icon={<Eye size={24} />}
      loading={loading}
      loadingText={t('rv_loading', "Simulation du recruteur en cours...")}
      error={error || (!loading && !recruiter_persona)}
      errorText={t('rv_error', "Analyse échouée. Veuillez réessayer plus tard.")}
      featureId="recruiter_view"
    >
      {recruiter_persona && (
        <>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {t('rv_subtitle', 'Ce que pense vraiment le recruteur en lisant votre profil.')}
      </p>

      {/* VERDICT BANNER */}
      <div style={{ 
          background: getVerdictColor(verdict) + '15', // Opacity 15%
          border: `1px solid ${getVerdictColor(verdict)}`,
          padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
          <div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: getVerdictColor(rawVerdict) }}>{t('rv_verdict', 'Verdict')}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', animation: rawVerdict === "À l'étude" ? 'pulse-text 1.5s ease-in-out infinite' : 'none' }}>
                  {verdict}
              </div>
          </div>
          <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('rv_probability', "Probabilité d'entretien")}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: getVerdictColor(rawVerdict) }}>{recruiter_persona.interview_probability || 0}%</div>
          </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>👀 {t('rv_first_impression', 'Première impression')}</h4>
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary)' }}>
              "{recruiter_persona.first_impression || t('rv_no_impression', "Aucune impression disponible.")}"
          </p>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* RED FLAGS */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ThumbsDown size={16} /> {t('rv_red_flags', 'Doutes & Risques')}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--danger-text)', fontSize: '0.9rem' }}>
                  {(recruiter_persona.red_flags || []).map((flag: any, idx: number) => <li key={idx} style={{ marginBottom: '0.25rem' }}>{typeof flag === 'string' ? flag : (flag.text || flag.description || JSON.stringify(flag))}</li>)}
              </ul>
          </div>

          {/* GREEN FLAGS */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ThumbsUp size={16} /> {t('rv_green_flags', 'Points Rassurants')}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                  {(recruiter_persona.reassurance_points || []).map((pt: any, idx: number) => <li key={idx} style={{ marginBottom: '0.25rem' }}>{typeof pt === 'string' ? pt : (pt.text || pt.description || JSON.stringify(pt))}</li>)}
              </ul>
          </div>
      </div>

      {/* COACHING ADVICE (Ex-Brutal Truth) */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)', marginTop: '0.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={18} color="#a78bfa" /> {t('rv_coach_word', 'Le Mot du Coach')}
          </h4>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {recruiter_persona.brutal_truth || t('rv_no_advice', "Pas de conseil spécifique.")}
          </p>
      </div>
      
      <style>{`
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
        </>
      )}
    </DashboardCard>
  );
}
