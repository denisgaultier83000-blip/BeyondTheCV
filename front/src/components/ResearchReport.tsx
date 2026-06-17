import React from 'react';
import { Building, Target, Lightbulb, TrendingUp, Users, DollarSign, Newspaper } from 'lucide-react';

interface ResearchData {
  // Support Backend V1 & V2
  synthesis?: any;
  brief?: {
    overview?: string;
    culture?: string;
    challenges?: string;
    advice?: string[];
  };
  key_points?: string[];
  key_data?: string[];
  essential_articles?: { title: string; url: string }[];
  // [FIX] Support des nouveaux formats (Company/Market Report)
  company_report?: any;
  market_report?: any;
  // Fallback pour compatibilité si la structure varie
  overview?: string;
  culture?: string;
  challenges?: string;
  advice?: string[];
}

interface ResearchReportProps {
  data: ResearchData | null;
  companyName?: string;
}

export function ResearchReport({ data, companyName }: ResearchReportProps) {
  if (!data) return null;

  const companyReport = data.company_report || data.synthesis?.company_report || {};
  const marketReport = data.market_report || data.synthesis?.market_report || {};
  
  const overview = companyReport.identity_dna || "Analyse de l'entreprise indisponible.";
  const culture = companyReport.culture_environment || "Non spécifié.";
  const challenges = companyReport.usp || "Non spécifié.";
  const team = companyReport.team_structure || "Non spécifié.";
  const finance = companyReport.financial_health || "Non spécifié.";
  const figures = companyReport.key_figures || "Non spécifié.";
  
  // [FIX EXPERT] On s'assure d'avoir un tableau, même si l'IA hallucine une string.
  const rawStrategicChallenges = companyReport.strategic_challenges || data.synthesis?.company_report?.strategic_challenges || [];
  const strategicChallenges = Array.isArray(rawStrategicChallenges) ? rawStrategicChallenges : (typeof rawStrategicChallenges === 'string' ? [rawStrategicChallenges] : []);
  
  // Rétrocompatibilité : on cherche d'abord le nouveau format, puis l'ancien
  const newsLinks = companyReport.news_links || data.essential_articles || data.synthesis?.essential_articles || [];

  let advice = data.advice || [];
  if (!advice || advice.length === 0) {
      if (marketReport.trends && !marketReport.trends.includes("Non spécifié")) advice.push(`Tendance marché : ${marketReport.trends}`);
      if (companyReport.leadership && !companyReport.leadership.includes("Non spécifié")) advice.push(`Leadership : ${companyReport.leadership}`);
  }
  
  const keyPoints = data.key_points || data.key_data || [];

  const formatStrategicAnalysis = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      if (!line.trim()) return null;
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={index} style={{ marginBottom: '0.75rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const label = part.slice(2, -2).replace(':', '').trim();
              let labelColor = '#2563eb';
              let labelBg = '#eff6ff';
              
              if (label.toLowerCase().includes("pourquoi")) { labelColor = '#d97706'; labelBg = '#fffbeb'; }
              else if (label.toLowerCase().includes("recruteur")) { labelColor = '#7c3aed'; labelBg = '#f5f3ff'; }
              else if (label.toLowerCase().includes("question")) { labelColor = '#dc2626'; labelBg = '#fef2f2'; }
              else if (label.toLowerCase().includes("réponse") || label.toLowerCase().includes("star")) { labelColor = '#16a34a'; labelBg = '#f0fdf4'; }
              
              return <strong key={i} style={{ color: labelColor, background: labelBg, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.02em', border: `1px solid ${labelColor}30` }}>{label}</strong>;
            }
            return <span key={i} style={{ paddingLeft: '0.25rem' }}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="research-report" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* En-tête du rapport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div style={{ background: '#dbeafe', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <Building size={24} color="#2563eb" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Rapport Stratégique : {companyName || 'Entreprise Cible'}</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Synthèse globale (Entreprise & Marché)</span>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="report-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: '#334155' }}>
          <Target size={18} color="#475569"/> ADN & Positionnement
        </h4>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>{overview}</p>
      </div>

      {/* Grille Informations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={16}/> Culture & Équipe</h4>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.5rem 0' }}><strong>Culture:</strong> {culture}</p>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}><strong>Structure:</strong> {team}</p>
        </div>
        
        <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ffedd5' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16}/> Enjeux & Défis
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>{challenges}</p>
        </div>

        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={16}/> Santé Financière
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#14532d', margin: '0 0 0.5rem 0' }}><strong>Chiffres:</strong> {figures}</p>
          <p style={{ fontSize: '0.85rem', color: '#14532d', margin: 0 }}><strong>Dynamique:</strong> {finance}</p>
        </div>

        {/* NOUVEAU: Défis Stratégiques Actuels */}
        {strategicChallenges.length > 0 && (
          <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #fee2e2' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎯 Défis Stratégiques
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#7f1d1d', fontSize: '0.85rem' }}>
              {strategicChallenges.map((defi: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '0.35rem', lineHeight: '1.4' }}>{defi}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Conseils Stratégiques */}
      {advice.length > 0 && (
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={18}/> Insights Additionnels
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.9rem' }}>
          {advice.map((item: any, idx: number) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Articles de Presse / Actualités */}
      {newsLinks.length > 0 && (
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Newspaper size={18}/> Actualités & Leviers Stratégiques
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {newsLinks.map((article: any, idx: number) => {
              const urlStr = article.url || '#';
              const isDummyUrl = urlStr === '#';
              const fullUrl = isDummyUrl ? '#' : (urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
              return (
                <div key={idx} style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    {!isDummyUrl ? (
                        <>
                            <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(fullUrl)}&sz=16`} alt="source" style={{ width: '16px', height: '16px', marginRight: '8px', borderRadius: '2px', flexShrink: 0 }} />
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                                {article.title}
                            </a>
                        </>
                    ) : (
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>💡 {article.title}</span>
                    )}
                  </div>
                  {(article.source || article.date) && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                      {article.source || 'Presse / Web'} {article.date ? `• ${article.date}` : ''}
                    </div>
                  )}
                  {article.strategic_analysis && (
                    <div style={{ fontSize: '0.9rem', color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginTop: '1rem' }}>
                      <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Target size={16} color="#2563eb" /> Angle d'Entretien</strong>
                      {formatStrategicAnalysis(article.strategic_analysis)}
                    </div>
                  )}
                  {article.hidden_meaning && (
                    <div style={{ fontSize: '0.85rem', color: '#475569', borderLeft: '3px solid #f59e0b', paddingLeft: '0.75rem', marginTop: '0.75rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                      <strong style={{ color: '#d97706', fontStyle: 'normal' }}>Lecture Cachée :</strong> {article.hidden_meaning}
                    </div>
                  )}
                  {article.interview_relevance && (
                    <div style={{ display: 'inline-block', fontSize: '0.75rem', color: '#1e40af', background: '#dbeafe', padding: '0.25rem 0.75rem', borderRadius: '1rem', marginTop: '0.75rem', fontWeight: 600 }}>
                      Pertinence Entretien : {article.interview_relevance}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Points Clés (Tags) */}
      {keyPoints.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {keyPoints.map((pt, idx) => (
            <span key={idx} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem', color: '#475569', border: '1px solid #e2e8f0' }}>
              {pt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}