import React, { useState, useEffect } from 'react';
import { Map, Navigation, Flag, AlertTriangle, TrendingUp, Zap, Clock, Percent, AlertCircle } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { FeedbackWidget } from './FeedbackWidget';

interface CareerGPSData {
  current_position: {
    role: string;
    market_level: string;
    employability_score: number;
    strengths: string[];
    gaps: string[];
  };
  destination: {
    target_role: string;
  };
  route: {
    estimated_time: string;
    probability: number;
    steps: { name: string; impact: string; impact_color?: string; icon?: string }[];
    obstacles: any[];
  };
  // [FIX] Update structure to support details in alternatives
  alternatives: { name: string; role: string; time: string; probability: number; steps?: { name: string; impact: string; impact_color?: string; icon?: string }[]; obstacles?: any[] }[];
  progression: {
    percentage: number;
    acquired: string[];
    remaining: string[];
  };
  market_radar: {
    demand_score: number;
    salary_target: string;
    next_step_recommendation: string;
  };
}

interface CareerGPSProps {
  data: CareerGPSData | null;
  loading?: boolean;
  error?: boolean;
}

export function CareerGPS({ data, loading, error }: CareerGPSProps) {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(-1);

  if (error) {
    return (
      <div className="error-box" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        <AlertCircle size={24} />
        <span>Une erreur est survenue lors du calcul de votre itinéraire. Veuillez réessayer.</span>
      </div>
    );
  }

  if (loading || !data) return null; // Le parent DashboardCard gère le loading/error

  // Defensive Coding
  const gpsData = (data as any).career_gps_result || data;
  const currentPos = gpsData?.current_position || {};
  const dest = gpsData?.destination || {};
  const mainRoute = gpsData?.route || {};
  const prog = gpsData?.progression || {};
  const radar = gpsData?.market_radar || {};
  const alts = gpsData?.alternatives || [];

  // Determine active route data
  const activeRoute = selectedRouteIndex === -1 
    ? mainRoute 
    : {
        estimated_time: alts[selectedRouteIndex].time,
        probability: alts[selectedRouteIndex].probability,
        steps: alts[selectedRouteIndex].steps || [],
        obstacles: alts[selectedRouteIndex].obstacles || []
      };

  // Nom de la route active
  const activeRouteName = selectedRouteIndex === -1 
    ? "Itinéraire Optimal" 
    : alts[selectedRouteIndex].name;

  // Calcul de la couleur en fonction de la probabilité de succès
  const probabilityColor = activeRoute.probability >= 80 ? '#10b981' : activeRoute.probability >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* 1. Carte de Navigation (Header visuel) */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Départ</div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>{currentPos.role || "Non défini"}</div>
          </div>
          
          <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', margin: '0 1.5rem', position: 'relative', borderRadius: '2px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${prog.percentage || 0}%`, background: probabilityColor, borderRadius: '2px', transition: 'background 0.4s ease-out, width 0.4s ease-out' }}></div>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              {activeRoute.estimated_time || "N/A"}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Destination</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>{dest.target_role || "Non défini"}</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '2rem' }}>
        
        {/* 2. Itinéraire Principal */}
        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: probabilityColor, margin: '0 0 1rem 0' }}>
            <Flag size={18} color={probabilityColor} /> {activeRouteName} ({activeRoute.probability || 0}% succès)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(activeRoute.steps || []).map((step: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', zIndex: 1 }}>{idx + 1}</div>
                  {idx < (activeRoute.steps || []).length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border-color)', minHeight: '20px', marginTop: '4px' }}></div>}
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    {step.icon && <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>}
                    <div 
                      style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}
                      dangerouslySetInnerHTML={formatMarkdown(step.name)}
                    />
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span style={{ 
                      color: step.impact_color || '#3b82f6', 
                      backgroundColor: `${step.impact_color || '#3b82f6'}15`, 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                    }}>
                      <Zap size={12} /> Impact : {step.impact || "Moyen"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Obstacles & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Obstacles */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> Ralentissements / Obstacles
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--danger-text)', fontSize: '0.85rem' }}>
              {(activeRoute.obstacles || []).map((obs: any, i: number) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>
                  {typeof obs === 'string' ? obs : <>{obs.icon && <span>{obs.icon} </span>}{obs.text}</>}
                </li>
              ))}
            </ul>
          </div>

          {/* Radar Marché */}
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={16} /> Radar Marché
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }} title="Indice de tension (100 = Pénurie de candidats, très favorable)">Tension (Recrutement)</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{radar.demand_score || 0}/100</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Salaire Cible</div>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{radar.salary_target || "N/A"}</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>🚀 Prochaine action (Boost)</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{radar.next_step_recommendation || "Non disponible"}</div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Routes Alternatives */}
      {alts.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>🔀 Itinéraires Alternatifs</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div 
                onClick={() => setSelectedRouteIndex(-1)}
                style={{ cursor: 'pointer', background: selectedRouteIndex === -1 ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${selectedRouteIndex === -1 ? 'var(--primary)' : 'var(--border-color)'}`, transition: 'all 0.2s' }}
            >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedRouteIndex === -1 ? 'var(--primary)' : 'var(--text-muted)' }}>ROUTE OPTIMALE</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0.25rem 0' }}>{mainRoute.estimated_time || "Direct"}</div>
            </div>
            {alts.map((alt: any, i: number) => (
              <div key={i} onClick={() => setSelectedRouteIndex(i)} style={{ cursor: 'pointer', background: selectedRouteIndex === i ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${selectedRouteIndex === i ? 'var(--primary)' : 'var(--border-color)'}`, transition: 'all 0.2s' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedRouteIndex === i ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase' }}>{alt.name}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', margin: '0.25rem 0' }}>{alt.role}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span><Clock size={12} style={{ verticalAlign: 'text-bottom' }}/> {alt.time}</span>
                  <span><Percent size={12} style={{ verticalAlign: 'text-bottom' }}/> {alt.probability}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
