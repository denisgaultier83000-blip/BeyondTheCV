import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Shield, Briefcase, DollarSign, Cpu, Activity, Clock, PlusCircle, Repeat, RefreshCw, UserX, Bot, CheckCircle, XCircle } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

// --- Types ---
interface UserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  last_login: string;
  offer_name: string;
  status: 'actif' | 'expiré' | 'bloqué' | 'remboursé';
  expiration_date?: string;
  total_ia_cost: number;
  sessions_remaining: number;
  login_count: number;
}

interface Generation {
  id: string;
  module: string;
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  created_at: string;
  estimated_cost: number;
}

const AdminUserDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, gensRes] = await Promise.all([
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}`),
          authenticatedFetch(`${API_BASE_URL}/api/admin/users/${userId}/generations?limit=5`)
        ]);

        if (!userRes.ok) throw new Error("Impossible de charger les détails de l'utilisateur.");
        
        setUser(await userRes.json());
        if (gensRes.ok) setGenerations((await gensRes.json()).generations || []);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleAdminAction = (action: string) => alert(`Action non implémentée : ${action}`);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'actif': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle size={12}/> Actif</span>;
      case 'expiré': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock size={12}/> Expiré</span>;
      case 'bloqué': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle size={12}/> Bloqué</span>;
      default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement du profil utilisateur...">
      {user && (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-gray-500 font-semibold hover:text-gray-800 mb-4">
                <ArrowLeft size={18} /> Retour à la liste
              </button>
              <div className="admin-page-header" style={{ marginBottom: 0 }}>
                <h1>{user.first_name} {user.last_name}</h1>
                <p className="flex items-center gap-2"><Mail size={14} /> {user.email}</p>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(user.status)}
              <div className="text-xs text-gray-500 mt-1">Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>

          {/* Indicateurs Clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="admin-card text-center"><h3 className="text-sm font-semibold text-gray-500">Coût IA Total</h3><p className="text-2xl font-bold text-red-600 mt-1">{user.total_ia_cost.toFixed(2)} €</p></div>
            <div className="admin-card text-center"><h3 className="text-sm font-semibold text-gray-500">Séances Restantes</h3><p className="text-2xl font-bold mt-1">{user.sessions_remaining}</p></div>
            <div className="admin-card text-center"><h3 className="text-sm font-semibold text-gray-500">Nb. Connexions</h3><p className="text-2xl font-bold mt-1">{user.login_count}</p></div>
            <div className="admin-card text-center"><h3 className="text-sm font-semibold text-gray-500">Dernière Activité</h3><p className="text-2xl font-bold mt-1">{new Date(user.last_login).toLocaleDateString('fr-FR')}</p></div>
          </div>

          {/* Actions Admin */}
          <div className="admin-card mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Actions Rapides</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <button onClick={() => handleAdminAction("Prolonger l'accès")} className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Clock size={16}/> Prolonger Accès</button>
              <button onClick={() => handleAdminAction("Ajouter des séances")} className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><PlusCircle size={16}/> Ajouter Séances</button>
              <button onClick={() => handleAdminAction("Relancer l'analyse")} className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Repeat size={16}/> Relancer Analyse</button>
              <button onClick={() => handleAdminAction("Purger le cache IA")} className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><RefreshCw size={16}/> Purger Cache IA</button>
              <button onClick={() => handleAdminAction("Rembourser")} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm font-semibold text-yellow-800 hover:bg-yellow-100 flex items-center gap-2"><DollarSign size={16}/> Rembourser</button>
              <button onClick={() => handleAdminAction("Bloquer le compte")} className="p-3 bg-red-50 border border-red-200 rounded-md text-sm font-semibold text-red-800 hover:bg-red-100 flex items-center gap-2"><Shield size={16}/> Bloquer Compte</button>
              <button onClick={() => handleAdminAction("Anonymiser (RGPD)")} className="p-3 bg-red-50 border border-red-200 rounded-md text-sm font-semibold text-red-800 hover:bg-red-100 flex items-center gap-2"><UserX size={16}/> Anonymiser</button>
            </div>
          </div>

          {/* Historique des générations */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Dernières Générations IA</h2>
            <div className="overflow-x-auto">
              <table className="admin-table w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th className="text-right">Coût</th>
                  </tr>
                </thead>
                <tbody>
                  {generations.map(g => (
                    <tr key={g.id}>
                      <td>{g.module}</td>
                      <td>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${g.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {g.status}
                        </span>
                      </td>
                      <td>{new Date(g.created_at).toLocaleString('fr-FR')}</td>
                      <td className="text-right font-mono">{g.estimated_cost.toFixed(4)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AsyncBoundary>
  );
};

export default AdminUserDetails;