import React, { useState } from 'react';

// Définition des types pour la nouvelle structure de données
interface Pitch {
  title: string;
  description: string;
  content: string;
}

interface PitchMatrix {
  base_pitches: {
    pitch_30s: Pitch;
    pitch_1min: Pitch;
    pitch_3min: Pitch;
  };
  angle_variations: {
    hr: Pitch;
    manager: Pitch;
    executive: Pitch;
    anti_flaw: Pitch;
  };
  coaching: {
    strengths: string;
    risks: string;
    natural_version_tip: string;
    impactful_version_tip: string;
  };
}

interface PitchMatrixDisplayProps {
  pitchData: PitchMatrix | null;
  isLoading: boolean;
}

// Composant pour afficher une carte de pitch individuelle
const PitchCard: React.FC<{ pitch: Pitch }> = ({ pitch }) => (
  <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#f9f9f9' }}>
    <h3 style={{ marginTop: 0 }}>{pitch.title}</h3>
    <p style={{ fontStyle: 'italic', color: '#555' }}>{pitch.description}</p>
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{pitch.content}</div>
  </div>
);

// Composant principal
export const PitchMatrixDisplay: React.FC<PitchMatrixDisplayProps> = ({ pitchData, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'base' | 'variations' | 'coaching'>('base');

  if (isLoading) {
    return <div>Génération de votre matrice de pitchs en cours...</div>;
  }

  if (!pitchData) {
    return <div>Aucune donnée de pitch à afficher.</div>;
  }

  const { base_pitches, angle_variations, coaching } = pitchData;

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '900px', margin: 'auto' }}>
      <h2>Votre Matrice de Pitchs Stratégiques</h2>
      <p>Un pitch central, décliné en durées et adapté à chaque interlocuteur.</p>

      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('base')} style={getTabStyle(activeTab === 'base')}>Pitchs de Base</button>
        <button onClick={() => setActiveTab('variations')} style={getTabStyle(activeTab === 'variations')}>Adaptations par Angle</button>
        <button onClick={() => setActiveTab('coaching')} style={getTabStyle(activeTab === 'coaching')}>Coaching</button>
      </div>

      {activeTab === 'base' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <PitchCard pitch={base_pitches.pitch_30s} />
          <PitchCard pitch={base_pitches.pitch_1min} />
          <PitchCard pitch={base_pitches.pitch_3min} />
        </div>
      )}

      {activeTab === 'variations' && (
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
          <PitchCard pitch={angle_variations.hr} />
          <PitchCard pitch={angle_variations.manager} />
          <PitchCard pitch={angle_variations.executive} />
          <PitchCard pitch={angle_variations.anti_flaw} />
        </div>
      )}

      {activeTab === 'coaching' && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#f9f9f9' }}>
          <h3 style={{ marginTop: 0 }}>Votre Coaching Personnalisé</h3>
          <h4>Points forts</h4>
          <p>{coaching.strengths}</p>
          <h4>Risques à l'oral</h4>
          <p>{coaching.risks}</p>
          <h4>Pour un ton plus naturel</h4>
          <p>{coaching.natural_version_tip}</p>
          <h4>Pour plus d'impact</h4>
          <p>{coaching.impactful_version_tip}</p>
        </div>
      )}
    </div>
  );
};

// Helper pour le style des onglets
const getTabStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: isActive ? 'bold' : 'normal',
  borderBottom: isActive ? '3px solid #1FA6A0' : '3px solid transparent',
  marginBottom: '-1px'
});

export default PitchMatrixDisplay;