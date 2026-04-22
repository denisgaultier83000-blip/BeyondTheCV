import React from 'react';

interface CVPreviewProps {
  pdfUrl?: string | null;
  onBack: () => void;
}

export default function CVPreview({ pdfUrl, onBack }: CVPreviewProps) {
  return (
    <div style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Aperçu du CV</h2>
        <button onClick={onBack} className="btn-outline">← Retour au Dashboard</button>
      </div>
      
      <div style={{ width: '100%', height: '800px', background: 'var(--bg-secondary)', borderRadius: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {pdfUrl ? (
          <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none', borderRadius: '0.5rem' }} title="CV Preview" />
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            <p>Le document PDF n'est pas encore disponible.</p>
            <p style={{ fontSize: '0.85rem' }}>Veuillez patienter pendant la génération.</p>
          </div>
        )}
      </div>
    </div>
  );
}