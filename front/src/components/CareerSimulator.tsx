// e:\BeyondTheCV\front\src\components\CareerSimulator.tsx
import React, { useState } from 'react';
import { Play, TrendingUp, DollarSign, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { formatMarkdown } from '../utils/markdown';
import { DashboardCard } from './DashboardCard';

interface SimulatorProps {
  candidateData: any;
}

export function CareerSimulator({ candidateData }: SimulatorProps) {
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const predefinedActions = [
    "Certification PMP",
    "Certification AWS Solutions Architect",
    "Devenir Manager",
    "Changer pour le secteur Bancaire",
    "Expatriation aux USA"
  ];

  const handleSimulate = async (simAction: string, candidateData: any) => {
    if (!simAction) return;
    setLoading(true);
    setAction(simAction); // Update input if clicked from list
    setResult(null);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/simulate-career`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_data: candidateData,
          simulation_action: simAction
        }),
      });
      
      if (!response.ok) throw new Error("Simulation failed");
      const data = await response.json();
      // Accepte le format encapsulé OU le format direct à la racine
      setResult(data.simulation || data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardCard
      title="Simulateur de Carrière"
      icon={<Play size={24} />}
      featureId={result ? "career_simulator" : undefined}
      jobType={candidateData?.target_job}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Testez des choix de carrière avant de les faire (Certifications, Mobilité, Promotion...).
      </p>
      {/* Input Zone */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input 
          disabled={loading}
          type="text" 
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Ex: Certification Cloud, Devenir Freelance..."
          style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
        />
        <button 
          onClick={() => handleSimulate(action, candidateData)} 
          disabled={loading || !action}
          className="btn-primary"
          style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />} Simuler
        </button>
      </div>

      {/* Quick Picks */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {predefinedActions.map((act, i) => (
          <button 
            key={i} 
            onClick={() => handleSimulate(act, candidateData)}
            disabled={loading}
            className="btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading && action === act && <Loader2 size={14} className="spin" />}
            {act}
          </button>
        ))}
      </div>

      {/* Result Display */}
      {result && (
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '1.5rem', borderRadius: '1rem', 
          border: '1px solid var(--border-color)', animation: 'fadeIn 0.5s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>Impact de : "{result.action || action}"</h4>
            {result.feasibility_score !== undefined && (
              <span style={{ 
                background: result.feasibility_score >= 7 ? 'var(--success)' : result.feasibility_score >= 4 ? 'var(--warning)' : 'var(--danger-text)', 
                color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontWeight: 'bold', fontSize: '0.9rem' 
              }}>
                Faisabilité : {result.feasibility_score}/10
              </span>
            )}
          </div>

          <div 
            style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={formatMarkdown(result.analysis || result.content || result.market_verdict || "Analyse indisponible.")}
          ></div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </DashboardCard>
  );
}
