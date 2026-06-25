import { useState, useEffect, useRef } from 'react';
interface GaugeProps {
  score: number; // 0-100
  color: string;
  trackColor?: string;
}

export default function Gauge({ score, color, trackColor = '#e2e8f0' }: GaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    const animation = requestAnimationFrame(() => setDisplayScore(score));
    return () => cancelAnimationFrame(animation);
  }, [score]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: color, transition: 'color 0.5s' }}>{Math.round(displayScore)}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>/ 100</span>
      </div>
    </div>
  );
}