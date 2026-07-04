import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { storageManager } from '../utils/storageManager';

const StatCard = ({ label, value, unit = '' }) => {
  const statCardStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  };

  const statValueStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#0F2650',
    margin: '0 0 8px 0'
  };

  const statLabelStyle = {
    fontSize: '14px',
    color: '#446285',
    fontWeight: '600',
    textTransform: 'uppercase'
  };

  return (
    <div style={statCardStyle}>
      <p style={statValueStyle}>{value}{unit}</p>
      <p style={statLabelStyle}>{label}</p>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]);
  const [cacheHistory, setCacheHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = storageManager.getItem('admin_token');
        if (!token) {
          throw new Error('Token administrateur non trouvé. Veuillez vous reconnecter.');
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        // [OPTIMISATION] Lancement des requêtes en parallèle pour un chargement plus rapide
        const [statsRes, usersRes, cacheHistoryRes] = await Promise.all([
          fetch('/api/admin/stats', { headers }),
          fetch('/api/admin/recent-users?limit=5', { headers }),
          fetch('/api/admin/cache-history?days=7', { headers })
        ]);

        if (!statsRes.ok) {
          const errorData = await statsRes.json();
          throw new Error(errorData.detail || 'Erreur de récupération des statistiques.');
        }

        const statsData = await statsRes.json();
        setStats(statsData);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setRecentUsers(usersData.users || []);
        }

        if (cacheHistoryRes.ok) {
          const cacheData = await cacheHistoryRes.json();
          setCacheHistory(cacheData.cache_history || []);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>Chargement du tableau de bord...</div>;
  }

  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontSize: '18px' }}>Erreur : {error}</div>;
  }

  const formattedCacheHistory = cacheHistory.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <div style={{ padding: '40px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#0F2650', marginBottom: '40px' }}>Tour de Contrôle - Statistiques</h1>
        
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <StatCard label="Utilisateurs Inscrits" value={stats.total_users} />
            <StatCard label="Analyses Lancées" value={stats.analyses_launched} />
            <StatCard label="Feedbacks Reçus" value={stats.feedbacks_count} />
            <StatCard label="Revenus (Mois)" value={stats.revenue_month} unit=" €" />
            <StatCard label="Coût IA / User (Moy)" value={stats.avg_ai_cost_per_user} unit=" €" />
            <StatCard label="Cache Hit Ratio" value={stats.cache_hit_ratio} unit=" %" />
          </div>
        )}

        {formattedCacheHistory.length > 0 && (
          <div style={{ marginTop: '60px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h2 style={{ color: '#0F2650', marginBottom: '20px' }}>Historique du Cache (7 jours)</h2>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedCacheHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#446285" fontSize={12} />
                  <YAxis stroke="#446285" fontSize={12} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="hit_ratio" name="Hit Ratio" stroke="#6DBEF7" strokeWidth={2} activeDot={{ r: 6 }} unit="%" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {recentUsers.length > 0 && (
          <div style={{ marginTop: '60px' }}>
            <h2 style={{ color: '#0F2650', marginBottom: '20px' }}>Derniers Utilisateurs Inscrits</h2>
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#446285', fontWeight: '600', fontSize: '14px' }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#446285', fontWeight: '600', fontSize: '14px' }}>Nom</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#446285', fontWeight: '600', fontSize: '14px' }}>Date d'inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user, index) => (
                    <tr key={user.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', color: '#0F2650' }}>{user.email}</td>
                      <td style={{ padding: '12px 16px', color: '#446285' }}>{user.first_name} {user.last_name}</td>
                      <td style={{ padding: '12px 16px', color: '#446285', fontSize: '14px' }}>{new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
