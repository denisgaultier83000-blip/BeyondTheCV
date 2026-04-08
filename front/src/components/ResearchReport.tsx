import React from 'react';
import { Building, Target, Lightbulb, TrendingUp } from 'lucide-react';

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
  console.log("📊 ResearchReport Data Received:", data); // [DEBUG] Vérifier la structure dans la console F12
  if (!data) return null;

  // Normalisation des données (gestion des variantes de structure JSON)
  const brief = data.brief || data.synthesis || {};
  const companyReport = data.company_report || {};
  const marketReport = data.market_report || {};
  
  // Logique de fallback en cascade pour trouver du contenu à afficher
  const overview = brief.overview || data.overview || companyReport.identity_dna || marketReport.salary_barometer || "Analyse indisponible.";
  const culture = brief.culture || data.culture || companyReport.culture_environment || marketReport.recruitment_dynamics || "Non spécifié.";
  const challenges = brief.challenges || data.challenges || companyReport.usp || marketReport.competitive_landscape || "Non spécifié.";
  
  // Pour les conseils, on essaie de trouver une liste ou on en crée une
  let advice = brief.advice || data.advice || [];
  if (!advice || advice.length === 0) {
      if (companyReport.hot_news) advice.push(`Actu: ${companyReport.hot_news}`);
      if (marketReport.trends) advice.push(`Tendance: ${marketReport.trends}`);
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
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analyse de marché & Culture</span>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="report-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: '#334155' }}>
          <Target size={18} color="#475569"/> Vue d'ensemble
        </h4>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>{overview}</p>
      </div>

      {/* Grille Culture & Défis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a' }}>🧬 Culture & Valeurs</h4>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{culture}</p>
        </div>
        <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ffedd5' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16}/> Enjeux & Défis
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>{challenges}</p>
        </div>
      </div>

      {/* Conseils Stratégiques */}
      {advice.length > 0 && (
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={18}/> Conseils pour l'entretien
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#14532d', fontSize: '0.9rem' }}>
          {advice.map((item: any, idx: number) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
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