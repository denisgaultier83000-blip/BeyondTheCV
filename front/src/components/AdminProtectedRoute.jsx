import React from 'react';
import { Navigate } from 'react-router-dom';
import { storageManager } from '../utils/storageManager';

const AdminProtectedRoute = ({ children }) => {
  // On vérifie si le token d'administration est présent dans le localStorage
  const token = storageManager.local.getItem('admin_token');

  if (!token) {
    // Si aucun token n'est trouvé, on redirige l'utilisateur
    // vers la page de connexion de l'administration.
    return <Navigate to="/admin" replace />;
  }

  // Si le token est présent, on affiche le composant enfant (le dashboard).
  return children;
};

export default AdminProtectedRoute;