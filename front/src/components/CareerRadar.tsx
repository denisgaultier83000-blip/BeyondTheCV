import React from 'react';
import { Map, Clock, AlertCircle, Loader2, Target, Lightbulb, Wallet, ChevronRight } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

interface Trajectory {
  title: string;
  match_percent: number;
  salary_potential: string;
  time_to_reach: string;
  rationale: string;
  gap: string;
}

interface CareerRadarProps {
  data?: {
    trajectories: Trajectory[];
  };
  loading?: boolean;
  error?: boolean;
}

// Helper pour parser le gras Markdown fourni par l'IA (**texte**)
const formatMarkdown = (text: string) => {
  if (!text) return text;
  return text.split('**').map((part, i) => 
    i % 2 === 1 ? <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part}</strong> : part
  );
};

// Helper pour la couleur dynamique du score
const getScoreColor = (percent: number) => {
  if (percent >= 80) return { text: '#059669', bg: '#d1fae5', border: '#34d399' }; // Émeraude (Fort)
  if (percent >= 60) return { text: '#d97706', bg: '#fef3c7', border: '#fbbf24' }; // Ambre (Moyen)
  return { text: '#e11d48', bg: '#ffe4e6', border: '#fb7185' }; // Rose (Faible)
};

export const CareerRadar: React.FC<CareerRadarProps> = ({ data, loading, error }) => {
  if (error) {
    return (
      <div className="error-box" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        <AlertCircle size={24} />
        <span>Une erreur est survenue lors de la génération du Radar de Carrière. Veuillez réessayer.</span>
      </div>
    );
  }

  if (loading || !data || !data.trajectories || data.trajectories.length === 0) return null;

  return (
    <>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Découvrez des trajectoires de carrière alternatives et des opportunités de pivot inattendues.
      </p>
      <div className="radar-grid">
        {data.trajectories.map((traj, idx) => {
          const colors = getScoreColor(traj.match_percent);
          
          return (
            <div key={idx} className="radar-card">
              {/* EN-TÊTE : Titre et Pourcentage */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', lineHeight: 1.3, fontWeight: 700 }}>
                  {traj.title}
                </h4>
                <div style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, padding: '0.35rem 0.75rem', borderRadius: '2rem', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {traj.match_percent}%
                </div>
              </div>

              {/* SALAIRE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <Wallet size={16} color="var(--text-muted)" /> Potentiel : <strong style={{ color: 'var(--text-main)' }}>{traj.salary_potential}</strong>
              </div>

              {/* LIGNE TEMPORELLE (TIMELINE) */}
              <div style={{ margin: '1.5rem 0', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ fontWeight: 700 }}>Actuel</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Cible</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border-color)', border: '2px solid var(--bg-card)', zIndex: 2 }}></div>
                  <div style={{ flex: 1, height: '2px', background: 'var(--border-color)', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ background: 'var(--bg-card)', padding: '0 10px', fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <Clock size={12} /> {traj.time_to_reach}
                    </span>
                  </div>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-card)', zIndex: 2 }}></div>
                </div>
              </div>

              {/* RATIONALE & GAP (Grid 2 cols) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* RATIONALE (Carré Vert) */}
                <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '0.75rem', padding: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                  <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}><Lightbulb size={16} /> Pourquoi ce choix ?</h5>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{formatMarkdown(traj.rationale)}</p>
                </div>

                {/* GAP (Carré Rosé) */}
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.75rem', padding: '1rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)' }}>
                  <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)', margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}><Target size={16} /> Ce qu'il manque</h5>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{formatMarkdown(traj.gap)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .radar-grid { display: flex; flex-direction: column; gap: 1.5rem; }
        .radar-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .radar-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); border-color: rgba(59, 130, 246, 0.4); }
      `}</style>
    </>
  );
};