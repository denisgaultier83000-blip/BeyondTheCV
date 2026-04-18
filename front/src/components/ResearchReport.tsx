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

  const companyReport = data.company_report || {};
  const marketReport = data.market_report || {};
  
  const overview = companyReport.identity_dna || "Analyse de l'entreprise indisponible.";
  const culture = companyReport.culture_environment || "Non spécifié.";
  const challenges = companyReport.usp || "Non spécifié.";
  const team = companyReport.team_structure || "Non spécifié.";
  const finance = companyReport.financial_health || "Non spécifié.";
  const figures = companyReport.key_figures || "Non spécifié.";
  
  let advice = data.advice || [];
  if (!advice || advice.length === 0) {
      if (marketReport.trends && !marketReport.trends.includes("Non spécifié")) advice.push(`Tendance marché : ${marketReport.trends}`);
      if (companyReport.leadership && !companyReport.leadership.includes("Non spécifié")) advice.push(`Leadership : ${companyReport.leadership}`);
  }
  
  const keyPoints = data.key_points || data.key_data || [];

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
      {data.essential_articles && data.essential_articles.length > 0 && (
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Newspaper size={18}/> Actualités & Articles Clés
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#475569', fontSize: '0.9rem' }}>
            {data.essential_articles.map((article, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem' }}>
                <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                  {article.title}
                </a>
              </li>
            ))}
          </ul>
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