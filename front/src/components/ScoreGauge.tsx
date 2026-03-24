import React from 'react';

interface ScoreGaugeProps {
  score: number; // 0 to 10
  label: string;
  critique?: string;
  metrics?: { label: string; value: string }[];
  colorScale?: 'standard' | 'inverted'; // standard: red->green
  tooltip?: string;
}

export default function ScoreGauge({ score, label, critique, metrics, colorScale = 'standard', tooltip }: ScoreGaugeProps) {
  // Calcul de la couleur (Rouge -> Jaune -> Vert)
  const getColor = (val: number) => {
    if (val < 4) return "#ef4444"; // Rouge
    if (val < 7) return "#eab308"; // Jaune
    return "#22c55e"; // Vert
  };

  const color = getColor(score);
  const percentage = Math.min(Math.max(score * 10, 0), 100);

  return (
    <div style={{ background: "var(--bg-secondary)", padding: "15px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "15px" }}>
      <style>{`
        .tooltip-container-sg {
          position: relative;
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
        }
        .tooltip-icon-sg {
          cursor: help;
          color: var(--text-muted);
          font-size: 14px;
          border: 1px solid #cbd5e1;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .tooltip-container-sg .tooltip-text-sg {
          visibility: hidden;
          width: 240px;
          background-color: #333;
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          margin-left: -120px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
          font-weight: normal;
          line-height: 1.4;
        }
        .tooltip-container-sg:hover .tooltip-text-sg {
          visibility: visible;
          opacity: 1;
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontWeight: "bold", color: "var(--text-main)", display: 'flex', alignItems: 'center' }}>
          {label}
          {tooltip && (
            <div className="tooltip-container-sg">
              <span className="tooltip-icon-sg">?</span>
              <div className="tooltip-text-sg">{tooltip}</div>
            </div>
          )}
        </span>
        <span style={{ fontWeight: "bold", fontSize: "18px", color: color }}>{score}/10</span>
      </div>

      {/* Bar Container */}
      <div style={{ height: "10px", width: "100%", background: "#e5e7eb", borderRadius: "5px", position: "relative", overflow: "hidden", marginBottom: "10px" }}>
        {/* Gradient Background */}
        <div style={{ 
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
            background: "linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)",
            opacity: 0.3
        }} />
        
        {/* Active Bar */}
        <div style={{ 
            width: `${percentage}%`, 
            height: "100%", 
            background: color,
            transition: "width 0.5s ease-out"
        }} />
      </div>

      {critique && (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 10px 0", fontStyle: "italic" }}>
          "{critique}"
        </p>
      )}

      {metrics && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {metrics.map((m, i) => (
            <span key={i} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
              {m.label}: <b>{m.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}