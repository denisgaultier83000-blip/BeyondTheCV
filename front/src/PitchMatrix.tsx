import React, { useState, useEffect } from 'react';
import { useDashboard } from './DashboardContext';
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

  // ... (The rest of the JSX rendering logic from the previous response)
  // This part is omitted for brevity but should be included from the previous step.
  // It includes the main div, header, button, and the grid of PitchCards.
  return (
    <div className="pitch-matrix-container">
      {/* ... The full JSX from the previous step ... */}
    </div>
  );
}