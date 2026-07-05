import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { Loader2, Search, User, AlertTriangle } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchUsers = useCallback(async (currentPage: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentPage * limit),
      });
      if (search) params.append('search', search);

      const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(page, searchTerm);
    }, 500); // Debounce search
    return () => clearTimeout(handler);
  }, [page, searchTerm, fetchUsers]);

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User /> Gestion des Utilisateurs</h2>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Rechercher par email ou nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '0.5rem', width: '300px' }}
        />
      </div>

      {loading && <Loader2 className="spin" />}
      {error && <div style={{ color: 'red' }}><AlertTriangle /> {error}</div>}

      {!loading && !error && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nom</th>
                <th>Inscrit le</th>
                <th>Dernier login</th>
                <th>Statut</th>
                <th>Coût IA</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}</td>
                  <td>{user.is_active ? 'Actif' : 'Inactif'}</td>
                  <td>{user.total_ia_cost?.toFixed(2) || 0} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Précédent</button>
            <span>Page {page + 1} sur {Math.ceil(total / limit)}</span>
            <button onClick={() => setPage(p => (p + 1) * limit < total ? p + 1 : p)} disabled={(page + 1) * limit >= total}>Suivant</button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsers;