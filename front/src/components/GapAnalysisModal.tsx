import { useTranslation } from 'react-i18next';
import { Target, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';
import Gauge from './Gauge';

interface GapAnalysisModalProps {
  data: any;
  onClose: () => void;
}

export default function GapAnalysisModal({ data, onClose }: GapAnalysisModalProps) {
  const { t } = useTranslation();

  // Normalisation robuste des données
  const payload = data?.gap_analysis || data || {};
  const key_needs_from_job = payload.key_needs_from_job || payload.besoins_cles || payload.exigences || [];
  const matching_skills = payload.matching_skills || payload.acquired_skills || payload.competences_acquises || payload.points_forts || [];
  const missing_gaps = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const recommended_adjustments = payload.recommended_adjustments || payload.recommandations || payload.actions || [];
  const match_score = payload.match_score || payload.score_adequation || payload.matchScore || payload.score || 0;

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'var(--success)';
      if (score >= 50) return 'var(--warning)';
      return 'var(--danger-text)';
  };

  const scoreColor = getScoreColor(match_score);

  const renderItem = (item: any) => {
    if (typeof item === 'string') return item;
    return item.skill || item.name || item.description || item.action || JSON.stringify(item);
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  // Si les 3 tableaux sont vides, on cherche n'importe quel tableau dans le JSON généré par l'IA
  const fallbackArrays = Object.entries(payload).filter(([_k, v]) => Array.isArray(v) && v.length > 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '90%', maxWidth: '850px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >✕</button>
        
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
          <Target size={32} color="var(--primary)" /> {t('gap_title', "Analyse d'Écarts (Gap Analysis)")}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          {t('gap_subtitle', "Comparaison de votre profil avec les attentes du poste.")}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <Gauge score={match_score} color={scoreColor} />
          <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('gap_score_label', "Score d'Adéquation")}</div>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {Array.isArray(key_needs_from_job) && key_needs_from_job.length > 0 && <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{...sectionTitleStyle, color: 'var(--primary)'}}><Target size={20} /> {t('gap_needs', 'Ce qui est attendu')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {key_needs_from_job.map((item: any, i: number) => <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--primary)', marginTop: '2px'}}>•</span> <span style={{flex: 1}}>{renderItem(item)}</span></li>)}
            </ul>
          </div>}

          {Array.isArray(matching_skills) && matching_skills.length > 0 && <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h3 style={{...sectionTitleStyle, color: 'var(--success)'}}><CheckCircle size={20} /> {t('gap_strengths', 'Vos compétences en adéquation')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matching_skills.map((item: any, i: number) => <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--success)', marginTop: '2px'}}>✓</span> <span style={{flex: 1}}>{renderItem(item)}</span></li>)}
            </ul>
          </div>}

          {Array.isArray(missing_gaps) && missing_gaps.length > 0 && <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{...sectionTitleStyle, color: 'var(--danger-text)'}}><AlertTriangle size={20} /> {t('gap_missing', 'Écarts & Compétences manquantes')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {missing_gaps.map((item: any, i: number) => <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--danger-text)', marginTop: '2px'}}>•</span> <span style={{flex: 1}}>{renderItem(item)}</span></li>)}
            </ul>
          </div>}

          {Array.isArray(recommended_adjustments) && recommended_adjustments.length > 0 && <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <h3 style={{...sectionTitleStyle, color: '#8b5cf6'}}><Lightbulb size={20} /> {t('gap_reco', 'Actions Recommandées')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recommended_adjustments.map((item: any, i: number) => <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: '#8b5cf6'}}>➜</span> {renderItem(item)}</li>)}
            </ul>
            </div>}

          {/* Fallback si tout est vide */}
          {key_needs_from_job.length === 0 && matching_skills.length === 0 && missing_gaps.length === 0 && recommended_adjustments.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {fallbackArrays.length > 0 ? (
                      fallbackArrays.map(([key, arr]: [string, any], idx) => (
                          <div key={idx} style={{ textAlign: 'left', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem' }}>
                              <h4 style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{key.replace(/_/g, ' ')}</h4>
                              <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0 0 0' }}>{arr.map((item: any, i: number) => <li key={i}>{renderItem(item)}</li>)}</ul>
                          </div>
                      ))
                  ) : (
                      "Aucun écart spécifique détecté ou format de données non reconnu."
                  )}
              </div>
          )}
        </div>
        
        <FeedbackWidget feature="gap_analysis" />

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <button className="btn-secondary" onClick={onClose} style={{ 
              padding: '0.75rem 2.5rem', fontSize: '1rem' 
          }}>{t('btn_close', 'Fermer')}
            </button>
        </div>
      </div>
    </div>
  );
}