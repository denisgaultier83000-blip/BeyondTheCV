import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertTriangle, Briefcase, Calendar, User, Clock, ArrowRight, Zap, UserCheck, UserCog, Award, Edit, History } from 'lucide-react';
import { DebriefModal } from './DebriefModal';
import { useDashboard } from '../hooks/DashboardContext';
import { DebriefDetail } from './DebriefDetail';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';

interface DebriefSummary {
  id: string;
  company_name: string;
  job_title: string;
  interview_date: string;
  interlocutor_name?: string;
  interlocutor_role?: string; // [FIX] Ajout du rôle pour affichage
  interlocutor_type?: 'rh' | 'manager' | 'tech' | 'final' | string;
}

const DebriefTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDebriefId, setSelectedDebriefId] = useState<string | null>(null);
  const [editingDebriefId, setEditingDebriefId] = useState<string | null>(null);
  const [analyzeOnOpen, setAnalyzeOnOpen] = useState(false); // État pour déclencher l'analyse à l'ouverture
  const [history, setHistory] = useState<DebriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cvData } = useDashboard();

  const fetchHistory = useCallback(async () => {
    setError(null);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/debriefs`);
      if (!response.ok) throw new Error("Impossible de charger l'historique des débriefs.");
      const data = await response.json();
      setHistory(data.debriefs || []);
    } catch (err: any) {
      setError("Impossible de charger l'historique des débriefs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDebriefId(null);
    setAnalyzeOnOpen(false); // Réinitialiser l'état d'analyse
    setLoading(true);
    fetchHistory(); // Rafraîchit l'historique après la fermeture de la modale
  };

  if (selectedDebriefId) {
    return <DebriefDetail 
      debriefId={selectedDebriefId} 
      onBack={() => { setSelectedDebriefId(null); setAnalyzeOnOpen(false); }} // Assure la réinitialisation au retour
      autoAnalyze={analyzeOnOpen}
    />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {(isModalOpen || editingDebriefId) && <DebriefModal onClose={handleCloseModal} cvData={cvData} debriefIdToEdit={editingDebriefId} />}

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>Débrief & Préparation Stratégique</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Transformez chaque entretien en avantage stratégique pour le suivant.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingDebriefId(null); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Enregistrer un Entretien
        </button>
      </div>

      {/* Timeline / Historique */}
      <div className="bento-card" style={{ background: 'var(--bg-card)' }}>
        <h2 className="bento-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><History size={20} color="var(--primary)" /> Timeline du Processus</h2>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}><Loader2 size={32} className="spin" /></div>
        ) : error ? (
          <div style={{ color: 'var(--danger-text)', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {error}</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
            <p>Aucun entretien enregistré pour le moment.</p>
            <p>Cliquez sur "Enregistrer un Entretien" pour commencer votre suivi.</p>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '2rem' }}>
            <div style={{ position: 'absolute', left: '20px', top: '5px', bottom: '5px', width: '2px', background: 'var(--border-color)' }}></div>
            {history.map((debrief, index) => {
              const iconMap = { rh: UserCheck, manager: UserCog, final: Award, tech: UserCog };
              const Icon = iconMap[debrief.interlocutor_type as keyof typeof iconMap] || Briefcase;

              return (
                <div key={debrief.id} style={{ position: 'relative', marginBottom: '2rem', paddingLeft: '2.5rem' }}>
                  <div style={{ position: 'absolute', left: '-9px', top: '5px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={12} color="var(--primary)" />
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{debrief.company_name}</h3>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border-color)' }}>
                            {new Date(debrief.interview_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>{debrief.job_title}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setEditingDebriefId(debrief.id)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Edit size={16} /> Modifier
                        </button>
                        <button onClick={() => { setAnalyzeOnOpen(false); setSelectedDebriefId(debrief.id); }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ArrowRight size={16} /> Voir le Débrief
                        </button>
                        <button 
                          onClick={() => { setAnalyzeOnOpen(true); setSelectedDebriefId(debrief.id); }} 
                          className="btn-primary" 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)' }}
                        >
                          <Zap size={16} /> Préparer la suite
                        </button>
                      </div>
                    </div>
                    {debrief.interlocutor_name && (
                      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} /> Interlocuteur : <strong style={{ color: 'var(--text-main)' }}>{debrief.interlocutor_name}</strong> ({debrief.interlocutor_role})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebriefTab;