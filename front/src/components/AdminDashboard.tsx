import React, { useState, useEffect } from 'react';
import AdminQuotaManager from './AdminQuotaManager';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Calendar, Edit, Trash2, Eye } from 'lucide-react';

// --- Types ---
interface Stats {
  total_users: number;
  premium_users: number;
  new_users_7d: number;
  total_tasks: number;
  avg_training_score: number;
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

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      // Remplacez 'token' par la clé exacte que vous utilisez dans le localStorage (ex: 'access_token')
      const token = localStorage.getItem('token'); 
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Chargement en parallèle des 3 endpoints vitaux
      const [statsRes, healthRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/health-check', { headers }),
        fetch('/api/admin/users?limit=20', { headers })
      ]);

      if (!statsRes.ok || !healthRes.ok || !usersRes.ok) {
        throw new Error("Erreur d'accès. Avez-vous bien les droits d'Administrateur ?");
      }

      setStats(await statsRes.json());
      
      const healthData = await healthRes.json();
      setHealth(healthData.services);
      
      const usersData = await usersRes.json();
      setUsers(usersData.users);

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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Utilisateurs Totaux</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats?.total_users}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#10b981' }}>+{stats?.new_users_7d} ces 7 derniers jours</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Comptes Premium</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats?.premium_users}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Générations IA (Tâches)</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{stats?.total_tasks}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Score Entraînement Moyen</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats?.avg_training_score} / 100</p>
        </div>
      </div>

      {/* --- SECTION 2 : HEALTH CHECK DES FOURNISSEURS --- */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0' }}>État des Services Tiers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {health && Object.entries(health).map(([service, status]) => {
            const isOk = status === 'ok';
            return (
              <div key={service} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', border: `1px solid ${isOk ? '#a7f3d0' : '#fecaca'}` }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isOk ? '#10b981' : '#ef4444' }}></div>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'capitalize' }}>{service}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SECTION 3 : GESTION MANUELLE DES QUOTAS --- */}
      <AdminQuotaManager />

      {/* --- SECTION 4 : GESTION DES UTILISATEURS --- */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0' }}>Derniers Inscrits</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Nom</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Inscription</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Premium</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Statut</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{user.email}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{user.first_name} {user.last_name}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{user.is_premium ? '⭐ Oui' : 'Non'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}><span style={{ padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', background: user.is_active ? '#d1fae5' : '#fee2e2', color: user.is_active ? '#065f46' : '#991b1b' }}>{user.is_active ? 'Actif' : 'Banni'}</span></td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => viewUserProfile(user.id)} title="Voir le profil" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', background: 'transparent', color: 'var(--text-main)' }}><Eye size={16} /></button>
                    <button onClick={() => setSubscriptionModalUser(user)} title="Gérer l'abonnement" style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', background: 'transparent', color: 'var(--primary)' }}><Calendar size={16} /></button>
                    <button onClick={() => toggleUserActive(user.id)} title={user.is_active ? 'Bannir' : 'Activer'} style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '0.25rem', cursor: 'pointer', background: 'transparent', color: user.is_active ? '#ef4444' : '#10b981' }}><Shield size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODALE DE GESTION D'ABONNEMENT --- */}
      {subscriptionModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '450px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>Gérer l'abonnement</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Utilisateur cible : <strong style={{ color: 'var(--text-main)' }}>{subscriptionModalUser.email}</strong>
            </p>
            
            <form onSubmit={handleManageSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Action souhaitée</label>
                <select value={subAction} onChange={e => setSubAction(e.target.value as 'extend' | 'cancel')} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}>
                  <option value="extend">Prolonger l'abonnement (Jours)</option>
                  <option value="cancel">Annuler immédiatement l'abonnement</option>
                </select>
              </div>

              {subAction === 'extend' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Nombre de jours à ajouter</label>
                  <input type="number" value={subDays} onChange={e => setSubDays(parseInt(e.target.value))} min="1" style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setSubscriptionModalUser(null)} className="btn-ghost" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>Annuler</button>
                <button type="submit" disabled={subLoading} className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none' }}>
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