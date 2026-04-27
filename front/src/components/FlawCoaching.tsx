import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles, MessageSquare, AlertTriangle, Lightbulb, Info, AlertCircle, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

export default function FlawCoaching({ data, onBack, inline = false, loading = false }: { data: any, onBack?: () => void, inline?: boolean, loading?: boolean }) {
  const { t } = useTranslation();
  
  // [FIX CRITIQUE] Extraction robuste du tableau généré par l'IA
  let coachingList: any[] = [];
  if (Array.isArray(data)) {
    coachingList = data;
  } else if (data && typeof data === 'object') {
    const payload = data.flaw_coaching_result || data.flaw_coaching || data;
    if (Array.isArray(payload)) {
      coachingList = payload;
    } else {
      // L'IA peut utiliser d'autres clés selon la langue ou le contexte. On cherche la bonne clé, sinon le premier tableau.
      coachingList = payload.coaching || payload.flaws || payload.parades || payload.defauts || Object.values(payload).find(v => Array.isArray(v)) || [];
    }
  }

  if (loading) {
    return (
      <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', margin: '0 0 1.5rem 0' }}><Sparkles size={24} /> Parades aux Défauts</h3>
        <div className="skeleton-pulse" style={{ width: '100%', height: '150px', borderRadius: '8px' }}></div>
      </div>
    );
  }

  // Helper pour styliser l'impact du défaut
  const getImpactConfig = (level: string) => {
    switch(level?.toLowerCase()) {
      case 'high': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', label: 'Risque Critique pour ce poste', icon: <AlertTriangle size={14}/> };
      case 'medium': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', label: 'Point de vigilance modéré', icon: <AlertCircle size={14}/> };
      case 'low': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', label: 'Risque Faible / Acceptable', icon: <Info size={14}/> };
      default: return { color: 'var(--text-muted)', bg: 'var(--bg-secondary)', border: 'var(--border-color)', label: 'Impact à surveiller', icon: <Info size={14}/> };
    }
  };

  // Calcul des statistiques de risque global
  const highRiskCount = coachingList.filter((item: any) => item.impact_level?.toLowerCase() === 'high').length;
  const mediumRiskCount = coachingList.filter((item: any) => item.impact_level?.toLowerCase() === 'medium').length;
  const lowRiskCount = coachingList.filter((item: any) => item.impact_level?.toLowerCase() === 'low').length;
  const totalWithImpact = highRiskCount + mediumRiskCount + lowRiskCount;

  let globalRiskLabel = "En attente";
  let globalRiskColor = "var(--text-muted)";
  let globalRiskBg = "var(--bg-secondary)";
  let globalRiskIcon = <Info size={28} />;

  if (totalWithImpact > 0) {
    if (highRiskCount > 0) {
      globalRiskLabel = "Vigilance Maximale";
      globalRiskColor = "#ef4444";
      globalRiskBg = "rgba(239, 68, 68, 0.1)";
      globalRiskIcon = <ShieldAlert size={28} />;
    } else if (mediumRiskCount > 0) {
      globalRiskLabel = "Risque Modéré";
      globalRiskColor = "#f59e0b";
      globalRiskBg = "rgba(245, 158, 11, 0.1)";
      globalRiskIcon = <Activity size={28} />;
    } else {
      globalRiskLabel = "Risque Faible";
      globalRiskColor = "#10b981";
      globalRiskBg = "rgba(16, 185, 129, 0.1)";
      globalRiskIcon = <ShieldCheck size={28} />;
    }
  }

  const content = (
      <div style={{ background: 'var(--bg-card)', padding: inline ? '1.5rem' : '2.5rem', borderRadius: '1rem', width: '100%', maxWidth: inline ? '100%' : '850px', position: 'relative', maxHeight: inline ? 'none' : '90vh', overflowY: inline ? 'visible' : 'auto', border: '1px solid var(--border-color)', boxShadow: inline ? 'none' : '0 20px 25px -5px rgba(0,0,0,0.1)', marginTop: inline ? '0.5rem' : '0' }}>
        {!inline && onBack && <button onClick={onBack} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>}
        
        <h2 style={{ textAlign: inline ? 'left' : 'center', margin: '0 0 2rem 0', display: 'flex', alignItems: 'center', justifyContent: inline ? 'flex-start' : 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: inline ? '1.5rem' : '1.8rem' }}>
          <Sparkles size={28} color="var(--primary)" />
          Parades aux Défauts (Entretien)
        </h2>

        {totalWithImpact > 0 && (
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: globalRiskBg, color: globalRiskColor, width: '110px', height: '110px', borderRadius: '50%', border: `4px solid ${globalRiskColor}`, flexShrink: 0, boxShadow: `0 0 15px ${globalRiskBg}` }}>
               {globalRiskIcon}
               <span style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: '0.5rem', textAlign: 'center', lineHeight: 1.1, textTransform: 'uppercase' }}>{globalRiskLabel}</span>
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
               <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>Diagnostic Global pour ce poste</h3>
               <div style={{ width: '100%', height: '10px', display: 'flex', borderRadius: '5px', overflow: 'hidden', marginBottom: '1rem', background: 'var(--border-color)' }}>
                 {highRiskCount > 0 && <div style={{ width: `${(highRiskCount/totalWithImpact)*100}%`, background: '#ef4444', transition: 'width 1s ease-out' }} title={`${highRiskCount} Critique`} />}
                 {mediumRiskCount > 0 && <div style={{ width: `${(mediumRiskCount/totalWithImpact)*100}%`, background: '#f59e0b', transition: 'width 1s ease-out' }} title={`${mediumRiskCount} Modéré`} />}
                 {lowRiskCount > 0 && <div style={{ width: `${(lowRiskCount/totalWithImpact)*100}%`, background: '#10b981', transition: 'width 1s ease-out' }} title={`${lowRiskCount} Faible`} />}
               </div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                 {highRiskCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#ef4444' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}/> {highRiskCount} Risque(s) Critique(s)</span>}
                 {mediumRiskCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#f59e0b' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}/> {mediumRiskCount} Point(s) de Vigilance</span>}
                 {lowRiskCount > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#10b981' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}/> {lowRiskCount} Défaut(s) Acceptable(s)</span>}
               </div>
            </div>
          </div>
        )}

        {coachingList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
            Aucun défaut n'a été sélectionné lors de l'étape 5, l'analyse n'a donc pas été générée.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {coachingList.map((item: any, idx: number) => {
              const impact = getImpactConfig(item.impact_level);
              return (
              <div key={idx} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '1.5rem', border: `1px solid ${item.impact_level ? impact.border : 'var(--border-color)'}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                    <AlertTriangle size={22} color={impact.color} /> {item.flaw || item.defaut || item.name || "Défaut abordé"}
                  </h3>
                  {item.impact_level && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: impact.bg, color: impact.color, border: `1px solid ${impact.border}`, padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      {impact.icon} {impact.label}
                    </span>
                  )}
                </div>
                {item.impact_justification && (
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic', borderLeft: `3px solid ${impact.color}`, paddingLeft: '1rem' }}>{item.impact_justification}</p>
                )}
                
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                      <MessageSquare size={18} color="var(--primary)" /> 🗣️ Réponse Courte (Entretien)
                    </h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '1rem', fontStyle: 'italic' }}>"{item.short_answer || item.reponse_courte || item.short || item.reponse}"</p>
                  </div>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                      <Sparkles size={18} color="var(--primary)" /> 🧠 Storytelling (Réponse détaillée)
                    </h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>"{item.long_answer || item.reponse_longue || item.storytelling || item.long}"</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', fontSize: '0.95rem' }}>⚠️ Pièges à éviter</h4>
                    <p style={{ margin: 0, color: 'var(--danger-text)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.to_avoid || item.a_eviter || item.pieges || item.avoid}</p>
                  </div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lightbulb size={16} /> Le Conseil du Coach
                    </h4>
                    <p style={{ margin: 0, color: 'var(--success)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.coach_advice || item.conseil_coach || item.conseil || item.advice}</p>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

      {/* Section de Feedback (Pouces) affichée uniquement si on a des données */}
      {coachingList.length > 0 && (
        <FeedbackWidget 
          feature="parade_defauts" 
          question="Ces conseils vous sont-ils utiles ?" 
        />
      )}
      </div>
  );

  if (inline) return content;
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      {content}
    </div>
  );
}
