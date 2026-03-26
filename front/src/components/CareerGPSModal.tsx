import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Navigation, Flag, AlertTriangle, TrendingUp, Zap, Clock, Percent } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { FeedbackWidget } from './FeedbackWidget';

interface CareerGPSModalProps {
  data: any;
  onClose: () => void;
}

export default function CareerGPSModal({ data, onClose }: CareerGPSModalProps) {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(-1); // -1 = Main Route
  const { t } = useTranslation();

  if (!data) return null;

  // Résolution robuste des données (Support de l'encapsulation IA)
  const gpsData = data.career_gps_result || data;
  
  const currentPos = gpsData.current_position || {};
  const dest = gpsData.destination || {};
  const mainRoute = gpsData.route || {};
  const prog = gpsData.progression || {};
  const radar = gpsData.market_radar || {};
  const alts = gpsData.alternatives || [];

  // Determine active route data
  const activeRoute = selectedRouteIndex === -1 
    ? mainRoute 
    : {
        estimated_time: alts[selectedRouteIndex].time,
        probability: alts[selectedRouteIndex].probability,
        steps: alts[selectedRouteIndex].steps || [],
        obstacles: alts[selectedRouteIndex].obstacles || []
      };

  const activeRouteName = selectedRouteIndex === -1 
    ? "Itinéraire Optimal" 
    : alts[selectedRouteIndex].name;

  const probabilityColor = activeRoute.probability >= 80 ? '#10b981' : activeRoute.probability >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem', width: '90%', maxWidth: '950px', position: 'relative',
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
          <Map size={32} color="var(--primary)" /> GPS de Carrière
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          Votre feuille de route pas-à-pas pour atteindre votre poste cible.
        </p>

        {/* 1. Carte de Navigation (Header visuel) */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Départ</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>{currentPos.role || "Non défini"}</div>
            </div>
            
            <div style={{ flex: 2, height: '6px', background: '#e2e8f0', margin: '0 1.5rem', position: 'relative', borderRadius: '3px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${prog.percentage || 0}%`, background: probabilityColor, borderRadius: '3px', transition: 'background 0.4s ease-out, width 0.4s ease-out' }}></div>
              <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', padding: '0.1rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                {activeRoute.estimated_time || "N/A"}
              </div>
            </div>

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Destination</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>{dest.target_role || "Non défini"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* 2. Itinéraire */}
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: probabilityColor, margin: '0 0 1.5rem 0', fontSize: '1.2rem' }}>
              <Flag size={20} color={probabilityColor} /> {activeRouteName} ({activeRoute.probability || 0}% succès)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {(activeRoute.steps || []).map((step: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', zIndex: 1 }}>{idx + 1}</div>
                    {idx < (activeRoute.steps || []).length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border-color)', minHeight: '30px', marginTop: '4px' }}></div>}
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      {step.icon && <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>}
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.4' }} dangerouslySetInnerHTML={formatMarkdown(step.name)} />
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ color: step.impact_color || '#3b82f6', backgroundColor: `${step.impact_color || '#3b82f6'}15`, padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Zap size={14} /> Impact : {step.impact || "Moyen"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Obstacles & Alternatifs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Obstacles */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} /> Ralentissements / Obstacles
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--danger-text)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {(activeRoute.obstacles || []).map((obs: any, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>{typeof obs === 'string' ? obs : <>{obs.icon && <span>{obs.icon} </span>}{obs.text}</>}</li>
                ))}
              </ul>
            </div>

            {/* Radar Marché */}
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} /> Radar Marché
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tension Recrutement</div><div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{radar.demand_score || 0}/100</div></div>
                <div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Salaire Cible</div><div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.2rem' }}>{radar.salary_target || "N/A"}</div></div>
              </div>
              <div style={{ paddingTop: '1rem', borderTop: '1px dashed rgba(59, 130, 246, 0.2)' }}><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>🚀 Prochaine action</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)' }}>{radar.next_step_recommendation || "Non disponible"}</div></div>
            </div>
          </div>
        </div>

        <FeedbackWidget feature="career_gps" question="Cette feuille de route vous semble-t-elle réaliste et applicable ?" />
      </div>
    </div>
  );
}