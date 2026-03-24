import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function ResearchReport() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Les données du rapport sont passées via l'état de la navigation
  const { report } = location.state || { report: null };

  if (!report) {
    return (
      <div style={styles.container}>
        <h1 style={styles.header}>Report Error</h1>
        <p>No report data found. Please try generating the report again.</p>
        <button style={styles.button} onClick={() => navigate('/candidate', { state: { view: 'dashboard' } })}>Back to Dashboard</button>
      </div>
    );
  }

  // Le rapport peut avoir une structure légèrement différente (market_report vs company_report)
  // On unifie ici pour l'affichage
  const rawData = report.market_report || report.company_report || report;

  // Normalisation des données : Si c'est un rapport d'entreprise (structure différente), on adapte
  const isCompanyReport = !!rawData.summary || !!rawData.company_name || !!rawData.synthesis;
  
  const reportData = isCompanyReport ? {
    company: rawData.company_name || rawData.company,
    synthesis: {
      overview: rawData.summary,
      culture: rawData.culture_vibe,
      challenges: rawData.challenges || "Non spécifié dans ce rapport.",
      advice: rawData.interview_tips
    },
    // Transformation des key_figures (souvent des strings simples) en objets {label, value}
    key_data: Array.isArray(rawData.key_figures) 
      ? rawData.key_figures.map((item: string | any) => {
          if (typeof item === 'string') {
             // Si c'est une string "Label: Value", on essaie de séparer
             const parts = item.split(':');
             if (parts.length > 1) return { label: parts[0].trim(), value: parts.slice(1).join(':').trim() };
             return { label: "Info", value: item };
          }
          return item; // Si c'est déjà un objet
        })
      : rawData.key_data,
    sources: rawData.sources || rawData.recent_news // On utilise les news comme sources si pas de sources
  } : rawData;

  // [FIX] Fallback pour les rapports de marché qui n'auraient pas la structure 'synthesis'
  if (!reportData.synthesis) {
      reportData.synthesis = {
          overview: reportData.overview || reportData.description || reportData.content || "Overview data not structured.",
      };
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <h1 style={styles.header}>Research Report: {reportData.company || reportData.company_name || reportData.industry || 'Market Analysis'}</h1>
        <button style={styles.button} onClick={() => navigate('/candidate', { state: { view: 'dashboard' } })}>&larr; Back to Dashboard</button>
      </div>

      {/* Section Synthèse */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Executive Summary</h2>
        <div style={styles.section}>
          <h4>Overview</h4>
          <p>{reportData.synthesis?.overview || 'No overview available.'}</p>
        </div>
        <div style={styles.section}>
          <h4>Culture & Environment</h4>
          <p>{reportData.synthesis?.culture || 'No culture analysis available.'}</p>
        </div>
        <div style={styles.section}>
          <h4>Challenges & Strategy</h4>
          <p>{reportData.synthesis?.challenges || 'No challenges identified.'}</p>
        </div>
        <div style={styles.section}>
          <h4>Interview Advice</h4>
          <ul>
            {(reportData.synthesis?.advice || []).map((item: string, index: number) => (
              <li key={index} style={styles.listItem}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Section Données Clés */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Key Data</h2>
        <div style={styles.grid}>
          {(reportData.key_data || []).map((item: { label: string; value: string }, index: number) => (
            <div key={index} style={styles.dataItem}>
              <span style={styles.dataLabel}>{item.label}</span>
              <span style={styles.dataValue}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section Sources */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Sources</h2>
        <ul style={{ paddingLeft: '20px' }}>
          {(reportData.sources || []).map((source: string, index: number) => (
            <li key={index} style={styles.sourceItem}>
              {source.includes('http') ? (
                <a href={source.split('(').pop()?.replace(')', '')} target="_blank" rel="noopener noreferrer">
                  {source.split('(')[0].trim()}
                </a>
              ) : (
                source
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Styles pour un affichage propre, inspirés du reste de l'application
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f3f4f6',
    minHeight: '100vh',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px',
  },
  header: {
    color: '#1f2937',
    fontSize: '28px',
    margin: 0,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    marginBottom: '25px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  cardTitle: {
    fontSize: '22px',
    color: '#1fa6a0', // Primary color
    margin: '0 0 20px 0',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '10px',
  },
  section: {
    marginBottom: '15px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  dataItem: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  dataLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '5px',
    textTransform: 'uppercase',
  },
  dataValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  listItem: {
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  sourceItem: {
    marginBottom: '8px',
    fontSize: '14px',
  },
  button: {
    background: '#ffffff',
    color: '#1f2937',
    border: '1px solid #d1d5db',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background 0.2s',
  },
};
