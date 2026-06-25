import React from 'react'; // React is used for JSX
import { AlertTriangle, X, Target, CheckCircle, Lightbulb, Clock } from 'lucide-react'; // All icons are used
import Gauge from './Gauge';
import { FeedbackWidget } from './FeedbackWidget';

export const GapAnalysisFull = ({ data, onBack }: { data: any, onBack: () => void }) => {
  // Normalisation robuste des données
  const payload = data?.gap_analysis || data || {};
  const key_needs_from_job = payload.key_needs_from_job || payload.besoins_cles || payload.exigences || [];
  // [FIX] Extraction robuste des compétences validées (soit via le gap_analysis, soit via le résumé global)
  const matching_skills = payload.matching_skills || payload.acquired_skills || payload.competences_acquises || payload.points_forts || payload.validated_skills || payload.strengths || data?.strengths || [];
  const missing_gaps = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const recommended_adjustments = payload.recommended_adjustments || payload.recommandations || payload.actions || [];
  const match_score = payload.match_score || payload.score_adequation || payload.matchScore || payload.score || 0;
  
  const getScoreColor = (score: number) => {
      if (score >= 80) return 'var(--success)';
      if (score >= 50) return 'var(--warning)';
      return 'var(--danger-text)';
  };

  const scoreColor = getScoreColor(match_score);
  const renderText = (item: any) => typeof item === 'string' ? item : item?.skill || item?.name || item?.description || item?.action || JSON.stringify(item);
  const renderTime = (item: any) => typeof item === 'object' ? item?.estimated_time || item?.time_to_bridge || item?.time : null;

  return (
    <div className="gap-analysis-full-container">
    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
          <Target size={28} color="var(--primary)" /> Analyse d'Écarts (Gap Analysis)
        </h2>
        <button onClick={onBack} className="btn-action btn-secondary-action" style={{ maxWidth: '150px' }}>
          <X size={16} /> Retour
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
        <Gauge score={match_score} color={scoreColor} />
        <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Score d'Adéquation</div>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {key_needs_from_job.length > 0 && (
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={20} /> Ce qui est attendu pour le poste</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {key_needs_from_job.map((item: any, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                  <span style={{color: 'var(--primary)', marginTop: '2px'}}>•</span> 
                  <span style={{flex: 1}}>{renderText(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {matching_skills.length > 0 && (
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> Vos compétences en adéquation</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matching_skills.map((item: any, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                  <span style={{color: 'var(--success)', marginTop: '2px'}}>✓</span> 
                  <span style={{flex: 1}}>{renderText(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missing_gaps.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger-text)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={20} /> Écarts & Compétences manquantes</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {missing_gaps.map((item: any, i: number) => {
                const time = renderTime(item);
                return (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <span style={{color: 'var(--danger-text)', marginTop: '2px'}}>•</span> 
                    <span style={{flex: 1}}>{renderText(item)}</span>
                    {time && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '1rem', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', fontWeight: 600 }}><Clock size={12} /> {time}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {recommended_adjustments.length > 0 && (
          <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#8b5cf6', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={20} /> Actions Recommandées</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recommended_adjustments.map((item: any, i: number) => {
                const time = renderTime(item);
                return (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}>
                    <span style={{color: '#8b5cf6', marginTop: '2px'}}>➜</span> 
                    <span style={{flex: 1}}>{renderText(item)}</span>
                    {time && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-card)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', fontWeight: 600 }}><Clock size={12} /> {time}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>

    <FeedbackWidget feature="gap_analysis" question="Cette analyse d'écarts vous semble-t-elle pertinente et actionable ?" />
    </div>
  );
};