import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, DollarSign, Clock, BarChart3, AlertTriangle, User, TrendingUp, TrendingDown } from 'lucide-react';
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

```

### 2. Création de l'endpoint backend (`admin_service.py`)

J'ai ajouté la nouvelle route `/api/admin/ai-usage-stats` à votre service d'administration. Elle effectue les calculs nécessaires en se basant sur des tables `generation_logs` et `payments` (que vous devrez mettre en place si elles n'existent pas).

```diff
--- a/home/pimpampoum/BeyondTheCV/backend/services/admin_service.py
+++ b/home/pimpampoum/BeyondTheCV/backend/services/admin_service.py
@@ -345,3 +345,78 @@
         statuses["serper"] = "missing_key"
 
     return {"services": statuses}
+
+@router.get("/ai-usage-stats", response_model=dict)
+async def get_ai_usage_stats():
+    """
+    [NOUVEAU] Fournit des statistiques détaillées sur l'utilisation et les coûts de l'IA.
+    """
+    # NOTE : Ce endpoint suppose l'existence d'une table `generation_logs`
+    # avec les colonnes : module (TEXT), cost (NUMERIC), duration_ms (INT), status (TEXT)
+    # et que la table `users` contient `total_ia_cost` et `offer_price_paid`.
+    try:
+        async with db.get_connection() as conn:
+            # Métriques générales
+            s1 = await db.fetchone(conn, "SELECT SUM(quota_pitch + quota_qa + quota_mes + quota_negotiation) as used, SUM(initial_quota_pitch + initial_quota_qa + initial_quota_mes + initial_quota_negotiation) as purchased FROM users")
+            total_sessions_used = s1[0] or 0
+            total_sessions_purchased = s1[1] or 1 # Evite division par zero
+
+            s2 = await db.fetchone(conn, "SELECT AVG(cost), MAX(cost), AVG(duration_ms) FROM generation_logs WHERE status = 'COMPLETED'")
+            avg_cost_per_session = s2[0] or 0
+            max_cost_observed = s2[1] or 0
+            avg_session_duration_ms = s2[2] or 0
+
+            s3 = await db.fetchone(conn, "SELECT COUNT(*) FROM generation_logs WHERE module = 'regeneration'")
+            total_regenerations = s3[0] or 0
+
+            # Coût par module
+            s4 = await db.execute(conn, """
+                SELECT
+                    module,
+                    AVG(cost) as avg_cost,
+                    AVG(duration_ms) as avg_time_ms,
+                    (SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as failure_rate
+                FROM generation_logs
+                GROUP BY module
+                ORDER BY avg_cost DESC
+            """)
+            module_stats_raw = await s4.fetchall()
+            module_stats = []
+            for row in module_stats_raw:
+                priority = "Utile"
+                if row['failure_rate'] > 10 or (row['avg_cost'] > 0.1 and row['avg_time_ms'] > 20000):
+                    priority = "Critique"
+                elif row['avg_cost'] > 0.05 or row['failure_rate'] > 5:
+                    priority = "À surveiller"
+                elif row['avg_cost'] < 0.01:
+                    priority = "Rentable"
+                module_stats.append({**dict(row), "priority": priority})
+
+            # Alertes utilisateurs
+            s5 = await db.execute(conn, """
+                SELECT id, email, offer_name, offer_price_paid, total_ia_cost, (total_ia_cost / offer_price_paid) as cost_ratio
+                FROM users
+                WHERE offer_price_paid > 0 AND (total_ia_cost / offer_price_paid) > 0.2
+                ORDER BY cost_ratio DESC
+            """)
+            user_alerts_raw = await s5.fetchall()
+            user_alerts = []
+            for row in user_alerts_raw:
+                level = "Alerte"
+                if row['cost_ratio'] > 0.5: level = "Critique"
+                elif row['cost_ratio'] > 0.35: level = "Élevé"
+                user_alerts.append({**dict(row), "alert_level": level})
+
+        return {
+            "total_sessions_purchased": total_sessions_purchased,
+            "total_sessions_used": total_sessions_used,
+            "avg_cost_per_session": avg_cost_per_session,
+            "max_cost_observed": max_cost_observed,
+            "avg_session_duration_ms": avg_session_duration_ms,
+            "total_regenerations": total_regenerations,
+            "module_stats": module_stats,
+            "user_alerts": user_alerts,
+        }
+    except Exception as e:
+        # Log l'erreur réelle côté serveur
+        print(f"[CRITICAL] AI Usage Stats Error: {e}")
+        raise HTTPException(status_code=500, detail=f"Erreur base de données lors du calcul des stats IA: {e}")