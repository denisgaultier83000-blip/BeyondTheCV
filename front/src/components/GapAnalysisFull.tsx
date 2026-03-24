import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const GapAnalysisFull = ({ data, onBack }: { data: any, onBack: () => void }) => {
  const displayData = data || { gapsMatrix: [] };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
          <AlertTriangle size={28} color="#f97316" /> Plan d'Action & Écarts (Exhaustif)
        </h2>
        <button onClick={onBack} className="btn-action btn-secondary-action" style={{ maxWidth: '150px' }}>
          <X size={16} /> Retour
        </button>
      </div>

      <table className="gap-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '1rem', background: 'var(--bg-secondary)', color: 'var(--text-main)', borderRadius: '0.5rem 0 0 0' }}>Compétence Manquante</th>
            <th style={{ padding: '1rem', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>Gravité</th>
            <th style={{ padding: '1rem', background: 'var(--bg-secondary)', color: 'var(--text-main)', borderRadius: '0 0.5rem 0 0' }}>Action Corrective Recommandée</th>
          </tr>
        </thead>
        <tbody>
          {displayData.gapsMatrix.map((gap: any, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
              <td style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>{gap.skill}</td>
              <td style={{ padding: '1.25rem 1rem' }}>
                <span style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', fontSize: '0.8rem', fontWeight: 600, background: gap.impact === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: gap.impact === 'High' ? 'var(--danger-text)' : 'var(--warning)' }}>
                  {gap.impact === 'High' ? 'Éliminatoire' : 'Secondaire'}
                </span>
              </td>
              <td style={{ padding: '1.25rem 1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{gap.action}</td>
            </tr>
          ))}
          {displayData.gapsMatrix.length === 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Aucun écart majeur détecté !</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};