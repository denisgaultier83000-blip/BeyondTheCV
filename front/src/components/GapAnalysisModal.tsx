import React from 'react';
import { useTranslation } from 'react-i18next';
import { FeedbackWidget } from './FeedbackWidget';

interface GapAnalysisModalProps {
  data: any;
  onClose: () => void;
}

const GapAnalysisModal: React.FC<GapAnalysisModalProps> = ({ data, onClose }) => {
  if (!data) return null;
  const { t } = useTranslation();
  
  // Affichage d'erreur explicite si l'IA a planté
  if (data.error) {
  }

  // [FIX] Gestion des clés traduites par l'IA (Hallucination)
  const payload = data.gap_analysis || data;
  const key_needs_from_job = payload.key_needs_from_job || payload.besoins_cles || payload.exigences || [];
  const missing_gaps = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const recommended_adjustments = payload.recommended_adjustments || payload.recommandations || payload.actions || [];
  const match_score = payload.match_score || payload.score_adequation || payload.score;

  // Calcul de la couleur du score
  const getScoreColor = (score: number) => {
      if (score >= 80) return '#10b981'; // Vert
      if (score >= 50) return '#f59e0b'; // Orange
      return '#ef4444'; // Rouge
  };

  const scoreColor = getScoreColor(match_score || 0);

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  // [FIX] Helper pour rendre la donnée même si l'IA hallucine un objet au lieu d'une string
  const renderItem = (item: any) => {
    return typeof item === 'string' ? item : item?.skill || item?.name || item?.description || JSON.stringify(item);
  };

  // Si les 3 tableaux sont vides, on cherche n'importe quel tableau dans le JSON généré par l'IA
  const fallbackArrays = Object.entries(payload).filter(([k, v]) => Array.isArray(v) && v.length > 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1rem', width: '90%', maxWidth: '750px', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={onClose}
        >✕</button>
        
        <h2 style={{ textAlign: 'center', color: 'var(--text-main)', marginBottom: '2rem', fontSize: '1.8rem' }}>{t('gap_title')}</h2>

        {/* Score Circle */}
        {match_score !== undefined && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
                <style>{`
                    .tooltip-container-gap {
                      position: relative;
                      display: inline-flex;
                      align-items: center;
                      margin-left: 8px;
                    }
                    .tooltip-icon-gap {
                      cursor: help;
                      color: #94a3b8;
                      font-size: 12px;
                      border: 1px solid #cbd5e1;
                      border-radius: 50%;
                      width: 16px;
                      height: 16px;
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                    }
                    .tooltip-container-gap .tooltip-text-gap {
                      visibility: hidden;
                      width: 200px;
                      background-color: #333;
                      color: #fff;
                      text-align: center;
                      border-radius: 6px;
                      padding: 8px;
                      position: absolute;
                      z-index: 1;
                      bottom: 125%;
                      left: 50%;
                      margin-left: -100px;
                      opacity: 0;
                      transition: opacity 0.3s;
                      font-size: 12px;
                      font-weight: normal;
                      line-height: 1.4;
                    }
                    .tooltip-container-gap:hover .tooltip-text-gap {
                      visibility: visible;
                      opacity: 1;
                    }
                `}</style>
                <div style={{ 
                    width: '120px', height: '120px', borderRadius: '50%', 
                    border: `8px solid ${scoreColor}`, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', fontWeight: 'bold', color: scoreColor,
                    boxShadow: `0 0 20px ${scoreColor}40`
                }}>
                    {match_score}%
                </div>
              <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    {t('gap_score')}
                    <div className="tooltip-container-gap">
                        <span className="tooltip-icon-gap">?</span>
                        <div className="tooltip-text-gap">{t('gap_score_tooltip')}</div>
                    </div>
                </div>
            </div>
        )}

        <div style={{ display: 'grid', gap: '2rem' }}>
          {Array.isArray(key_needs_from_job) && key_needs_from_job.length > 0 && <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h3 style={{...sectionTitleStyle, color: 'var(--primary)'}}>{t('gap_needs')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {key_needs_from_job.map((item: any, i: number) => <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--primary)'}}>✓</span> {renderItem(item)}</li>)}
            </ul>
            </div>}

          {Array.isArray(missing_gaps) && missing_gaps.length > 0 && <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{...sectionTitleStyle, color: 'var(--danger-text)'}}>{t('gap_missing')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {missing_gaps.map((item: any, i: number) => <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--danger-text)'}}>•</span> {renderItem(item)}</li>)}
            </ul>
            </div>}

          {Array.isArray(recommended_adjustments) && recommended_adjustments.length > 0 && <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <h3 style={{...sectionTitleStyle, color: 'var(--success)'}}>{t('gap_reco')}</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {recommended_adjustments.map((item: any, i: number) => <li key={i} style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', color: 'var(--text-main)' }}><span style={{color: 'var(--success)'}}>➜</span> {renderItem(item)}</li>)}
            </ul>
            </div>}

          {/* Fallback si tout est vide */}
          {key_needs_from_job.length === 0 && missing_gaps.length === 0 && recommended_adjustments.length === 0 && (
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
};

export default GapAnalysisModal;