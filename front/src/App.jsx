import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import des composants de page
import HomePage from './pages/HomePage'; // Assumant que vous avez une page d'accueil
import CandidateInterface from './pages/CandidateInterface'; // L'interface principale
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard'; // Assumant que vous avez un composant pour le dashboard

// Import du gardien de route
import AdminProtectedRoute from './components/AdminProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<HomePage />} />
        <Route path="/candidate" element={<CandidateInterface />} />

        {/* --- Routes pour l'Administration --- */}
        {/* 1. La page de connexion, accessible publiquement - CORRIGÉ */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* 2. La page du tableau de bord, protégée par notre gardien */}
        <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

      </Routes>
    </Router>
  );
}

export default App;