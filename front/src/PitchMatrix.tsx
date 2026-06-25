import React, { useState, useEffect } from 'react';
import { useDashboard } from './components/DashboardContext';
import { BrainCircuit, Bot, Loader2, AlertTriangle, Mic, FileText, Save, CheckCircle2 } from 'lucide-react';

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

  useEffect(() => {
    if (cvData && (cvData as any).pitch_matrix) {
      setPitchMatrix((cvData as any).pitch_matrix);
    }
  }, [cvData]);

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
    setIsLoading(true);
    setError(null);

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
      // Optional: show a success toast
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pitch-matrix-container">
      <div className="pitch-matrix-header">
        <h2>Pitch Matrix</h2>
        <div className="header-actions">
          <button onClick={handleGeneratePitch} disabled={isLoading} className="btn-primary">
            {isLoading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
            Generate Pitches
          </button>
          <button onClick={handleSaveChanges} disabled={isLoading || !pitchMatrix} className="btn-secondary">
            {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
            Save Changes
          </button>
        </div>
      </div>

      {error && <div className="error-banner"><AlertTriangle /> {error}</div>}

      {!pitchMatrix && !isLoading && (
        <div className="empty-state">
          <Bot size={48} />
          <p>Your pitch matrix is empty. Click "Generate Pitches" to start.</p>
        </div>
      )}

      {isLoading && !pitchMatrix && (
        <div className="loading-state">
          <Loader2 size={48} className="animate-spin" />
          <p>Generating your pitches... This may take a moment.</p>
        </div>
      )}

      {pitchMatrix && (
        <div className="pitch-grid">
          <PitchCard title="Recruiter Pitch" pitch={pitchMatrix.recruiter_pitch} icon={<Bot size={20} />} onPitchChange={(v, val) => handlePitchChange('recruiter_pitch', v, val)} />
          <PitchCard title="Executive Pitch" pitch={pitchMatrix.executive_pitch} icon={<Bot size={20} />} onPitchChange={(v, val) => handlePitchChange('executive_pitch', v, val)} />
          <PitchCard title="HR Pitch" pitch={pitchMatrix.hr_pitch} icon={<Bot size={20} />} onPitchChange={(v, val) => handlePitchChange('hr_pitch', v, val)} />
          <PitchCard title="Networking Pitch" pitch={pitchMatrix.networking_pitch} icon={<Bot size={20} />} onPitchChange={(v, val) => handlePitchChange('networking_pitch', v, val)} />
          <PitchCard
            title="Anti-Flaw Pitch"
            pitch={pitchMatrix.anti_flaw_pitch}
            icon={<BrainCircuit size={20} />}
            identifiedFlaw={pitchMatrix.anti_flaw_pitch.identified_flaw}
            onPitchChange={(v, val) => handlePitchChange('anti_flaw_pitch', v, val)}
          />
        </div>
      )}
    </div>
  );
}