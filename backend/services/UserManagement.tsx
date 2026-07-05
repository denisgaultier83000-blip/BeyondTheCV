import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // [NOUVEAU] Import pour la navigation
import { authenticatedFetch } from '../../utils/auth'; // Assurez-vous d'avoir un utilitaire pour les appels authentifiés

// --- ANALYSE DE L'EXPERT ---
// Ce composant est une solution complète pour la gestion d'une liste paginée.
//
// 1.  **Hooks Modernes :** Utilisation de `useState` pour l'état et `useEffect` pour les
//     effets de bord (chargement des données). `useCallback` est utilisé pour mémoriser
//     la fonction de chargement et éviter des re-renderings inutiles.
//
// 2.  **Gestion d'État Robuste :** L'état est clairement séparé : `users`, `total`,
//     `loading`, `error`, `pagination`, `filters`. C'est lisible et facile à maintenir.
//
// 3.  **Debouncing de la Recherche :** Un `setTimeout` est utilisé pour "déclencher" la
//     recherche seulement 500ms après que l'utilisateur a fini de taper. Cela évite de
//     marteler l'API à chaque frappe, économisant des ressources serveur et client.
//
// 4.  **Interface Réactive :** Les états de chargement (`loading`) et d'erreur (`error`)
//     sont gérés pour fournir un retour visuel clair à l'administrateur.
//
// 5.  **Pagination Intelligente :** Les boutons "Suivant" et "Précédent" sont
//     automatiquement désactivés lorsqu'on atteint les extrémités de la liste.
//
// 6.  **Typage TypeScript :** Les interfaces `User` et `Pagination` garantissent la
//     sécurité des types et l'autocomplétion, prévenant de nombreuses erreurs.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
  total_ia_cost: number;
  // [NOUVEAU] Ajout des champs pour les nouvelles colonnes
  subscription_status: 'active' | 'expired' | 'extended' | null;
}

interface Pagination {
  offset: number;
  limit: number;
}

interface Filters {
  search: string;
  status: string;
  offer: string;
}

export const UserManagement: React.FC = () => {
  const navigate = useNavigate(); // [NOUVEAU] Hook pour gérer la navigation
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  
  
  const [pagination, setPagination] = useState<Pagination>({ offset: 0, limit: 20 });
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', offer: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams({
      limit: String(pagination.limit),
      offset: String(pagination.offset),
    });

    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.status) {
      params.append('status', filters.status);
    }
    if (filters.offer) {
      params.append('offer', filters.offer);
    }

    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Erreur lors de la récupération des utilisateurs.');
      }
      const data = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  // Effet pour le debouncing de la recherche
  useEffect(() => {
    const handler = setTimeout(() => {
      // On réinitialise l'offset à 0 à chaque nouvelle recherche
      setPagination(p => ({ ...p, offset: 0 }));
      fetchUsers();
    }, 500); // Délai de 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [filters.search, filters.status, filters.offer]); // Se déclenche si un des filtres change

  // Effet pour la pagination
  useEffect(() => {
    fetchUsers();
  }, [pagination.offset, pagination.limit]);

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < total) {
      setPagination(p => ({ ...p, offset: p.offset + p.limit }));
    }
  };

  const handlePrevPage = () => {
    setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }));
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Gestion des Utilisateurs</h2>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Rechercher par email, nom..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          style={{ padding: '0.5rem', width: '300px' }}
        />
        <select 
          value={filters.status} 
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '0.5rem' }}
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="expired">Expiré</option>
          <option value="extended">Prolongé</option>
        </select>
        <select 
          value={filters.offer} 
          onChange={(e) => setFilters(f => ({ ...f, offer: e.target.value }))}
          style={{ padding: '0.5rem' }}
        >
          <option value="">Toutes les offres</option>
          <option value="plan_1_month">1 Mois</option>
          <option value="plan_3_months">3 Mois</option>
        </select>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>Erreur: {error}</div>}

      {/* Tableau des utilisateurs */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Statut Abonnement</th>
              <th style={thStyle}>Inscrit le</th>
              <th style={thStyle}>Dernier login</th>
              <th style={thStyle}>Coût IA</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>
                    <div>{user.email}</div>
                    <div style={{fontSize: '0.8rem', color: '#64748b'}}>{user.first_name} {user.last_name}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadge[user.subscription_status || 'inactive']}>
                      {user.subscription_status || 'N/A'}
                    </span>
                  </td>
                  <td style={tdStyle}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais'}</td>
                  <td style={tdStyle}>{user.total_ia_cost.toFixed(2)} €</td>
                  <td style={tdStyle}>
                    {/* [NOUVEAU] Bouton pour voir le détail. Il faudra implémenter la navigation. */}
                    <button onClick={() => navigate(`/admin/user/${user.id}`)} style={actionButton}>
                      Voir détail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Contrôles de pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <span>
          Affichage de {Math.min(pagination.offset + 1, total)} à {Math.min(pagination.offset + pagination.limit, total)} sur {total} utilisateurs
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePrevPage} disabled={pagination.offset === 0 || loading}>
            Précédent
          </button>
          <button onClick={handleNextPage} disabled={pagination.offset + pagination.limit >= total || loading}>
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles pour la lisibilité
const thStyle: React.CSSProperties = {
  padding: '0.75rem',
  textAlign: 'left',
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem',
  verticalAlign: 'middle',
};

const statusBadge = {
  base: {
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
    display: 'inline-block',
  },
  active: {
    color: '#166534',
    backgroundColor: '#dcfce7',
  },
  extended: {
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
  },
  inactive: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
  },
  expired: {
    color: '#713f12',
    backgroundColor: '#fef3c7',
  }
};

statusBadge.active = {...statusBadge.base, ...statusBadge.active};
statusBadge.inactive = {...statusBadge.base, ...statusBadge.inactive};
statusBadge.expired = {...statusBadge.base, ...statusBadge.expired};
statusBadge.extended = {...statusBadge.base, ...statusBadge.extended};

const actionButton: React.CSSProperties = { background: 'transparent', border: '1px solid #cbd5e1', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' };

export default UserManagement;