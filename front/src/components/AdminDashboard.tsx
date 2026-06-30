import React, { useState, useEffect } from 'react';
import AdminQuotaManager from './AdminQuotaManager';
import { useNavigate } from 'react-router-dom';
import { storageManager } from '../utils/storageManager';
import { User, Shield, Calendar, Eye, Database, CheckCircle, XCircle, Percent, BarChart3, DollarSign, Users, Cpu, Package, AlertTriangle, LifeBuoy, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Types ---
interface Stats {
  total_users: number;
  premium_users: number;
  new_users_7d: number;
  total_tasks: number;
  cache_hits?: number;
  cache_misses?: number;
  cache_hit_ratio?: number;
  avg_training_score: number;
  // [NOUVEAU] Indicateurs financiers et IA
  revenue_month?: number;
  ai_cost_month?: number;
  avg_ai_cost_per_user?: number;
}

interface CacheHistoryItem {
  date: string;
  hits: number;
  misses: number;
  hit_ratio: number;
}

interface Health {
  stripe: string;
  openai: string;
  gemini: string;
  serper: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_premium: boolean;
  is_active: boolean;
  credits: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // --- États pour la Modale d'Abonnement ---
  const [subscriptionModalUser, setSubscriptionModalUser] = useState<User | null>(null);
  const [subAction, setSubAction] = useState<'extend' | 'cancel'>('extend');
  const [subDays, setSubDays] = useState<number>(30);
  const [subLoading, setSubLoading] = useState(false);
  const [cacheHistory, setCacheHistory] = useState<CacheHistoryItem[]>([]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // Remplacez 'token' par la clé exacte que vous utilisez dans le localStorage (ex: 'access_token')
      const token = storageManager.local.getItem('token'); 
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Chargement en parallèle des 3 endpoints vitaux
      // [MODIFIÉ] On appelle le nouvel endpoint pour les stats de cache globales
      const [statsRes, healthRes, usersRes, cacheHistoryRes, cacheStatsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/health-check', { headers }),
        fetch('/api/admin/users?limit=20', { headers }),
        fetch('/api/admin/cache-history?days=7', { headers }),
        fetch('/api/admin/cache/stats', { headers }) // Nouvel appel
      ]);

      if (!statsRes.ok || !healthRes.ok || !usersRes.ok) {
        throw new Error("Erreur d'accès. Avez-vous bien les droits d'Administrateur ?");
      }

      const baseStats = await statsRes.json();
      const cacheStats = cacheStatsRes.ok ? await cacheStatsRes.json() : {};
      
      // On fusionne les stats de base avec les nouvelles stats de cache
      setStats({
        ...baseStats,
        cache_hits: cacheStats.total_hits,
        cache_misses: cacheStats.total_misses,
        cache_hit_ratio: cacheStats.hit_ratio_percent,
      });

      const healthData = await healthRes.json();
      setHealth(healthData.services);
      
      const usersData = await usersRes.json();
      setUsers(usersData.users);
      
      const cacheHistoryData = await cacheHistoryRes.json();
      setCacheHistory(cacheHistoryData.cache_history);

    } catch (err: any) {
      setError(err.message || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleManageSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriptionModalUser) return;
    setSubLoading(true);
    
    try {
      const token = storageManager.local.getItem('token');
      const res = await fetch(`/api/admin/users/${subscriptionModalUser.id}/subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: subAction, days: subDays })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur lors de la modification de l'abonnement.");
      }
      
      await fetchAdminData(); // Rafraîchit les statuts dans le tableau
      setSubscriptionModalUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubLoading(false);
    }
  };

  const toggleUserActive = async (userId: string) => {
    try {
      const token = storageManager.local.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Mise à jour optimiste de l'UI
        setUsers(users.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u));
      } else {
        alert('Erreur lors de la modification du statut utilisateur.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // [AJOUT] Fonction pour naviguer vers la page de profil d'un utilisateur
  const viewUserProfile = (userId: string) => {
    // Cette route est à créer, elle pourrait charger le dashboard de l'utilisateur en mode "lecture seule"
    navigate(`/admin/user/${userId}`);
  };

  const formattedCacheHistory = cacheHistory.map(item => ({
    ...item,
    name: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
  }));

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement du centre de commandement...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', textAlign: 'center' }}>🚨 {error}</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', color: 'var(--text-main)', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--primary)', fontSize: '2rem', margin: 0 }}>Dashboard Admin</h1>
        <button onClick={fetchAdminData} style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>🔄 Rafraîchir</button>
      </div>
      
      {/* --- SECTION 1 : STATISTIQUES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Bloc Revenus */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><DollarSign size={16} /> Revenus</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{(stats?.revenue_month ?? 0).toFixed(2)} €</p>
          <p className="text-xs text-slate-400 mt-1">CA du mois en cours</p>
        </div>
        {/* Bloc Utilisateurs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Users size={16} /> Utilisateurs</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.total_users}</p>
          <p className="text-xs text-green-500 font-medium mt-1">+{stats?.new_users_7d} (7 derniers jours)</p>
        </div>
        {/* Bloc Coûts IA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Cpu size={16} /> Coûts IA</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{(stats?.ai_cost_month ?? 0).toFixed(2)} €</p>
          <p className="text-xs text-slate-400 mt-1">Coût moyen / client : {(stats?.avg_ai_cost_per_user ?? 0).toFixed(2)} €</p>
        </div>
        {/* Bloc Produit */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Package size={16} /> Produit</h3>
          <p className="text-3xl font-bold text-slate-800 mt-2">{stats?.total_tasks}</p>
          <p className="text-xs text-slate-400 mt-1">Générations IA totales</p>
        </div>
      </div>

      {/* --- SECTION 2 : MARGE & PERFORMANCE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Marge par offre */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Percent size={20} /> Marge Brute Estimée par Offre</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Offre</th>
                  <th className="px-4 py-2">Prix</th>
                  <th className="px-4 py-2">Coût IA Moyen</th>
                  <th className="px-4 py-2">Marge Estimée</th>
                </tr>
              </thead>
              <tbody>
                {/* Ces données devront venir d'un nouvel endpoint /api/admin/margins */}
                <tr className="border-b"><td className="px-4 py-3 font-medium">Express</td><td className="px-4 py-3">39 €</td><td className="px-4 py-3">3 €</td><td className="px-4 py-3 font-bold text-green-600">33,70 €</td></tr>
                <tr className="border-b"><td className="px-4 py-3 font-medium">Stratégique</td><td className="px-4 py-3">119 €</td><td className="px-4 py-3">12 €</td><td className="px-4 py-3 font-bold text-green-600">101,50 €</td></tr>
                <tr><td className="px-4 py-3 font-medium">Intensive</td><td className="px-4 py-3">219 €</td><td className="px-4 py-3">28 €</td><td className="px-4 py-3 font-bold text-green-600">181 €</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Cache */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Database size={20} /> Performance Cache OSINT</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4"><CheckCircle size={24} className="text-green-500" /><div><p className="font-bold text-xl">{stats?.cache_hits ?? 0}</p><p className="text-xs text-slate-500">Cache Hits</p></div></div>
            <div className="flex items-center gap-4"><XCircle size={24} className="text-red-500" /><div><p className="font-bold text-xl">{stats?.cache_misses ?? 0}</p><p className="text-xs text-slate-500">Cache Misses</p></div></div>
            <div className="flex items-center gap-4"><Percent size={24} className={`text-${(stats?.cache_hit_ratio ?? 0) >= 80 ? 'green' : 'yellow'}-500`} />
              <div><p className="font-bold text-xl">{(stats?.cache_hit_ratio ?? 0)}%</p><p className="text-xs text-slate-500">Hit Ratio</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LIEN VERS LA NOUVELLE PAGE --- */}
      <div className="text-center my-8">
        <button 
          onClick={() => navigate('/admin/ai-usage')}
          className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
        >
          Accéder au Suivi Détaillé des Coûts IA <ArrowRight size={18} />
        </button>
      </div>

      {/* --- SECTION 3 : GRAPHIQUES & SANTÉ --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Graphique */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={20} /> Historique du Hit Ratio (7 derniers jours)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={formattedCacheHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize="12px" />
                <YAxis stroke="#94a3b8" fontSize="12px" unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                <Line type="monotone" dataKey="hit_ratio" name="Hit Ratio" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} unit="%" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Check */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><LifeBuoy size={20} /> État des Services Tiers</h2>
          <div className="space-y-3">
            {health && Object.entries(health).map(([service, status]) => {
              const isOk = status === 'ok';
              return (
                <div key={service} className={`flex items-center justify-between p-3 rounded-lg ${isOk ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-medium capitalize text-slate-700">{service}</span>
                  <span className={`font-bold text-xs uppercase px-2 py-1 rounded-full ${isOk ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- SECTION 4 : GESTION & UTILISATEURS --- */}
      <div className="space-y-6">
        <AdminQuotaManager />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Derniers Inscrits</h2>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Inscription</th>
                <th className="px-4 py-2">Premium</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{user.email}</td>
                  <td className="px-4 py-3 text-slate-500">{user.first_name} {user.last_name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">{user.is_premium ? '⭐ Oui' : 'Non'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Actif' : 'Banni'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => viewUserProfile(user.id)} title="Voir le profil" className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Eye size={16} /></button>
                      <button onClick={() => setSubscriptionModalUser(user)} title="Gérer l'abonnement" className="p-2 text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md"><Calendar size={16} /></button>
                      <button onClick={() => toggleUserActive(user.id)} title={user.is_active ? 'Bannir' : 'Activer'} className={`p-2 ${user.is_active ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-green-600 hover:bg-green-50'} rounded-md`}><Shield size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALE DE GESTION D'ABONNEMENT --- */}
      {subscriptionModalUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Gérer l'abonnement</h3>
            <p className="text-sm text-slate-500 mb-6">Utilisateur : <strong className="text-slate-700">{subscriptionModalUser.email}</strong></p>
            
            <form onSubmit={handleManageSubscription} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Action souhaitée</label>
                <select value={subAction} onChange={e => setSubAction(e.target.value as 'extend' | 'cancel')} className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="extend">Prolonger l'abonnement (Jours)</option>
                  <option value="cancel">Annuler immédiatement l'abonnement</option>
                </select>
              </div>

              {subAction === 'extend' && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Nombre de jours à ajouter</label>
                  <input type="number" value={subDays} onChange={e => setSubDays(parseInt(e.target.value))} min="1" className="w-full mt-1 p-2 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setSubscriptionModalUser(null)} className="flex-1 py-2 px-4 bg-white border border-slate-300 rounded-md text-slate-700 font-semibold hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={subLoading} className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {subLoading ? 'Traitement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}