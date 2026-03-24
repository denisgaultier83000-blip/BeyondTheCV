import React, { useState, useEffect, useRef } from 'react';

interface GaugeProps {
  score: number; // 0-100
  color: string;
  trackColor?: string;
}

export default function Gauge({ score, color, trackColor = "#e2e8f0" }: GaugeProps) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  
  const safeScore = (score === undefined || score === null || isNaN(score)) ? 0 : score;
  const offset = circumference - (safeScore / 100) * circumference;

  // [NEW] Logique de surlignage lors de la mise à jour asynchrone
  const [highlight, setHighlight] = useState(false);
  const prevScoreRef = useRef(safeScore);

  useEffect(() => {
    // On déclenche l'animation uniquement si le score change (ex: MAJ par le Gap Analysis)
    if (safeScore !== prevScoreRef.current && safeScore > 0) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1500); // Durée de l'animation
      prevScoreRef.current = safeScore;
      return () => clearTimeout(timer);
    }
  }, [safeScore]);

  return (
    <div style={{ position: 'relative', width: '140px', height: '140px', animation: highlight ? 'gauge-pulse 1.5s ease-out' : 'none', borderRadius: '50%' }}>
      <style>{`
        @keyframes gauge-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
          30% { transform: scale(1.08); filter: drop-shadow(0 0 15px ${color}); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
        }
      `}</style>
      <svg
        width="140"
        height="140"
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Cercle de fond (la piste grise) */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={trackColor}
          strokeWidth="12"
          fill="transparent"
        />
        {/* Arc de progression (la jauge colorée) */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      {/* Texte au centre de la jauge */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
      <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color }}>{safeScore > 0 ? safeScore : '-'}</span>
        <span style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '-5px' }}>/ 100</span>
      </div>
    </div>
  );
}