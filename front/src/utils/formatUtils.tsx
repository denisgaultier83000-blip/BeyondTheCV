import React from 'react';

/**
 * Parseur minimaliste pour interpréter le **gras** (Markdown) et renvoyer un ReactNode.
 * Prévient les failles XSS tout en permettant un formatage basique et léger.
 */
export const formatMarkdownReact = (text: string | undefined | null): React.ReactNode => {
  if (!text) return text as any;
  if (typeof text !== 'string') return text as any;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

/**
 * Parseur avancé pour l'analyse stratégique (Entreprise/Marché) avec color-coding dynamique.
 * Applique un style visuel spécifique (Bleu, Orange, Violet, Vert) en fonction des mots-clés.
 */
export const formatStrategicAnalysisReact = (text: string | undefined | null): React.ReactNode => {
  if (!text) return null;
  if (typeof text !== 'string') return text as any;

  return text.split('\n').map((line, index) => {
    if (!line.trim()) return null;
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={index} style={{ marginBottom: '0.75rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const label = part.slice(2, -2).replace(':', '').trim();
            let labelColor = '#2563eb'; // Bleu par défaut
            let labelBg = '#eff6ff';
            
            const lowerLabel = label.toLowerCase();
            if (lowerLabel.includes("pourquoi")) { labelColor = '#d97706'; labelBg = '#fffbeb'; }
            else if (lowerLabel.includes("recruteur")) { labelColor = '#7c3aed'; labelBg = '#f5f3ff'; }
            else if (lowerLabel.includes("question")) { labelColor = '#dc2626'; labelBg = '#fef2f2'; }
            else if (lowerLabel.includes("réponse") || lowerLabel.includes("star")) { labelColor = '#16a34a'; labelBg = '#f0fdf4'; }
            
            return (
              <strong 
                key={i} 
                style={{ 
                  color: labelColor, 
                  background: labelBg, 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.8rem', 
                  width: 'fit-content', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.02em', 
                  border: `1px solid ${labelColor}30` 
                }}
              >
                {label}
              </strong>
            );
          }
          return <span key={i} style={{ paddingLeft: '0.25rem' }}>{part}</span>;
        })}
      </div>
    );
  });
};