import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, DollarSign, BarChart3, AlertTriangle, User, TrendingUp, TrendingDown } from 'lucide-react';
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
  gross_margin: number;
  alert_level: 'Critique' | 'Élevé' | 'Alerte';
}

interface OfferMargin {
    offer_name: string;
    margin: number;
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
  gross_margin_by_offer?: OfferMargin[];
  gross_margin_on_recharges?: number;
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

            {/* Marge par Offre et Recharges */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign size={20} /> Marge Brute Estimée
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold text-slate-600">Par Offre</h3>
                        {stats.gross_margin_by_offer?.map(offer => (
                            <div key={offer.offer_name} className="flex justify-between items-center mt-2">
                                <span>{offer.offer_name}</span>
                                <span className="font-bold">{offer.margin.toFixed(2)} €</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-600">Sur les Recharges</h3>
                        <p className="text-2xl font-bold">
                            {stats.gross_margin_on_recharges?.toFixed(2) ?? 'N/A'} €
                        </p>
                    </div>
                </div>
            </div>

            {/* Coût par Module */}
            <div className="bg-white p-6 rounded-xl shadow-sm border overflow-x-auto">
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
                      <th className="px-4 py-2 text-right">Marge Brute</th>
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
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {alert.gross_margin.toFixed(2)}€
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