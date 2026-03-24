import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Activity, BarChart3, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';

interface Feedback {
  id: number;
  feature: string;
  is_positive: boolean;
  comments: string | null;
  created_at: string;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cv/feedbacks`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des feedbacks");
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedbacks();
  }, []);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement des données...</div>;
  }

  if (error) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>{error}</div>;
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
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fonctionnalité</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Vote</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun feedback trouvé pour cette sélection.</td></tr>
            ) : (
              filteredFeedbacks.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{new Date(f.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ padding: '1rem' }}><span style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--primary)' }}>{f.feature}</span></td>
                  <td style={{ padding: '1rem' }}>
                    {f.is_positive 
                      ? <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><ThumbsUp size={16} /> Positif</span>
                      : <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><ThumbsDown size={16} /> Négatif</span>
                    }
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>{f.comments || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Aucun commentaire</span>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}