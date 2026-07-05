import React from 'react';
import { Zap } from 'lucide-react';

const AdminGenerations: React.FC = () => {
  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap /> Historique des Générations IA</h2>
      <p>Cette section listera toutes les tâches de génération IA, leur statut, coût et durée.</p>
      <div style={{ padding: '2rem', border: '1px dashed #ccc', borderRadius: '8px', textAlign: 'center', color: '#888' }}>
        Tableau des générations à venir...
      </div>
    </div>
  );
};

export default AdminGenerations;