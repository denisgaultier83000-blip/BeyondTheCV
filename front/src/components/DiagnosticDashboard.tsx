import React from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Star, BarChart, FileDown, AlertTriangle, Sparkles } from 'lucide-react';
import Gauge from './Gauge'; // Import du nouveau composant

interface DiagnosticData {
  matchScore?: number;
  match_score: number;
  summary?: string;
  match_summary: string;
  strengths?: string[];
  key_strengths: string[];
  skills_to_bridge?: string[];
  gapsMatrix?: { skill: string, impact: string, action: string }[];
  application_strategy?: string[];
  recommendedStrategy?: string;
  analysis_stats: {
    skills_detected: number;
    requirements_analyzed: number;
    gaps_identified: number;
  };
}

interface Props {
  data: DiagnosticData;
  candidateName: string;
  targetJob: string;
  onAction: (action: string) => void;
}

const getScoreColorClass = (score: number) => {
  if (!score || score < 50) return 'danger';
  if (score < 80) return 'warning';
  return 'success';
};

export default function DiagnosticDashboard({ data, candidateName, targetJob, onAction }: Props) {
  const { t } = useTranslation();
  const scoreValue = data.matchScore ?? data.match_score ?? 0;
  const scoreColorClass = getScoreColorClass(scoreValue);
  const scoreColor = `var(--${scoreColorClass})`;

  const StatCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '1rem' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--text-main)', margin: 0 }}>Career Intelligence Report</h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
          {candidateName} • {targetJob} • {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Grille de diagnostic */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* 1. Score d'adéquation */}
        <StatCard icon={<Target size={24} color={scoreColor} />} title="Score d’adéquation">
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Gauge score={scoreValue} color={scoreColor} />
            </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{data.summary || data.match_summary || "Analyse IA en cours..."}</p>
          
          <button onClick={() => onAction("View Gap Analysis")} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Explorer l'Analyse des Écarts
          </button>
          </div>
        </StatCard>

        {/* 2. Forces principales */}
        <StatCard icon={<Star size={24} color="var(--warning)" />} title="Vos 3 forces clés">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(data.strengths?.length ? data.strengths : data.key_strengths || []).map((strength, i) => (
              <li key={i} style={{ background: 'var(--success-bg)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--success-text)', fontWeight: 500, border: '1px solid var(--success-border)' }}>
                {strength}
              </li>
            ))}
            {!(data.strengths?.length) && !(data.key_strengths?.length) && <span style={{ color: 'var(--text-muted)' }}>Aucune force détectée.</span>}
          </ul>
        </StatCard>

        {/* 3. Compétences à combler */}
        <StatCard icon={<AlertTriangle size={24} color="var(--danger)" />} title="Compétences à combler">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(data.gapsMatrix?.length ? data.gapsMatrix : (data.skills_to_bridge || []).map(s => ({ skill: s, action: '' }))).slice(0, 3).map((gap: any, i) => (
              <div key={i} style={{ background: 'var(--danger-bg)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--danger-border)' }}>
                <strong style={{ color: 'var(--danger-text)' }}>{gap.skill || gap}</strong>
                {gap.action && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{gap.action}</div>}
              </div>
            ))}
            {(!data.gapsMatrix?.length && !data.skills_to_bridge?.length) && <span style={{ color: 'var(--text-muted)' }}>Aucun écart majeur détecté.</span>}
            {((data.gapsMatrix?.length || 0) > 3 || (data.skills_to_bridge?.length || 0) > 3) && <a href="#" onClick={(e) => { e.preventDefault(); onAction("View Gap Analysis"); }} style={{ fontSize: '0.8rem', textAlign: 'right', color: 'var(--primary)' }}>Voir plus...</a>}
          </div>
        </StatCard>

        {/* 4. Stratégie de candidature */}
        <StatCard icon={<BarChart size={24} color="var(--primary)" />} title="Stratégie de candidature">
          {data.recommendedStrategy ? (
            <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.recommendedStrategy}</p>
          ) : (
            <ul style={{ margin: 0, padding: '0 0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(data.application_strategy || []).map((strat, i) => (
                <li key={i} style={{ color: 'var(--text-muted)' }}>{strat}</li>
              ))}
            </ul>
          )}
          {!data.recommendedStrategy && !(data.application_strategy?.length) && <span style={{ color: 'var(--text-muted)' }}>Stratégie en cours de génération...</span>}
        </StatCard>
      </div>

      {/* Ligne de stats "Premium" */}
      <div style={{ textAlign: 'center', margin: '2rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Analyse basée sur : {data.analysis_stats.skills_detected} compétences détectées • {data.analysis_stats.requirements_analyzed} exigences du poste analysées • {data.analysis_stats.gaps_identified} écarts identifiés
      </div>

      {/* Boutons d'action */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => onAction("Review CV")} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileDown size={16} /> Éditer mon CV
        </button>
        <button onClick={() => onAction("Pitch")} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileDown size={16} /> Pitch
        </button>
        <button onClick={() => onAction("Questionnaire")} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileDown size={16} /> Questionnaire
        </button>
        <button onClick={() => onAction("Flaw Coaching")} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} /> Parades aux Défauts
        </button>
      </div>
    </div>
  );
}