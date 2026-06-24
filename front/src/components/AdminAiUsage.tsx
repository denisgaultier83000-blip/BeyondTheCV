import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, DollarSign, Clock, BarChart3, AlertTriangle, User, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

// --- Types ---
interface ModuleStat {
  module: string;
  avg_cost: number;
  avg_time_ms: number;
  failure_rate: number;
  priority: 'Critique' | 'À surveiller' | 'Rentable' | 'Utile';
}

interface UserAlert {
  id: string;
  email: string;
  offer_name: string;
  price_paid: number;
  total_ia_cost: number;
  cost_ratio: number;
  alert_level: 'Critique' | 'Élevé' | 'Alerte';
}

interface AiUsageStats {
  total_sessions_purchased: number;
  total_sessions_used: number;
  avg_cost_per_session: number;
  max_cost_observed: number;
  avg_session_duration_ms: number;
  total_regenerations: number;
  module_stats: ModuleStat[];
  user_alerts: UserAlert[];
}

export function AdminAiUsage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/ai-usage-stats`);
        if (!response.ok) throw new Error("Impossible de charger les statistiques d'usage IA.");
        setStats(await response.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Couleurs pour le graphique
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const getAlertStyle = (level: string) => {
    if (level === 'Critique') return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    if (level === 'Élevé') return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' };
    return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-800">
        <ArrowLeft size={18} /> Retour au Dashboard
      </button>

      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-3">
          <Cpu size={32} className="text-blue-600" />
          Suivi des Coûts & Crédits IA
        </h1>
        <p className="text-slate-500 mt-2">Votre tour de contrôle pour garantir la rentabilité de chaque client.</p>
      </div>

      <AsyncBoundary loading={loading} error={error || undefined} loadingText="Calcul des métriques de consommation IA...">
        {stats && (
          <>
            {/* Indicateurs Clés */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border"><div className="text-sm text-slate-500">Séances utilisées</div><div className="text-2xl font-bold mt-1">{stats.total_sessions_used} / {stats.total_sessions_purchased}</div></div>
              <div className="bg-white p-5 rounded-xl shadow-sm border"><div className="text-sm text-slate-500">Coût moyen / séance</div><div className="text-2xl font-bold mt-1">{stats.avg_cost_per_session.toFixed(3)} €</div></div>
              <div className="bg-white p-5 rounded-xl shadow-sm border"><div className="text-sm text-slate-500">Durée moyenne</div><div className="text-2xl font-bold mt-1">{(stats.avg_session_duration_ms / 1000).toFixed(1)} s</div></div>
              <div className="bg-white p-5 rounded-xl shadow-sm border"><div className="text-sm text-slate-500">Coût max. observé</div><div className="text-2xl font-bold text-red-600 mt-1">{stats.max_cost_observed.toFixed(3)} €</div></div>
            </div>

            {/* [NOUVEAU] Grille pour le tableau et le graphique */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Coût par Module - Tableau */}
              <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border overflow-x-auto">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={20} /> Rentabilité par Module</h2>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-2">Module</th>
                      <th className="px-4 py-2 text-right">Coût Moyen</th>
                      <th className="px-4 py-2 text-right">Temps Moyen</th>
                      <th className="px-4 py-2 text-right">Taux d'Échec</th>
                      <th className="px-4 py-2">Priorité Optimisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.module_stats.map(mod => (
                      <tr key={mod.module} className="border-b">
                        <td className="px-4 py-3 font-medium">{mod.module}</td>
                        <td className="px-4 py-3 text-right font-mono">{mod.avg_cost.toFixed(3)} €</td>
                        <td className="px-4 py-3 text-right font-mono">{(mod.avg_time_ms / 1000).toFixed(1)} s</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${mod.failure_rate > 10 ? 'text-red-600' : mod.failure_rate > 5 ? 'text-amber-600' : 'text-slate-500'}`}>{mod.failure_rate.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAlertStyle(mod.priority).bg} ${getAlertStyle(mod.priority).text}`}>{mod.priority}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Coût par Module - Graphique */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">Répartition des Coûts</h2>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={stats.module_stats} dataKey="avg_cost" nameKey="module" cx="50%" cy="50%" outerRadius={80} label>
                        {stats.module_stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(3)}€`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Alertes Utilisateurs */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> Alertes Coûts Utilisateurs</h2>
              {stats.user_alerts.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-2">Utilisateur</th>
                      <th className="px-4 py-2">Offre</th>
                      <th className="px-4 py-2 text-right">Coût IA / Prix Payé</th>
                      <th className="px-4 py-2 text-right">Ratio</th>
                      <th className="px-4 py-2">Niveau d'Alerte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.user_alerts.map(alert => {
                      const styles = getAlertStyle(alert.alert_level);
                      return (
                        <tr key={alert.id} className={`border-b ${styles.bg} border-opacity-50`}>
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <User size={16} /> {alert.email}
                          </td>
                          <td className="px-4 py-3">{alert.offer_name}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            <span className={`font-bold ${styles.text}`}>{alert.total_ia_cost.toFixed(2)}€</span> / {alert.price_paid.toFixed(2)}€
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${styles.text}`}>
                            {(alert.cost_ratio * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles.bg} ${styles.text} border ${styles.border}`}>{alert.alert_level}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Aucun utilisateur ne dépasse les seuils d'alerte. Tout est sous contrôle.
                </div>
              )}
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}