import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../hooks/DashboardContext';
import { BrainCircuit, Bot, Loader2, AlertTriangle, Mic, FileText, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- Types for data structure ---
interface Pitch {
  written: string;
  oral: string;
}

interface AntiFlawPitch extends Pitch {
  identified_flaw: string;
}

interface PitchMatrixData {
  recruiter_pitch: Pitch;
  executive_pitch: Pitch;
  hr_pitch: Pitch;
  networking_pitch: Pitch;
  anti_flaw_pitch: AntiFlawPitch;
}

// --- Sub-component to display and edit a pitch ---
const PitchCard: React.FC<{
  title: string;
  pitch: Pitch;
  icon: React.ReactNode;
  identifiedFlaw?: string;
  onPitchChange: (version: 'written' | 'oral', value: string) => void;
}> = ({ title, pitch, icon, identifiedFlaw, onPitchChange }) => (
  <div className="pitch-card">
    <div className="pitch-card-header">
      {icon}
      <h3>{title}</h3>
    </div>
    {identifiedFlaw && (
      <div className="flaw-banner">
        <AlertTriangle size={16} />
        <div>
          <strong>Identified Flaw:</strong>
          <p>{identifiedFlaw}</p>
        </div>
      </div>
    )}
    <div className="pitch-content">
      <div className="pitch-version">
        <h4><FileText size={16} /> Written Version</h4>
        <textarea
          value={pitch.written}
          onChange={(e) => onPitchChange('written', e.target.value)}
          className="pitch-textarea"
          rows={6}
        />
      </div>
      <div className="pitch-version">
        <h4><Mic size={16} /> Oral Version</h4>
        <textarea
          value={pitch.oral}
          onChange={(e) => onPitchChange('oral', e.target.value)}
          className="pitch-textarea"
          rows={4}
        />
      </div>
    </div>
  </div>
);

export function PitchMatrix() {
  const { cvData } = useDashboard();
  const targetLanguage = cvData?.target_language;
  const [pitchMatrix, setPitchMatrix] = useState<PitchMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'typing' | 'saving' | 'saved' | 'error'>('idle');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (cvData && (cvData as any).pitch_matrix) {
      setPitchMatrix((cvData as any).pitch_matrix);
    }
    // This timeout prevents the initial load from being marked as a "typing" event
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 500);
  }, [cvData]);

  // [EXPERT] Auto-save with debounce effect
  useEffect(() => {
    // Don't trigger auto-save on the initial data load or while generating
    if (initialLoadRef.current || isLoading) {
      return;
    }

    if (pitchMatrix) {
      setSaveStatus('typing');
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      debounceTimeoutRef.current = setTimeout(() => {
        handleSaveChanges();
      }, 1500); // Auto-save 1.5 seconds after the user stops typing
    }
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [pitchMatrix]);

  const handlePitchChange = (pitchType: keyof PitchMatrixData, version: 'written' | 'oral', value: string) => {
    setPitchMatrix(prevMatrix => {
      if (!prevMatrix) return null;
      const newMatrix = JSON.parse(JSON.stringify(prevMatrix));
      newMatrix[pitchType][version] = value;
      return newMatrix;
    });
  };

  const handleGeneratePitch = async () => {
    setIsLoading(true);
    setError(null);
    setPitchMatrix(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication required for this action.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ candidate_data: cvData, target_language: targetLanguage || 'fr' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error ${response.status}`);
      }

      const data: PitchMatrixData = await response.json();
      setPitchMatrix(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!pitchMatrix) return;
    setError(null);
    setSaveStatus('saving');

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication required to save.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/pitch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pitch_matrix: pitchMatrix }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error while saving.");
      }
      setSaveStatus('saved');
    } catch (err: any) {
      setError(err.message);
      setSaveStatus('error');
    }
  };

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'typing':
        return <span style={{ color: 'var(--text-muted)' }}>Modifications en cours...</span>;
      case 'saving':
        return <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Loader2 size={16} className="spinner" /> Sauvegarde...</span>;
      case 'saved':
        return <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> Enregistré</span>;
      case 'error':
        return <span style={{ color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> Erreur de sauvegarde</span>;
      default:
        return <span style={{ color: 'var(--text-muted)' }}>Vos modifications seront sauvegardées automatiquement.</span>;
    }
  };

  // ... (The rest of the JSX rendering logic from the previous response)
  // This part is omitted for brevity but should be included from the previous step.
  // It includes the main div, header, button, and the grid of PitchCards.
  return (
    <div className="pitch-matrix-container">
      <div className="pitch-matrix-header">
        <BrainCircuit size={32} />
        <div>
          <h2>Matrice de Pitchs Stratégiques</h2>
          <p>Générez des versions de votre pitch adaptées à chaque interlocuteur.</p>
        </div>
      </div>

      {!pitchMatrix && (
        <div className="pitch-cta-container">
          <button onClick={handleGeneratePitch} disabled={isLoading} className="btn-primary-pitch">
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={20} />
                Génération en cours...
              </>
            ) : (
              <>
                <Bot size={20} />
                Générer ma matrice de pitchs
              </>
            )}
          </button>
        </div>
      )}

      {error && !isLoading && ( <div className="error-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}><AlertTriangle size={16} /> {error}</div> )}

      {pitchMatrix && (
        <div className="pitch-grid">
          <PitchCard title="Pitch Recruteur" pitch={pitchMatrix.recruiter_pitch} icon={<span className="icon-bg">🎯</span>} onPitchChange={(v, val) => handlePitchChange('recruiter_pitch', v, val)} />
          <PitchCard title="Pitch Dirigeant" pitch={pitchMatrix.executive_pitch} icon={<span className="icon-bg">📈</span>} onPitchChange={(v, val) => handlePitchChange('executive_pitch', v, val)} />
          <PitchCard title="Pitch RH" pitch={pitchMatrix.hr_pitch} icon={<span className="icon-bg">🤝</span>} onPitchChange={(v, val) => handlePitchChange('hr_pitch', v, val)} />
          <PitchCard title="Pitch Réseau" pitch={pitchMatrix.networking_pitch} icon={<span className="icon-bg">🌐</span>} onPitchChange={(v, val) => handlePitchChange('networking_pitch', v, val)} />
          <PitchCard 
            title="Pitch Anti-Faille" 
            pitch={pitchMatrix.anti_flaw_pitch} 
            icon={<span className="icon-bg">🛡️</span>} 
            identifiedFlaw={pitchMatrix.anti_flaw_pitch.identified_flaw}
            onPitchChange={(v, val) => handlePitchChange('anti_flaw_pitch', v, val)}
          />
          <div className="pitch-card-actions">{renderSaveStatus()}</div>
        </div>
      )}
    </div>
  );
}