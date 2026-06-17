import React from 'react';
import { Globe, Wallet, Activity, Zap, Loader2, XCircle, Target, Award, Lightbulb } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface MarketAnalysisCardProps {
  data: any;
  salaryData?: any;
  loading?: boolean;
  error?: boolean;
}

export function MarketAnalysisCard({ data, salaryData, loading, error }: MarketAnalysisCardProps) {

  let parsedData = data;
  if (typeof data === 'string') {
      try {
          const match = data.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          parsedData = JSON.parse(match ? match[1] : data); // [FIX] Extraction du bon groupe regex
      } catch (e) {
          parsedData = {};
      }
  }
  
  // Éviter de crasher lors du parsing asynchrone
  if (!loading && !error && (!parsedData || parsedData.error)) return null;

  // [FIX] Unwrap au cas où l'IA encapsule l'objet JSON
  const root = parsedData.data || parsedData.result || parsedData.market_research || parsedData;
  const report = root?.market_report || root?.rapport_marche || root?.market_analysis || root?.analyse_marche || root?.synthesis || root || {};
  
  const tensionRaw = report.tension_score || report.score_tension || 85;
  const tensionScore = tensionRaw <= 10 ? tensionRaw : tensionRaw / 10;
  const tensionIndex = report.tension_index || report.indice_tension || "Forte demande";
  
  const currencySymbol = salaryData?.currency === 'USD' ? '$' : '€';
  const low = salaryData?.salary_range?.low ? `${salaryData.salary_range.low}k${currencySymbol}` : "N/A";
  const mid = salaryData?.salary_range?.mid ? `${salaryData.salary_range.mid}k${currencySymbol}` : "N/A";
  const high = salaryData?.salary_range?.high ? `${salaryData.salary_range.high}k${currencySymbol}` : "N/A";
  const comment = salaryData?.commentary || report.salary_barometer || report.barometre_salaires || report.salaires || "Baromètre non disponible";
  const dynamics = report.recruitment_dynamics || report.dynamique_recrutement || "Données de marché en attente...";
  const trends = report.trends || report.tendances || "Analyse des tendances en cours...";
  const disruptions = report.major_disruptions || report.perturbations || "Recherche des disruptions en cours...";
  const landscape = report.competitive_landscape || report.paysage_concurrentiel || "Analyse des concurrents en cours...";
  const skills = report.top_skills || report.competences_cles || { hard: [], soft: [] };

  return (
    <DashboardCard
      title="Analyse du Marché"
      icon={<Globe size={24} />}
      loading={loading}
      loadingText="Analyse du marché en cours..."
      error={error || parsedData?.error}
      errorText="Analyse échouée."
    >
      {!loading && !error && parsedData && !parsedData.error && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Tension & Dynamique */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>
              <Activity size={18} color="#f59e0b" /> Dynamique de Recrutement
            </h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              {dynamics}
            </p>
          </div>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center', minWidth: '120px' }}>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Tension</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', margin: '0.5rem 0' }}>{tensionScore}<span style={{ fontSize: '1rem', color: '#94a3b8' }}>/10</span></div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tensionIndex}</div>
          </div>
        </div>

        {/* NOUVEAU : Tendances & Innovations */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>
            <Lightbulb size={18} color="#f59e0b" /> Tendances & Innovations
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{trends}</p>
        </div>

        {/* NOUVEAU : Perturbations Majeures */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>
            <Zap size={18} color="#ef4444" /> Disruptions & Enjeux Actuels
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{disruptions}</p>
        </div>

        {/* Salaire */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
              <Wallet size={18} color="#10b981" /> Baromètre des Salaires
            </h4>
            {salaryData?.confidence && (
              <span style={{ fontSize: '0.75rem', background: salaryData.confidence.toLowerCase().includes('haute') || salaryData.confidence.toLowerCase().includes('high') ? 'rgba(16, 185, 129, 0.1)' : salaryData.confidence.toLowerCase().includes('faible') || salaryData.confidence.toLowerCase().includes('low') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: salaryData.confidence.toLowerCase().includes('haute') || salaryData.confidence.toLowerCase().includes('high') ? '#10b981' : salaryData.confidence.toLowerCase().includes('faible') || salaryData.confidence.toLowerCase().includes('low') ? '#ef4444' : '#f59e0b', border: `1px solid ${salaryData.confidence.toLowerCase().includes('haute') || salaryData.confidence.toLowerCase().includes('high') ? 'rgba(16, 185, 129, 0.2)' : salaryData.confidence.toLowerCase().includes('faible') || salaryData.confidence.toLowerCase().includes('low') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, padding: '0.2rem 0.6rem', borderRadius: '1rem', fontWeight: 600 }}>
                Fiabilité : {salaryData.confidence}
              </span>
            )}
          </div>
          
          <div style={{ position: 'relative', height: '8px', background: 'var(--border-color)', borderRadius: '4px', margin: '2rem 1rem 1.5rem' }}>
            <div style={{ position: 'absolute', left: '20%', right: '15%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
            <div style={{ position: 'absolute', left: '20%', top: '-25px', transform: 'translateX(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{low}</div>
            <div style={{ position: 'absolute', left: '50%', top: '15px', transform: 'translateX(-50%)', fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{mid}</div>
            <div style={{ position: 'absolute', left: '85%', top: '-25px', transform: 'translateX(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{high}</div>
          </div>
          
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', textAlign: 'center' }}>
            {comment}
          </p>
        </div>

        {/* NOUVEAU : Paysage Concurrentiel */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, marginBottom: '1rem', color: 'var(--text-main)' }}>
            <Target size={18} color="#8b5cf6" /> Paysage Concurrentiel & Acteurs Clés
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{landscape}</p>
        </div>

        {/* NOUVEAU : Compétences les plus demandées */}
        {(skills.hard?.length > 0 || skills.soft?.length > 0) && (
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
              <Award size={18} color="#3b82f6" /> Compétences les plus prisées sur ce marché
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {skills.hard?.length > 0 && (
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Hard Skills :</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{skills.hard.map((s: string, i: number) => <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>{s}</span>)}</div>
                </div>
              )}
              {skills.soft?.length > 0 && (
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>Soft Skills :</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{skills.soft.map((s: string, i: number) => <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>{s}</span>)}</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      )}
    </DashboardCard>
  );
}