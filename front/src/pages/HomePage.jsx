import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#0F2650', marginBottom: '40px' }}>Welcome to BeyondTheCV</h1>
      <Link to="/candidate" style={{ padding: '12px 24px', backgroundColor: '#0F2650', color: 'white', textDecoration: 'none', borderRadius: '8px' }}>Go to Candidate Interface</Link>
    </div>
  );
};

export default HomePage;