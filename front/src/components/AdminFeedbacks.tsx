import React, { useEffect, useState, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Activity, BarChart3, Archive, Loader2, Filter } from 'lucide-react';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { AsyncBoundary } from './AsyncBoundary';

interface Feedback {
  id: number;
  feature: string;
  is_positive: boolean;
  comments: string | null;
  created_at: string;
  user_email?: string | null;
  status: 'new' | 'read' | 'processing' | 'resolved' | 'archived';
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [archivingId, setArchivingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/feedbacks`);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erreur ${response.status} : ${errText}`);
        }
        const data = await response.json();
        setFeedbacks(Array.isArray(data) ? data : (data.feedbacks || []));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  const handleArchive = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir archiver ce feedback ?")) return;

    setArchivingId(id);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/feedbacks/${id}/archive`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error("Erreur lors de l'archivage");
      }
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: 'archived' } : f));
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'archivage");
    } finally {
      setArchivingId(null);
    }
  };

  const uniqueFeatures = useMemo(() => Array.from(new Set(feedbacks.map(f => f.feature))), [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
        const featureMatch = filterFeature === 'all' || f.feature === filterFeature;
        const statusMatch = filterStatus === 'all' || f.status === filterStatus;
        return featureMatch && statusMatch;
    });
  }, [feedbacks, filterFeature, filterStatus]);

  const stats = useMemo(() => {
    const totalVotes = filteredFeedbacks.length;
    const positiveVotes = filteredFeedbacks.filter(f => f.is_positive).length;
    const approvalRate = totalVotes > 0 ? Math.round((positiveVotes / totalVotes) * 100) : 0;
    const withComments = filteredFeedbacks.filter(f => f.comments && f.comments.trim().length > 0).length;
    return { totalVotes, approvalRate, withComments };
  }, [filteredFeedbacks]);

  const getStatusBadge = (status: Feedback['status']) => {
    const styles = {
        new: "bg-blue-100 text-blue-800",
        read: "bg-gray-100 text-gray-800",
        processing: "bg-yellow-100 text-yellow-800",
        resolved: "bg-green-100 text-green-800",
        archived: "bg-purple-100 text-purple-800",
    };
    const text = {
        new: "Nouveau",
        read: "Lu",
        processing: "À traiter",
        resolved: "Résolu",
        archived: "Archivé",
    };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{text[status]}</span>;
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', margin: 0 }}>
          <BarChart3 size={28} color="var(--primary)" />
          Dashboard des Retours Utilisateurs
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="admin-card items-center"><Activity className="text-blue-500"/><div><p>Total des Votes</p><p className="stat-value">{stats.totalVotes}</p></div></div>
        <div className="admin-card items-center"><ThumbsUp className="text-green-500"/><div><p>Taux de satisfaction</p><p className="stat-value text-green-600">{stats.approvalRate}%</p></div></div>
        <div className="admin-card items-center"><MessageSquare className="text-yellow-500"/><div><p>Commentaires laissés</p><p className="stat-value text-yellow-600">{stats.withComments}</p></div></div>
      </div>

      <div className="admin-card mb-6 flex items-center gap-4">
        <Filter size={18} className="text-gray-400" />
        <select value={filterFeature} onChange={(e) => setFilterFeature(e.target.value)} className="admin-select">
          <option value="all">Toutes les fonctionnalités</option>
          {uniqueFeatures.map(feat => <option key={feat} value={feat}>{feat}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="admin-select">
          <option value="all">Tous les statuts</option>
          <option value="new">Nouveau</option>
          <option value="read">Lu</option>
          <option value="processing">À traiter</option>
          <option value="resolved">Résolu</option>
          <option value="archived">Archivé</option>
        </select>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Fonctionnalité</th>
              <th>Vote</th>
              <th>Commentaire</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-gray-500">Aucun feedback trouvé pour cette sélection.</td></tr>
            ) : (
              filteredFeedbacks.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{f.user_email || <span className="italic opacity-50">Anonyme</span>}</td>
                  <td><span className="badge-purple">{f.feature}</span></td>
                  <td>
                    {f.is_positive 
                      ? <span className="text-green-600 flex items-center gap-2"><ThumbsUp size={16} /> Positif</span>
                      : <span className="text-red-600 flex items-center gap-2"><ThumbsDown size={16} /> Négatif</span>
                    }
                  </td>
                  <td className="max-w-xs truncate">{f.comments || <span className="italic opacity-50">Aucun</span>}</td>
                  <td>{getStatusBadge(f.status)}</td>
                  <td className="text-right">
                    <button onClick={() => handleArchive(f.id)} disabled={archivingId === f.id} className="admin-action-button" title="Archiver ce retour">
                      {archivingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
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