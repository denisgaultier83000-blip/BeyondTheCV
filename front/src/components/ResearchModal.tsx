import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ScoreGauge from "./ScoreGauge";

interface ResearchModalProps {
  data: any;
  mode?: 'company' | 'market';
  onClose: () => void;
}

const ResearchModal: React.FC<ResearchModalProps> = ({ data, mode = 'company', onClose }) => {
  if (!data) return null;
  const { t } = useTranslation();
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // [FIX] Support rétroactif pour les anciennes données (brief/deep_dive)
  const { company, market_report, company_report, sources, brief, deep_dive } = data;
  
  // Si on a des anciennes données mais pas les nouvelles, on affiche un message ou on adapte
  const hasNewFormat = market_report || company_report;

  const headingStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    marginBottom: '0.75rem',
    borderBottom: '2px solid var(--border-color)',
    paddingBottom: '0.5rem',
    marginTop: '1.5rem'
  };

  const textStyle: React.CSSProperties = {
    fontSize: '0.95rem',
    lineHeight: 1.6,
    color: 'var(--text-muted)',
    textAlign: 'justify'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'white', padding: '2.5rem', borderRadius: '1rem', width: '90%', maxWidth: '800px', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0'
      }}>
        <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
        >
            ✕
        </button>
        
        <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
            {mode === 'company' ? (company ? `${t('modal_company_title', 'Rapport :')} ${company}` : t('card_company_title', 'Rapport Entreprise')) : t('modal_market_title', 'Rapport Marché')}
        </h2>
        <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>{t('modal_generated_by', 'Généré par BeyondTheCV Intelligence')}</div>

        {!hasNewFormat && (
            <div style={{ padding: 20, background: "#fff7ed", color: "#c2410c", borderRadius: 8, marginBottom: 20, textAlign: "center" }}>
                ⚠️ Rapport généré avec une ancienne version. Veuillez relancer l'analyse pour voir les nouvelles sections (SWOT, Salaires, etc.).
                <br/>(Données brutes disponibles : {brief ? "Oui" : "Non"})
            </div>
        )}

        {/* --- RAPPORT ENTREPRISE --- */}
        {mode === 'company' && company_report && (
            <>
                <div>
                    <h3 style={{...headingStyle, marginTop: 0}}>{t('company_dna', 'Identité & ADN')}</h3>
                    <p style={textStyle}>{company_report.identity_dna}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('company_finance', 'Santé Financière')}</h3>
                    <p style={textStyle}>{company_report.financial_health}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('company_usp', 'Proposition de valeur (USP)')}</h3>
                    <p style={textStyle}>{company_report.usp}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('company_culture', 'Culture & Environnement')}</h3>
                    <p style={textStyle}>{company_report.culture_environment}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{t('company_team', 'Structure des équipes')}</h4>
                        <p style={{...textStyle, fontSize: '0.85rem'}}>{company_report.team_structure}</p>
                    </div>
                  <div style={{ background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)' }}>{t('company_news', 'Dernières actualités')}</h4>
                        <p style={{...textStyle, fontSize: '0.85rem'}}>{company_report.hot_news}</p>
                    </div>
                </div>
            </>
        )}

        {/* --- RAPPORT MARCHÉ --- */}
        {mode === 'market' && market_report && (
            <>
                <div>
                    {market_report.tension_score !== undefined && market_report.tension_score !== null ? (
                        <ScoreGauge 
                            score={market_report.tension_score / 10} // Conversion 0-100 -> 0-10
                            label={t('market_tension', 'Tension du marché')}
                            critique={market_report.tension_index}
                        />
                    ) : (
                        <h3 style={{...headingStyle, marginTop: 0}}>{t('market_tension', 'Tension du marché')}</h3>
                    )}
                    {!market_report.tension_score && <p style={textStyle}>{market_report.tension_index}</p>}
                </div>

                <div>
                    <h3 style={headingStyle}>{t('market_salary', 'Baromètre des salaires')}</h3>
                    <p style={textStyle}>{market_report.salary_barometer}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('market_competition', 'Paysage concurrentiel')}</h3>
                    <p style={textStyle}>{market_report.competitive_landscape}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('market_trends', 'Tendances du secteur')}</h3>
                    <p style={textStyle}>{market_report.trends}</p>
                </div>

                <div>
                    <h3 style={headingStyle}>{t('market_recruitment', 'Dynamique de recrutement')}</h3>
                    <p style={textStyle}>{market_report.recruitment_dynamics}</p>
                </div>

              <div style={{ marginTop: '2rem', background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <h3 style={{...headingStyle, marginTop: 0, borderBottom: 'none', color: 'var(--success)'}}>{t('market_skills', 'Compétences clés')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.5rem' }}>Hard Skills</strong>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                {market_report.top_skills?.hard?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '0.5rem' }}>Soft Skills</strong>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                {market_report.top_skills?.soft?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </>
        )}

        {sources && sources.length > 0 && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button 
                onClick={() => setSourcesExpanded(!sourcesExpanded)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#64748b', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
            >
                {sourcesExpanded ? `▼ ${t('section_sources', 'Sources')}` : `▶ ${t('section_sources', 'Sources')}`} ({sources.length})
            </button>
            
            {sourcesExpanded && <ul style={{ listStyleType: 'none', paddingLeft: 0, marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
              {sources.map((source: string, index: number) => (
                <li key={index} style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                  • {source}
                </li>
              ))}
            </ul>}
          </div>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <button 
                onClick={onClose} 
                style={{ 
                    padding: '0.75rem 2rem', border: 'none', borderRadius: '0.5rem', 
                    background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white', 
                    cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                }}>
                {t('btn_close', 'Fermer')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchModal;