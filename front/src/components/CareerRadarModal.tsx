import React from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, Clock, Euro, AlertTriangle } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { FeedbackWidget } from './FeedbackWidget';

interface Trajectory {
  title: string;
  match_percent: number;
  salary_potential: string;
  time_to_reach: string;
  rationale: string;
  gap: string;
}

interface CareerRadarModalProps {
  data: any;
  onClose: () => void;
}

export default function CareerRadarModal({ data, onClose }: CareerRadarModalProps) {
  if (!data) return null;
  const { t } = useTranslation();

  // Résolution robuste des données (Support de l'encapsulation IA)
  const radarData = data.career_radar_result || data;
  const trajectories: Trajectory[] = radarData.trajectories || [];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '90%', maxWidth: '850px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >✕</button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
          <Compass size={32} color="var(--primary)" /> Career Radar
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          Découvrez des trajectoires de carrière alternatives et des opportunités de pivot inattendues.
        </p>

        {trajectories.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {trajectories.map((traj, idx) => (
              <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{traj.title}</h4>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: traj.match_percent >= 80 ? '#10b981' : traj.match_percent >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {traj.match_percent}% Match
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${traj.match_percent}%`, height: '100%', background: traj.match_percent >= 80 ? '#10b981' : traj.match_percent >= 60 ? '#f59e0b' : '#ef4444', transition: 'width 1s ease-out' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border-color)' }}><Euro size={16} color="var(--primary)" /> {traj.salary_potential}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border-color)' }}><Clock size={16} color="var(--primary)" /> {traj.time_to_reach}</span>
                </div>

                <div style={{ marginBottom: '1.25rem', flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>💡 La tactique</strong>
                  <div style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }} dangerouslySetInnerHTML={formatMarkdown(traj.rationale)} />
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--danger-text)', marginBottom: '0.5rem' }}><AlertTriangle size={16} /> Ce qu'il vous manque</strong>
                  <div style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }} dangerouslySetInnerHTML={formatMarkdown(traj.gap)} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>Aucune trajectoire alternative n'a pu être générée.</div>
        )}

        <FeedbackWidget feature="career_radar" question="Ces suggestions de trajectoires sont-elles pertinentes ?" />
      </div>
    </div>
  );
}