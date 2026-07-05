import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Filter, User, Package, Shield, Calendar, Clock, Cpu, BarChart3 } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

// --- Types ---
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  offer_name: 'Express' | 'Stratégique' | 'Intensive' | 'N/A';
  status: 'actif' | 'expiré' | 'bloqué' | 'remboursé';
  created_at: string;
  last_login: string;
  sessions_remaining: number;
  total_ia_cost: number;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ offer: 'all', status: 'all' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users`);
        if (!response.ok) throw new Error("Impossible de charger la liste des utilisateurs.");
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch = searchTerm.trim() === '' ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const offerMatch = filters.offer === 'all' || user.offer_name === filters.offer;
      const statusMatch = filters.status === 'all' || user.status === filters.status;

      return searchMatch && offerMatch && statusMatch;
    });
  }, [users, searchTerm, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement de la liste des utilisateurs...">
      <div className="admin-page-header">
        <h1>Gestion des Utilisateurs</h1>
        <p>Pilotez, recherchez et assistez vos clients depuis un seul endroit.</p>
      </div>

      {/* Barre de filtres */}
      <div className="admin-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <select name="offer" value={filters.offer} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Toutes les offres</option>
            <option value="Express">Express</option>
            <option value="Stratégique">Stratégique</option>
            <option value="Intensive">Intensive</option>
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="expiré">Expiré</option>
            <option value="bloqué">Bloqué</option>
            <option value="remboursé">Remboursé</option>
          </select>
        </div>
      </div>

      {/* Tableau des zutilisateurs */}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[1000px]">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Offre</th>
              <th>Statut</th>
              <th>Inscription</th>
              <th>Dernière Conn.</th>
              <th className="text-right">Séances</th>
              <th className="text-right">Coût IA</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="font-bold">{user.first_name} {user.last_name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{user.offer_name}</span></td>
                <td><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.status}</span></td>
                <td>{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                <td>{new Date(user.last_login).toLocaleDateString('fr-FR')}</td>
                <td className="text-right font-mono">{user.sessions_remaining}</td>
                <td className="text-right font-mono font-bold text-red-600">{user.total_ia_cost.toFixed(2)} €</td>
                <td className="text-right">
                  <button onClick={() => navigate(`/admin/user/${user.id}`)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"><Eye size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncBoundary>
  );
};

export default AdminUsers;