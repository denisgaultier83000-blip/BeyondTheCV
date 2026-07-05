import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { Zap, RefreshCw, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Generation {
  id: string;
  user_email: string;
  task_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  result: string | null;
  ai_model: string;
  prompt_version: string;
  estimated_cost: number;
  input_tokens: number;
  output_tokens: number;
  duration: number; // in seconds
  related_folder_id: string;
  error_message: string | null;
  retry_count: number;
  trigger_source: 'user' | 'admin' | 'auto_retry';
}

const AdminGenerations: React.FC = () => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const response = await authenticatedFetch(`${API_URL}/api/admin/generations?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error("Impossible de charger l'historique des générations.");
      }
      const data = await response.json();
      setGenerations(data.generations);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const handleRelaunch = async (generationId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir relancer cette génération ?")) return;
    try {
      const response = await authenticatedFetch(`${API_URL}/api/admin/generations/${generationId}/rerun`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Échec de la relance.');
      }
      alert('Génération relancée avec succès !');
      fetchGenerations();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Zap size={32} />
        <h2 style={styles.headerTitle}>Historique des Générations IA</h2>
      </div>

      {loading && <p>Chargement de l'historique...</p>}
      {error && <p style={{ color: 'red' }}>Erreur: {error}</p>}

      {!loading && !error && (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID Tâche</th>
                  <th style={styles.th}>Utilisateur</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Coût</th>
                  <th style={styles.th}>Durée</th>
                  <th style={styles.th}>Créé le</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generations.map(gen => (
                  <tr key={gen.id}>
                    <td style={styles.td}>{gen.id.substring(0, 8)}...</td>
                    <td style={styles.td}>{gen.user_email}</td>
                    <td style={styles.td}>{gen.task_type}</td>
                    <td style={styles.td}><span style={{...styles.badge, ...styles.badgeColors[gen.status]}}>{gen.status}</span></td>
                    <td style={styles.td}>{gen.estimated_cost?.toFixed(4)} €</td>
                    <td style={styles.td}>{gen.duration?.toFixed(2)} s</td>
                    <td style={styles.td}>{new Date(gen.created_at).toLocaleString()}</td>
                    <td style={styles.td}>
                      <button onClick={() => setSelectedGeneration(gen)} style={styles.actionButton}><Eye size={14} /> Détails</button>
                      <button onClick={() => handleRelaunch(gen.id)} style={{...styles.actionButton, background: '#eef2ff', color: '#4f46e5'}}><RefreshCw size={14} /> Relancer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Précédent</button>
            <span>Page {page} sur {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suivant</button>
          </div>
        </>
      )}

      {selectedGeneration && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedGeneration(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Détails de la Génération</h3>
            <div style={styles.detailsGrid}>
              <DetailItem label="ID Tâche" value={selectedGeneration.id} />
              <DetailItem label="Utilisateur" value={selectedGeneration.user_email} />
              <DetailItem label="Dossier Lié" value={selectedGeneration.related_folder_id} />
              <DetailItem label="Type de tâche" value={selectedGeneration.task_type} />
              <DetailItem label="Modèle IA" value={selectedGeneration.ai_model} />
              <DetailItem label="Version Prompt" value={selectedGeneration.prompt_version} />
              <DetailItem label="Source" value={selectedGeneration.trigger_source} />
              <DetailItem label="Tentatives" value={selectedGeneration.retry_count} />
              <DetailItem label="Statut" value={<span style={{...styles.badge, ...styles.badgeColors[selectedGeneration.status]}}>{selectedGeneration.status}</span>} />
              <DetailItem label="Coût Estimé" value={`${selectedGeneration.estimated_cost?.toFixed(4)} €`} />
              <DetailItem label="Durée" value={`${selectedGeneration.duration?.toFixed(2)} s`} />
              <DetailItem label="Tokens Input/Output" value={`${selectedGeneration.input_tokens} / ${selectedGeneration.output_tokens}`} />
            </div>
            {selectedGeneration.error_message && (
              <div style={styles.errorBox}>
                  <h4>Message d'erreur</h4>
                  <pre style={styles.pre}>{selectedGeneration.error_message}</pre>
              </div>
            )}
            <h4>Résultat brut (JSON)</h4>
            <pre style={styles.pre}>{JSON.stringify(JSON.parse(selectedGeneration.result || '{}'), null, 2)}</pre>
            <button onClick={() => setSelectedGeneration(null)} style={{marginTop: '1rem'}}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div style={styles.detailItem}>
    <strong style={styles.detailLabel}>{label}</strong>
    <div>{value}</div>
  </div>
);

const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '2rem', fontFamily: 'sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  headerTitle: { margin: 0, fontSize: '1.8rem', color: '#1e293b' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.8rem',
    color: '#475569',
    textTransform: 'uppercase',
  },
  td: {
    borderBottom: '1px solid #f1f5f9',
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '0.25rem',
  },
  badgeColors: {
    PENDING: { background: '#fefce8', color: '#a16207' },
    RUNNING: { background: '#e0f2fe', color: '#0284c7' },
    SUCCESS: { background: '#dcfce7', color: '#166534' },
    COMPLETED: { background: '#dcfce7', color: '#166534' },
    FAILED: { background: '#fee2e2', color: '#991b1b' },
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    border: '1px solid #e2e8f0',
    background: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  pre: {
    margin: 0,
    fontSize: '0.8rem',
    background: '#f1f5f9',
    padding: '1rem',
    borderRadius: '0.25rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    width: '80%',
    maxWidth: '800px',
  },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  detailItem: { background: '#f8fafc', padding: '0.75rem', borderRadius: '0.25rem' },
  detailLabel: { display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' },
  errorBox: { background: '#fff1f2', color: '#be123c', padding: '1rem', borderRadius: '0.25rem', margin: '1.5rem 0' },
};

export default AdminGenerations;