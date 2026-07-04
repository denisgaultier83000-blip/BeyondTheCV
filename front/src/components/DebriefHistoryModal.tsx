import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, ArrowLeft, Briefcase, Calendar } from 'lucide-react';
import { DebriefDetail } from './DebriefDetail'; // Assurez-vous que ce composant existe

interface DebriefHistoryModalProps {
  onClose: () => void;
}

interface DebriefSummary {
  id: string;
  company_name: string;
  job_title: string;
  interview_date: string;
  interlocutor_type: string;
}

export function DebriefHistoryModal({ onClose }: DebriefHistoryModalProps) {
  const [history, setHistory] = useState<DebriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDebriefId, setSelectedDebriefId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        // NOTE: Cet endpoint est à créer côté backend: GET /api/debriefs
        // const response = await authenticatedFetch(`${API_BASE_URL}/api/debriefs`);
        // if (!response.ok) throw new Error("Impossible de charger l'historique.");
        // const data = await response.json();
        
        // --- Données de simulation en attendant le backend ---
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockData: DebriefSummary[] = [
          { id: '1', company_name: 'Google', job_title: 'Software Engineer', interview_date: '2026-06-15', interlocutor_type: 'tech' },
          { id: '2', company_name: 'Meta', job_title: 'Product Manager', interview_date: '2026-05-28', interlocutor_type: 'manager' },
          { id: '3', company_name: 'LVMH', job_title: 'Data Analyst', interview_date: '2026-05-10', interlocutor_type: 'rh' },
        ];
        setHistory(mockData);
        // --- Fin des données de simulation ---

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (selectedDebriefId) {
    return <DebriefDetail debriefId={selectedDebriefId} onBack={() => setSelectedDebriefId(null)} />;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1.25rem', width: '90%', maxWidth: '700px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
          Historique des Débriefs
        </h2>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}><Loader2 size={32} className="spin" /></div>
          ) : error ? (
            <div style={{ color: 'var(--danger-text)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {error}</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Aucun débrief enregistré pour le moment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map(debrief => (
                <div key={debrief.id} onClick={() => setSelectedDebriefId(debrief.id)} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} /> {debrief.company_name}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {new Date(debrief.interview_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{debrief.job_title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}