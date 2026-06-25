export function AdminGenerations() {
  // TODO: Fetch generation logs from a new backend endpoint: GET /api/admin/generations

  return (
    <div className="admin-page-content">
      <h2 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Historique des Générations IA
      </h2>
      <p style={{ color: '#64748b' }}>
        Ici sera listé chaque appel à l'IA (Pitch, Analyse, etc.), avec son statut (succès/échec),
        son coût estimé, le modèle utilisé et l'utilisateur concerné. C'est un outil de débogage
        et d'optimisation des coûts essentiel.
      </p>
      {/* Placeholder for generations table */}
      <div style={{ border: '2px dashed #e2e8f0', padding: '2rem', textAlign: 'center', color: '#94a3b8', borderRadius: '8px', marginTop: '2rem' }}>
        Tableau des générations IA à venir...
      </div>
    </div>
  );
}