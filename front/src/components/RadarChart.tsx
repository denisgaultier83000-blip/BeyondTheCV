import React from 'react';
import { useTranslation } from 'react-i18next';

// Mapping from fine-grained traits to the 5 core axes
const TRAIT_TO_AXIS_MAP: Record<string, string> = {
  // from work_style
  'Analytique': 'Analyse',
  'Créatif': 'Innovation',
  'Orienté solution': 'Analyse',
  'Organisé': 'Organisation',
  'Rigoureux': 'Organisation',
  'Proactif': 'Organisation',
  'Flexible': 'Innovation',
  'Résilient': 'Innovation',
  'Autonome': 'Innovation',
  // from relational_style
  'Communicant': 'Relationnel',
  'À l’écoute': 'Relationnel',
  'Pédagogue': 'Relationnel',
  'Collaboratif': 'Relationnel',
  'Facilitateur': 'Relationnel',
  'Diplomate': 'Relationnel',
  'Leader': 'Leadership',
  'Décideur': 'Leadership',
  'Mobilisateur': 'Leadership',
  // from professional_approach
  'Orienté performance': 'Organisation',
  'Pragmatique': 'Organisation',
  'Persévérant': 'Organisation',
  'Fiable': 'Organisation',
  'Sens des responsabilités': 'Organisation',
  'Engagé': 'Innovation',
  'Curieux': 'Innovation',
  'Force de proposition': 'Leadership',
  'Vision stratégique': 'Analyse',
};

const AXES = ['Analyse', 'Organisation', 'Leadership', 'Relationnel', 'Innovation'];
// We set a fixed max score for the scale. A user can select a maximum of 3 traits from work_style and 3 from professional_approach
// that map to 'Organisation', but it's very unlikely. A max of 4 provides a good visual scale.
const MAX_SCORE = 4;

interface RadarChartProps {
  data: {
    work_style?: string[];
    relational_style?: string[];
    professional_approach?: string[];
  };
}

export default function RadarChart({ data }: RadarChartProps) {
  const { t } = useTranslation();
  const allTraits = [
    ...(data.work_style || []),
    ...(data.relational_style || []),
    ...(data.professional_approach || []),
  ];

  // Calculate scores for each axis by counting the selected traits
  const scores = AXES.map(axis => {
    const score = allTraits.filter(trait => TRAIT_TO_AXIS_MAP[trait] === axis).length;
    return { axis, score };
  });

  const size = 500;
  const center = size / 2;
  const radius = center * 0.55; // Ajusté pour laisser de la place au texte agrandi

  // Function to get coordinates for a point on the chart
  const getPoint = (angle: number, value: number) => {
    const x = center + radius * (value / MAX_SCORE) * Math.cos(angle);
    const y = center + radius * (value / MAX_SCORE) * Math.sin(angle);
    return `${x},${y}`;
  };

  const points = scores.map((item, i) => {
    const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
    return getPoint(angle, item.score);
  }).join(' ');

  return (
    <div style={{ textAlign: 'center' }}>
      <h3 style={{ color: 'var(--bleu-fonce)', marginTop: 0 }}>{t("radar_chart_title","Radar de Profil")}</h3>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ height: 'auto', maxWidth: `${size}px`, overflow: 'visible' }}>
        <style>{`
          @keyframes radar-appear {
            from { opacity: 0; transform: scale(0); }
            to { opacity: 1; transform: scale(1); }
          }
          .radar-data {
            animation: radar-appear 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            transform-origin: ${center}px ${center}px;
          }
        `}</style>
        <g>
          {/* Background grid lines (polygons) */}
          {[...Array(MAX_SCORE)].map((_, level) => {
            const levelPoints = AXES.map((_, i) => {
              const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
              return getPoint(angle, level + 1);
            }).join(' ');

            return (
              <polygon
                key={level}
                points={levelPoints}
                fill="none"
                stroke="var(--border-color, #e2e8f0)"
                strokeWidth="1"
              />
            );
          })}

          {/* Axes lines */}
          {AXES.map((_, i) => {
            const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
            const endPoint = getPoint(angle, MAX_SCORE);
            return <line key={i} x1={center} y1={center} x2={endPoint.split(',')[0]} y2={endPoint.split(',')[1]} stroke="var(--border-color, #cbd5e1)" strokeWidth="1" />;
          })}

          {/* Animated Data Group */}
          <g className="radar-data">
            {/* Data Polygon */}
            <polygon
              points={points}
              fill="rgba(109, 190, 247, 0.4)" // --bleu-clair with opacity
              stroke="var(--bleu-clair, #6DBEF7)"
              strokeWidth="2"
            />

            {/* Data Points */}
            {scores.map((item, i) => {
              const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
              const pointCoords = getPoint(angle, item.score).split(',');
              return (
                <circle
                  key={i}
                  cx={parseFloat(pointCoords[0])}
                  cy={parseFloat(pointCoords[1])}
                  r="4"
                  fill="var(--bleu-fonce, #0F2650)"
                />
              );
            })}
          </g>

          {/* Labels */}
          {AXES.map((label, i) => {
            const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
            const labelRadius = radius * 1.3; // Position labels outside the grid
            const x = center + labelRadius * Math.cos(angle);
            const y = center + labelRadius * Math.sin(angle);
            return (
              <text
                key={label}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                fontWeight="600"
                fill="var(--bleu-moyen, #446285)"
              >
                {label}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}