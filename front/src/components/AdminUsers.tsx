import React from 'react';

export function AdminUsers() {
  // TODO: Fetch users from a new backend endpoint: GET /api/admin/users
  // TODO: Implement search and filter inputs

  return (
    <div className="admin-page-content">
      <h2 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Gestion des Utilisateurs
      </h2>
      <p style={{ color: '#64748b' }}>
        Cette page listera tous les utilisateurs inscrits. Elle permettra de rechercher par email,
        de filtrer par statut (actif, expiré) et par offre souscrite.
        Chaque ligne mènera vers la page de détail de l'utilisateur.
      </p>
      {/* Placeholder for user table */}
      <div style={{ border: '2px dashed #e2e8f0', padding: '2rem', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', marginTop: '2rem' }}>
        Tableau des utilisateurs à venir...
      </div>
    </div>
  );
}