import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Activity, BarChart3, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authenticatedFetch } from '../utils/auth'; // This is used
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

interface Feedback {
  id: number;
  feature: string;
  is_positive: boolean;
  comments: string | null;
  created_at: string;
  user_email?: string | null;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // --- GESTION DE LA SÉCURITÉ ---
  const [authPass, setAuthPass] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPass === 'beyond2026') {
      setIsAuthorized(true);
      setAuthError(null);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      setAuthError('Mot de passe incorrect');
    }
  };

  useEffect(() => {
    if (!isAuthorized) return; // On ne fetch pas si on n'a pas accès
    const fetchFeedbacks = async () => {
      try {
        // [FIX EXPERT] On s'affranchit de API_ROUTES pour garantir la bonne URL préfixée (/api/cv/)
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/feedbacks`);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erreur ${response.status} : ${errText}`);
        }
        const data = await response.json();
        // Si le backend renvoie un tableau plat, on l'utilise directement, sinon on cherche la clé 'feedbacks'
        setFeedbacks(Array.isArray(data) ? data : (data.feedbacks || []));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedbacks();
  }, [isAuthorized]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce feedback définitivement ?")) return;
    
    setDeletingId(id);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/feedbacks/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-main)' }}>Accès Restreint</h2>
        {authError && <div style={{ color: 'var(--danger-text)', marginBottom: '1rem', fontSize: '0.9rem' }}>{authError}</div>}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="password" 
            value={authPass} 
            onChange={(e) => setAuthPass(e.target.value)} 
            placeholder="Mot de passe administrateur" 
            style={{ padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }} 
          />
          <button type="submit" className="btn-primary" style={{ padding: '1rem', fontSize: '1rem' }}>Valider l'accès</button>
        </form>
        <button onClick={() => navigate('/candidate')} className="btn-ghost" style={{ marginTop: '1.5rem' }}>Retour à l'application</button>
      </div>
    );
  }

  if (loading || error) {
    return (
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '2rem' }}>
        <AsyncBoundary loading={loading} error={error || undefined} loadingText="Chargement des retours utilisateurs...">
          <></>
        </AsyncBoundary>
      </div>
    );
  }

  // Extraction des fonctionnalités uniques pour le filtre
  const uniqueFeatures = Array.from(new Set(feedbacks.map(f => f.feature)));

  // Application du filtre
  const filteredFeedbacks = selectedFeature === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.feature === selectedFeature);

  // Calcul des statistiques
  const totalVotes = filteredFeedbacks.length;
  const positiveVotes = filteredFeedbacks.filter(f => f.is_positive).length;
  const approvalRate = totalVotes > 0 ? Math.round((positiveVotes / totalVotes) * 100) : 0;
  const withComments = filteredFeedbacks.filter(f => f.comments && f.comments.trim().length > 0).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      {/* Bouton retour global */}
      <button 
        onClick={() => navigate('/candidate')} 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '2rem', fontWeight: 500, transition: 'all 0.2s' }}
      >
        <ArrowLeft size={16} /> Retour à l'application
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', margin: 0 }}>
          <BarChart3 size={28} color="var(--primary)" />
          Dashboard des Retours Utilisateurs
        </h2>
        
        {/* Filtre par fonctionnalité */}
        <select 
          value={selectedFeature} 
          onChange={(e) => setSelectedFeature(e.target.value)} 
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: 500, minWidth: '200px', outline: 'none' }}
        >
          <option value="all">Toutes les fonctionnalités</option>
          {uniqueFeatures.map(feat => <option key={feat} value={feat}>{feat}</option>)}
        </select>
      </div>

      {/* Panneau de statistiques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}><Activity size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total des Votes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalVotes}</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', color: '#10b981' }}><ThumbsUp size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Taux de satisfaction</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{approvalRate}%</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%', color: '#f59e0b' }}><MessageSquare size={24} /></div>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Commentaires laissés</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{withComments}</div>
          </div>
        </div>
      </div>

      {/* Tableau des Feedbacks */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Utilisateur</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fonctionnalité</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vote</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Commentaire</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun feedback trouvé pour cette sélection.</td></tr>
            ) : (
              filteredFeedbacks.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{new Date(f.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{f.user_email || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Anonyme</span>}</td>
                  <td style={{ padding: '1rem' }}><span style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--primary)' }}>{f.feature}</span></td>
                  <td style={{ padding: '1rem' }}>
                    {f.is_positive 
                      ? <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><ThumbsUp size={16} /> Positif</span>
                      : <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><ThumbsDown size={16} /> Négatif</span>
                    }
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>{f.comments || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Aucun commentaire</span>}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(f.id)} 
                      disabled={deletingId === f.id}
                      style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: deletingId === f.id ? 'wait' : 'pointer', color: 'var(--danger-text)', transition: 'all 0.2s' }} 
                      title="Supprimer ce retour"
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-body)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      {deletingId === f.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}