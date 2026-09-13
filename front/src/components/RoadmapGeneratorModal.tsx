import React from 'react';
import { X, Map } from 'lucide-react';
import { useDashboard } from '../hooks/DashboardContext';
import { RoadmapGenerator } from './RoadmapGenerator';

interface RoadmapGeneratorModalProps {
  onClose: () => void;
}

export default function RoadmapGeneratorModal({ onClose }: RoadmapGeneratorModalProps) {
  const { cvData, updateFormData } = useDashboard();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.25rem',
        width: '90%', maxWidth: '760px', position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color)'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <Map size={28} color="var(--primary)" />
            Générateur de Feuille de Route
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Configurez le contexte de votre entretien pour un plan sur-mesure.</p>
        </div>

        <RoadmapGenerator
          cvData={cvData}
          history={(cvData?.roadmapHistory || []) as any}
          onHistoryChange={(nextHistory) => updateFormData?.('roadmapHistory', nextHistory)}
        />
      </div>
    </div>
  );
}