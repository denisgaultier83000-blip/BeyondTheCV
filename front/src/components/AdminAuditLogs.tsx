import React, { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/auth';
import { LucideBookUser } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AuditLog {
  id: number;
  timestamp: string;
  admin_user_email: string;
  action: string;
  target_user_email: string;
  details: any;
  ip_address: string;
}

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const response = await authenticatedFetch(`${API_URL}/api/admin/audit-logs?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error("Impossible de charger les logs d'audit.");
      }
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <LucideBookUser size={32} />
        <h2 style={styles.headerTitle}>Journal d'Audit Administrateur</h2>
      </div>
      
      {loading && <p>Chargement des logs...</p>}
      {error && <p style={{ color: 'red' }}>Erreur: {error}</p>}
      
      {!loading && !error && (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Admin</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Cible</th>
                  <th style={styles.th}>Détails</th>
                  <th style={styles.th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={styles.td}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={styles.td}>{log.admin_user_email}</td>
                    <td style={styles.td}><span style={styles.badge}>{log.action}</span></td>
                    <td style={styles.td}>{log.target_user_email}</td>
                    <td style={styles.td}><pre style={styles.pre}>{JSON.stringify(log.details, null, 2)}</pre></td>
                    <td style={styles.td}>{log.ip_address}</td>
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
    </div>
  );
};

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
    verticalAlign: 'top',
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: '0.25rem',
    background: '#eef2ff',
    color: '#4338ca',
  },
  pre: {
    margin: 0,
    fontSize: '0.8rem',
    background: '#f1f5f9',
    padding: '0.5rem',
    borderRadius: '0.25rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1.5rem',
  },
};

export default AdminAuditLogs;
