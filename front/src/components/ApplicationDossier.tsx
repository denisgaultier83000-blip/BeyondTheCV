import { useState, useEffect } from 'react';
import { FileText, Printer, Trash2, Download, Eye, Briefcase, Calendar, CheckCircle2, ArrowLeft, Loader2, Building, Target, Mic, LineChart, MessageSquare, AlertTriangle, Zap, UserCheck, Monitor, HeartPulse } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { TrainingPlanTimeline } from './TrainingPlanTimeline';

interface ApplicationDossierProps {
  appId: string;
  onBack: () => void;
  onOpenDeliverable: (type: string, data: any) => void;
}

export function ApplicationDossier({ appId, onBack, onOpenDeliverable }: ApplicationDossierProps) {
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [deliverablesData, setDeliverablesData] = useState<any>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDossier = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/applications/${appId}/load`);
        if (!response.ok) throw new Error("Erreur lors du chargement du dossier");
        
        const json = await response.json();
        setAppData(json.application);
        setDeliverablesData(json.data);
      } catch (err) {
        console.error(err);
      setError("Impossible de charger le contenu de ce dossier.");
      } finally {
        setLoading(false);
      }
    };
    
    loadDossier();
  }, [appId, onBack]);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce dossier et toutes ses analyses ?")) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/applications/${appId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error("Échec de la suppression");
      onBack();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression de la candidature.");
      setIsDeleting(false);
    }
  };

  const handlePrintAll = () => {
    // Charge toutes les données dans le contexte global puis lance l'impression
    // Cette fonction appellera ton composant PrintableDossier.tsx existant
    onOpenDeliverable('print_all', deliverablesData);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 className="spin" size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <p>Ouverture du dossier sécurisé...</p>
      </div>
    );
  }

  if (error && !appData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
        <AlertTriangle size={48} color="var(--danger-text)" style={{ marginBottom: '1rem' }} />
        <p style={{ color: 'var(--danger-text)', marginBottom: '2rem', fontSize: '1.1rem' }}>{error}</p>
        <button onClick={onBack} className="btn-secondary">Retour à mes dossiers</button>
      </div>
    );
  }

  if (!appData) return null;

  // --- EXTRACTION DU CONTEXTE (META) ---

  // Mapping dynamique des livrables selon les JSON disponibles dans `deliverablesData`
  const availableDeliverables = [
    {
      id: 'company',
      title: 'Rapport Entreprise',
      icon: <Building size={20} />,
      data: deliverablesData.researchResult?.company_report,
      color: '#3b82f6'
    },
    {
      id: 'market',
      title: 'Rapport Marché & Salaires',
      icon: <LineChart size={20} />,
      data: deliverablesData.researchResult?.market_report,
      color: '#10b981'
    },
    {
      id: 'pitch',
      title: 'Pitch Personnel (3 min)',
      icon: <Mic size={20} />,
      data: deliverablesData.pitchResult,
      color: '#8b5cf6'
    },
    {
      id: 'questions',
      title: 'Questions d\'Entretien',
      icon: <MessageSquare size={20} />,
      data: deliverablesData.questionsResult,
      color: '#f59e0b'
    },
    {
      id: 'gap',
      title: 'Analyse d\'Adéquation (Gap)',
      icon: <Target size={20} />,
      data: deliverablesData.gapResult,
      color: '#ef4444'
    }
  ].filter(d => d.data); // On n'affiche que les livrables dont le JSON existe

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', animation: 'fadeIn 0.3s ease-out' }}>
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
      
      <button onClick={onBack} className="btn-ghost" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={18} /> Retour à mes dossiers
      </button>

    {error && (
      <div style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger-text)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
        <AlertTriangle size={18} /> {error}
      </div>
    )}

      {/* --- VUE SYNTHÈSE DU DOSSIER --- */}
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Briefcase size={28} color="var(--primary)" />
              <h1 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-main)' }}>{appData.target_company}</h1>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 500 }}>{appData.target_job}</h2>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 1rem', borderRadius: '2rem', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={16} /> Dossier Complet
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', justifyContent: 'flex-end' }}>
              <Calendar size={14} /> 
              Généré le {new Date(appData.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* --- ACTIONS GLOBALES --- */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <button onClick={handlePrintAll} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
          <Download size={20} /> Exporter le dossier complet (PDF)
        </button>
        <button onClick={() => window.print()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem' }}>
          <Printer size={20} /> Tout imprimer
        </button>
        <button onClick={handleDelete} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
          {isDeleting ? <Loader2 size={20} className="spin" /> : <Trash2 size={20} />}
          Supprimer
        </button>
      </div>

      {/* --- TIMELINE D'ENTRAÎNEMENT (Si disponible) --- */}
      {deliverablesData.actionPlanResult?.training_plan && (
        <div style={{ marginBottom: '3rem', animation: 'fadeIn 0.5s ease-out' }}>
          <TrainingPlanTimeline plan={deliverablesData.actionPlanResult.training_plan} />
        </div>
      )}

      {/* --- RESSOURCES ET RAPPORTS --- */}
      <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={20} /> Base de données de l'Entretien
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {availableDeliverables.map((item) => (
          <div key={item.id} style={{ 
            background: 'var(--bg-card)', 
            padding: '1.5rem', 
            borderRadius: '0.75rem', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: `${item.color}15`, color: item.color, padding: '0.75rem', borderRadius: '0.5rem' }}>
                {item.icon}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{item.title}</h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: Prêt • Format: HTML/PDF</span>
              </div>
            </div>
            
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => onOpenDeliverable(item.id, item.data)}
                className="btn-secondary" 
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              >
                <Eye size={16} /> Voir
              </button>
              <button 
                onClick={() => {
                  // Logique d'impression isolée : on charge le livrable en mode print
                  onOpenDeliverable(item.id, { ...item.data, autoPrint: true });
                }}
                className="btn-ghost" 
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Printer size={16} /> Imprimer
              </button>
            </div>
          </div>
        ))}

        {availableDeliverables.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Les livrables sont en cours de génération ou n'ont pas pu être chargés.</p>
          </div>
        )}
      </div>

    </div>
  );
}