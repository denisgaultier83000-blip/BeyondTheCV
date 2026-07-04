import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertTriangle, Briefcase, Calendar, User, Clock } from 'lucide-react';
import { DebriefModal } from './DebriefModal';
import { useDashboard } from './DashboardContext';

interface DebriefSummary {
  id: string;
  company_name: string;
  job_title: string;
  interview_date: string;
  interlocutor_name: string;
  interlocutor_role: string;
}

const DebriefTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [history, setHistory] = useState<DebriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cvData } = useDashboard();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: Endpoint à créer : GET /api/debriefs
      // Simule un appel réseau
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData: DebriefSummary[] = [
        { id: '1', company_name: 'Google', job_title: 'Software Engineer', interview_date: '2026-06-15', interlocutor_name: 'Jane Doe', interlocutor_role: 'Engineering Manager' },
        { id: '2', company_name: 'Meta', job_title: 'Product Manager', interview_date: '2026-05-28', interlocutor_name: 'John Smith', interlocutor_role: 'Product Lead' },
      ];
      setHistory(mockData);
    } catch (err: any) {
      setError("Impossible de charger l'historique des débriefs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    fetchHistory(); // Rafraîchit l'historique après la fermeture de la modale
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {isModalOpen && <DebriefModal onClose={handleCloseModal} cvData={cvData} />}

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Débrief & Suivi</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Transformez chaque entretien en avantage stratégique pour le suivant.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Créer un nouveau débrief
        </button>
      </div>

      {/* Timeline / Historique */}
      <div className="bento-card" style={{ background: 'var(--bg-card)' }}>
        <h2 className="bento-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Clock size={20} color="var(--primary)" /> Historique des Entretiens</h2>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}><Loader2 size={32} className="spin" /></div>
        ) : error ? (
          <div style={{ color: 'var(--danger-text)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {error}</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
            <p>Aucun débrief enregistré pour le moment.</p>
            <p>Cliquez sur "Créer un nouveau débrief" pour commencer.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map(debrief => (
              <div key={debrief.id} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', cursor: 'pointer' /* TODO: Ouvrir DebriefDetail */ }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} /> {debrief.company_name}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={14} /> {new Date(debrief.interview_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>{debrief.job_title}</p>
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={16} /> Interlocuteur : <strong style={{ color: 'var(--text-main)' }}>{debrief.interlocutor_name}</strong> ({debrief.interlocutor_role})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebriefTab;