import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { Zap, RefreshCw, Eye } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Generation {
  id: string;
  user_email: string;
  module: string;
  status: string;
  created_at: string;
  result: string | null;
  model_used: string | null;
  prompt_version: string | null;
  estimated_cost: number | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: { 
    input_tokens?: number;
    output_tokens?: number;
    [key: string]: any 
  } | null;
}

const AdminGenerations: React.FC = () => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'graph'>('table');
  const [graphGenerations, setGraphGenerations] = useState<Generation[]>([]);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const response = await authenticatedFetch(`${API_URL}/admin/generations?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error("Impossible de charger l'historique des générations.");
      }
      const data = await response.json();
      setGenerations(data.generations);
      setTotal(data.total);

      const graphLimit = Math.max(data.total || 0, 1);
      const graphResponse = await authenticatedFetch(`${API_URL}/admin/generations?limit=${graphLimit}&offset=0`);
      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        setGraphGenerations(graphData.generations || []);
      } else {
        setGraphGenerations(data.generations || []);
      }
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
      const response = await authenticatedFetch(`${API_URL}/admin/generations/${generationId}/rerun`, {
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
  const cumulativeGraphData = [...graphGenerations]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .reduce((acc: Array<{ name: string; cost: number; cumulative: number }>, gen) => {
      const cost = Number(gen.estimated_cost || 0);
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({
        name: new Date(gen.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        cost,
        cumulative: Number((prev + cost).toFixed(6)),
      });
      return acc;
    }, []);

  const moduleCostData = Object.values(
    graphGenerations.reduce((acc: Record<string, { module: string; totalCost: number }>, gen) => {
      const moduleName = gen.module || 'unknown';
      const cost = Number(gen.estimated_cost || 0);
      if (!acc[moduleName]) acc[moduleName] = { module: moduleName, totalCost: 0 };
      acc[moduleName].totalCost += cost;
      return acc;
    }, {})
  );

  const totalGlobalCost = cumulativeGraphData.length > 0
    ? cumulativeGraphData[cumulativeGraphData.length - 1].cumulative
    : 0;

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
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tabButton, ...(activeTab === 'table' ? styles.tabButtonActive : {}) }}
              onClick={() => setActiveTab('table')}
            >
              Tableau
            </button>
            <button
              style={{ ...styles.tabButton, ...(activeTab === 'graph' ? styles.tabButtonActive : {}) }}
              onClick={() => setActiveTab('graph')}
            >
              Graphe des coûts
            </button>
          </div>

          {activeTab === 'table' && (
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
                        <td style={styles.td}>{gen.module}</td>
                        <td style={styles.td}><span style={{...styles.badge, ...styles.badgeColors[gen.status]}}>{gen.status}</span></td>
                        <td style={styles.td}>{Number(gen.estimated_cost || 0).toFixed(4)} €</td>
                        <td style={styles.td}>{gen.duration_ms ? (gen.duration_ms / 1000).toFixed(2) : '-'} s</td>
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

          {activeTab === 'graph' && (
            <div>
              <div style={styles.summaryCard}>
                <strong>Dépense globale estimée :</strong> {totalGlobalCost.toFixed(4)} €
              </div>

              <div style={styles.chartCard}>
                <h4 style={styles.chartTitle}>Évolution des coûts et cumul</h4>
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={cumulativeGraphData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `${Number(value).toFixed(4)} €`} />
                      <Line type="monotone" dataKey="cost" stroke="#3b82f6" name="Coût par génération" dot={false} />
                      <Line type="monotone" dataKey="cumulative" stroke="#ef4444" name="Coût cumulé" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.chartCard}>
                <h4 style={styles.chartTitle}>Répartition des coûts par module</h4>
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={moduleCostData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="module" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `${Number(value).toFixed(4)} €`} />
                      <Bar dataKey="totalCost" fill="#14b8a6" name="Coût total module" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {selectedGeneration && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedGeneration(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Détails de la Génération</h3>
            <div style={styles.detailsGrid}>
              <DetailItem label="ID Tâche" value={selectedGeneration.id} />
              <DetailItem label="Utilisateur" value={selectedGeneration.user_email} />
              <DetailItem label="Type de tâche" value={selectedGeneration.module} />
              <DetailItem label="Modèle IA" value={selectedGeneration.model_used} />
              <DetailItem label="Version Prompt" value={selectedGeneration.prompt_version} />
              <DetailItem label="Statut" value={<span style={{...styles.badge, ...styles.badgeColors[selectedGeneration.status]}}>{selectedGeneration.status}</span>} />
              <DetailItem label="Coût Estimé" value={`${selectedGeneration.estimated_cost?.toFixed(4)} €`} />
              <DetailItem label="Durée" value={`${selectedGeneration.duration_ms ? (selectedGeneration.duration_ms / 1000).toFixed(2) : '-'} s`} />
              <DetailItem label="Tokens Input/Output" value={`${selectedGeneration.metadata?.input_tokens || '-'} / ${selectedGeneration.metadata?.output_tokens || '-'}`} />
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
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  tabButton: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    padding: '0.45rem 0.8rem',
    borderRadius: '0.4rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabButtonActive: {
    background: '#0f172a',
    color: '#fff',
    borderColor: '#0f172a',
  },
  summaryCard: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e3a8a',
    padding: '0.8rem 1rem',
    borderRadius: '0.4rem',
    marginBottom: '1rem',
  },
  chartCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '1rem',
  },
  chartTitle: {
    marginTop: 0,
    marginBottom: '0.75rem',
    color: '#1e293b',
  },
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