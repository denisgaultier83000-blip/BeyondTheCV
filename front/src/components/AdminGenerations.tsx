import React, { useState, useEffect, useMemo } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';
import { Bot, Filter, Search, CheckCircle, XCircle, AlertTriangle, Clock, DollarSign, Code, User, Tag } from 'lucide-react';

// --- Types ---
interface Generation {
  id: string;
  user_email: string;
  module: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  created_at: string;
  estimated_cost: number;
  duration_ms: number;
  model_used: string;
  prompt_version: string;
  error_message?: string;
}

const AdminGenerations: React.FC = () => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ module: 'all', status: 'all', model: 'all' });

  useEffect(() => {
    const fetchGenerations = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/generations`);
        if (!response.ok) throw new Error("Impossible de charger l'historique des générations.");
        const data = await response.json();
        setGenerations(data.generations || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGenerations();
  }, []);

  const filteredGenerations = useMemo(() => {
    return generations.filter(gen => {
      const searchMatch = searchTerm.trim() === '' || gen.user_email.toLowerCase().includes(searchTerm.toLowerCase());
      const moduleMatch = filters.module === 'all' || gen.module === filters.module;
      const statusMatch = filters.status === 'all' || gen.status === filters.status;
      const modelMatch = filters.model === 'all' || gen.model_used.toLowerCase().includes(filters.model.toLowerCase());
      return searchMatch && moduleMatch && statusMatch && modelMatch;
    });
  }, [generations, searchTerm, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle size={12}/> Succès</span>;
      case 'FAILURE': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle size={12}/> Échec</span>;
      case 'PARTIAL': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><AlertTriangle size={12}/> Partiel</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement de l'historique des générations IA...">
      <div className="admin-page-header">
        <h1>Suivi des Générations IA</h1>
        <p>Supervisez chaque appel à l'IA pour le débogage, l'analyse des coûts et l'optimisation des prompts.</p>
      </div>

      {/* Filtres */}
      <div className="admin-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Rechercher par email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 p-2 border border-gray-300 rounded-md bg-gray-50" />
          </div>
          <select name="module" value={filters.module} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Tous les modules</option>
            {[...new Set(generations.map(g => g.module))].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Tous les statuts</option>
            <option value="SUCCESS">Succès</option>
            <option value="FAILURE">Échec</option>
            <option value="PARTIAL">Partiel</option>
          </select>
          <select name="model" value={filters.model} onChange={handleFilterChange} className="p-2 border border-gray-300 rounded-md bg-gray-50">
            <option value="all">Tous les modèles</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
      </div>

      {/* Tableau des générations */}
      <div className="admin-card overflow-x-auto">
        <table className="admin-table w-full min-w-[1200px]">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Module</th>
              <th>Statut</th>
              <th>Date</th>
              <th className="text-right">Coût</th>
              <th className="text-right">Durée</th>
              <th>Modèle</th>
              <th>Erreur</th>
            </tr>
          </thead>
          <tbody>
            {filteredGenerations.map(g => (
              <tr key={g.id}>
                <td><div className="flex items-center gap-2"><User size={14} className="text-gray-400"/>{g.user_email}</div></td>
                <td><div className="flex items-center gap-2"><Tag size={14} className="text-gray-400"/>{g.module}</div></td>
                <td>{getStatusBadge(g.status)}</td>
                <td>{new Date(g.created_at).toLocaleString('fr-FR')}</td>
                <td className="text-right font-mono"><DollarSign size={12} className="inline-block mr-1"/>{g.estimated_cost.toFixed(4)}</td>
                <td className="text-right font-mono"><Clock size={12} className="inline-block mr-1"/>{(g.duration_ms / 1000).toFixed(2)}s</td>
                <td><div className="flex items-center gap-2"><Code size={14} className="text-gray-400"/>{g.model_used} ({g.prompt_version})</div></td>
                <td className="text-xs text-red-600 max-w-xs truncate" title={g.error_message}>{g.error_message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AsyncBoundary>
  );
};

export default AdminGenerations;