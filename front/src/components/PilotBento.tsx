import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle, Target, Linkedin, Trophy, Navigation, ArrowRight } from 'lucide-react';
import Gauge from './Gauge';

export const PilotBento = ({ 
  data, 
  careerRadarData,
  careerGpsData,
  onGoToGap,
  onGoToRadar,
  onGoToGps
}: { data: any, careerRadarData?: any, careerGpsData?: any, onGoToGap: () => void, onGoToRadar?: () => void, onGoToGps?: () => void }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Données mockées d'attente si pilotData n'est pas encore redescendu du backend
  const displayData = data || {
    matchScore: 82,
    summary: "Votre profil correspond bien aux attentes du marché, mais manque d'une certification technique clé.",
    strengths: ["Management Agile", "Architecture Cloud", "Leadership technique"],
    gapsMatrix: [
      { skill: "Certification Requise", impact: "High", action: "Planifier l'examen d'ici 3 mois" },
      { skill: "Expérience Spécifique", impact: "Medium", action: "Mettre en valeur le projet X sur le CV" }
    ],
    recommendedStrategy: "Concentrez-vous sur vos réalisations Cloud lors des entretiens et compensez le manque de certification par des cas d'usage concrets."
  };

  // Animation du score (Compteur de 0 à la cible)
  useEffect(() => {
    const baseScore = displayData.matchScore > 0 ? displayData.matchScore : 0;
    const targetScore = Math.min(100, baseScore);
    let current = animatedScore;
    const step = targetScore > current ? 1 : -1;
    const timer = setInterval(() => {
      if (current === targetScore) clearInterval(timer);
      else { current += step; setAnimatedScore(current); }
    }, 20); // Vitesse du compteur
    return () => clearInterval(timer);
  }, [displayData.matchScore]);

  // Code couleur dynamique (Rouge -> Orange -> Vert)
  const getScoreColor = (score: number) => score >= 80 ? 'var(--success, #10b981)' : score >= 60 ? 'var(--warning, #f59e0b)' : 'var(--danger-text, #ef4444)';
  const currentColor = getScoreColor(animatedScore);
  
  return (
    <div className="bento-grid">
      {/* 1. Score d'adéquation (Jauge) */}
      <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div className="bento-header"><Activity size={20} /> Score d'adéquation</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
          <Gauge score={animatedScore} color={currentColor} trackColor="var(--border-color, #e2e8f0)" />
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          {displayData.summary || "Analyse IA en cours ou données insuffisantes."}
        </p>
        
        <button 
          onClick={onGoToGap} 
          style={{ marginTop: 'auto', width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
        >
          <AlertTriangle size={18} /> Voir l'analyse des écarts (Gap Analysis)
        </button>
      </div>

      {/* 2. Forces Principales */}
      <div className="bento-card col-span-2">
        <div className="bento-header"><Zap size={20} color="var(--warning, #eab308)" /> Vos Forces Clés</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {displayData.strengths && displayData.strengths.length > 0 ? displayData.strengths.map((s: string, i: number) => (
            <span key={i} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>{s}</span>
          )) : <span style={{ color: 'var(--text-muted)' }}>Aucune force détectée...</span>}
        </div>
      </div>

      {/* 3. NOUVEAU: Gaps Prioritaires (Auparavant oublié dans le rendu) */}
      <div className="bento-card col-span-3">
        <div className="bento-header"><AlertTriangle size={20} color="var(--danger-text, #ef4444)" /> Gaps Prioritaires</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {displayData.gapsMatrix && displayData.gapsMatrix.length > 0 ? displayData.gapsMatrix.slice(0, 3).map((gap: any, i: number) => (
            <div key={i} style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <strong style={{ color: 'var(--danger-text)' }}>{gap.skill}</strong> <br/>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{gap.action}</span>
            </div>
          )) : <span style={{ color: 'var(--text-muted)' }}>Aucun gap détecté...</span>}
        </div>
      </div>

      {/* 4. NOUVEAU: Stratégie de Candidature (Auparavant oublié dans le rendu) */}
      <div className="bento-card col-span-3">
        <div className="bento-header"><Target size={20} color="var(--primary, #3b82f6)" /> Stratégie de Candidature</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
          {displayData.recommendedStrategy || "Analyse de la stratégie en cours..."}
        </p>
      </div>
      
      {/* CARTE BENTO : CAREER GPS (Premium Insight) */}
      {careerGpsData?.route && (
        <div className="bento-card col-span-3" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', color: 'white', border: '1px solid #1e40af' }}>
          <div className="bento-header" style={{ color: '#93c5fd' }}>
            <Navigation size={20} /> GPS de Carrière
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flex: 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Départ</div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{careerGpsData.current_position?.role || "Position Actuelle"}</div>
            </div>
            
            <div style={{ flex: 1, margin: '0 1rem', height: '2px', background: 'rgba(255,255,255,0.2)', position: 'relative' }}>
               <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.8rem', color: '#bfdbfe', background: '#172554', padding: '0 12px', borderRadius: '12px', border: '1px solid #1e40af', whiteSpace: 'nowrap' }}>
                  {careerGpsData.route.estimated_time || "Calcul en cours"}
               </div>
            </div>
            
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>Cible</div>
              <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{careerGpsData.destination?.target_role || "Poste Visé"}</div>
            </div>
          </div>

          <button 
            onClick={onGoToGps} 
            style={{ 
              width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', 
              color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            Voir la feuille de route <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};