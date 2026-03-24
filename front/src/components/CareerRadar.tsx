import React from 'react';
import { Compass, Clock, Euro, AlertTriangle } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { DashboardCard } from './DashboardCard';

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
    trajectories?: Trajectory[];
  };
  loading?: boolean;
  error?: boolean;
}

export const CareerRadar: React.FC<CareerRadarProps> = ({ data, loading, error }) => {
  const trajectories = data?.trajectories;

  return (
    <DashboardCard
      title="Career Radar : Pistes & Pivots"
      icon={<Compass size={24} />}
      loading={loading}
      loadingText="Génération des trajectoires de carrière..."
      error={error || (!loading && (!trajectories || trajectories.length === 0))}
      errorText="Impossible de générer les trajectoires."
      featureId="career_radar"
      style={{ gridColumn: '1 / -1' }}
    >
      {trajectories && trajectories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {trajectories.map((traj, idx) => (
          <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            
            {/* En-tête avec Jauge Visuelle */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{traj.title}</h4>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: traj.match_percent >= 80 ? '#10b981' : traj.match_percent >= 60 ? '#f59e0b' : '#ef4444' }}>
                  {traj.match_percent}% Match
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${traj.match_percent}%`, height: '100%', 
                  background: traj.match_percent >= 80 ? '#10b981' : traj.match_percent >= 60 ? '#f59e0b' : '#ef4444',
                  transition: 'width 1s ease-out'
                }}></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Euro size={14} /> {traj.salary_potential}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {traj.time_to_reach}</span>
            </div>

            <div style={{ marginBottom: '1rem', flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>💡 La tactique</strong>
              <div 
                style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}
                dangerouslySetInnerHTML={formatMarkdown(traj.rationale)}
              />
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--danger-text)' }}><AlertTriangle size={14} /> Ce qu'il vous manque</strong>
              <div 
                style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }} 
                dangerouslySetInnerHTML={formatMarkdown(traj.gap)}
              />
            </div>
          </div>
        ))}
      </div>
      )}
    </DashboardCard>
  );
};