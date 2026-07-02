import React from 'react';

const CandidateInterface = () => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#0F2650', marginBottom: '40px' }}>Interface Candidat</h1>
      <p style={{ color: '#446285' }}>Le formulaire de saisie du profil candidat sera implémenté ici.</p>
    </div>
  );
};

export default CandidateInterface;