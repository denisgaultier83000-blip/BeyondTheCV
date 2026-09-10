import React, { useState, useEffect, useRef } from 'react';

interface GaugeProps {
  score: number; // 0-100
  color: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  subText?: string;
  fontSize?: string;
}

export default function Gauge({
  score,
  color,
  trackColor = "var(--border-color, #e2e8f0)",
  size = 140,
  strokeWidth = 12,
  subText = "/ 100",
  fontSize
}: GaugeProps) {
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
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

  const defaultFontSize = fontSize || `${Math.max(1.1, size / 55)}rem`;
  const defaultSubFontSize = `${Math.max(0.65, size / 160)}rem`;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, animation: highlight ? 'gauge-pulse 1.5s ease-out' : 'none', borderRadius: '50%', flexShrink: 0 }}>
      <style>{`
        @keyframes gauge-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
          30% { transform: scale(1.08); filter: drop-shadow(0 0 15px ${color}); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0px transparent); }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Cercle de fond (la piste grise) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Arc de progression (la jauge colorée) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
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
          lineHeight: 1
        }}
      >
        <span style={{ fontSize: defaultFontSize, fontWeight: 900, color: color }}>{safeScore > 0 ? safeScore : '-'}</span>
        {subText && <span style={{ fontSize: defaultSubFontSize, color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>{subText}</span>}
      </div>
    </div>
  );
}