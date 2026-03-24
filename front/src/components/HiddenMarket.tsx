import React from 'react';
import { Network, Users, MessageCircle, Lightbulb } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface HiddenMarketData {
  target_profiles: { role: string; reason: string }[];
  suggested_companies: string[];
  connection_strategy: string;
  outreach_message: { subject: string; body: string };
  networking_tips: string[];
}

interface HiddenMarketProps {
  data: { hidden_market: HiddenMarketData } | null;
  loading?: boolean;
  error?: boolean;
}

export function HiddenMarket({ data, loading, error }: HiddenMarketProps) {
  const hidden_market = data?.hidden_market;

  const outreach = hidden_market?.outreach_message || { subject: "", body: "" };
  const tips = hidden_market?.networking_tips || [];

  return (
    <DashboardCard
      title="Marché Caché & Réseau"
      icon={<Network size={24} />}
      loading={loading}
      loadingText="Identification des cibles réseau..."
      error={error || (!loading && !hidden_market)}
      errorText="Analyse réseau échouée."
      featureId="hidden_market"
    >
      {hidden_market && (
        <>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Stratégie pour accéder aux 80% d'offres non publiées.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Cibles */}
        {/* [FIX] Passage en grid responsive pour éviter l'écrasement sur mobile */}
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} /> Qui contacter ?
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(hidden_market.target_profiles || []).map((p: any, i: number) => (
                <div key={i} style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{typeof p === 'string' ? p : p.role}</span>
                  {typeof p !== 'string' && p.reason && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)', opacity: 0.8 }}>{p.reason}</span>}
                </div>
              ))}
            </div>
          </div>
          
          {(hidden_market.suggested_companies || []).length > 0 && (
            <div>
               <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Entreprises Cibles</h4>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {(hidden_market.suggested_companies || []).map((company: any, i: number) => (
                   <span key={i} style={{ 
                     background: 'var(--bg-secondary)', 
                     padding: '0.25rem 0.75rem', 
                     borderRadius: '1rem', 
                     fontSize: '0.85rem', 
                     color: 'var(--text-main)',
                     border: '1px solid var(--border-color)'
                   }}>
                     {typeof company === 'string' ? company : (company.name || JSON.stringify(company))}
                   </span>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Message */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle size={16} /> Message d'approche suggéré
          </h4>
          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Objet: {outreach.subject || "Sujet"}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{outreach.body || "Contenu non disponible."}</div>
          </div>
        </div>

        {/* Tips */}
        {tips.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--success)', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
            <Lightbulb size={16} style={{ flexShrink: 0 }} />
            <div>
              {tips.map((tip: any, i: number) => <div key={i}>• {typeof tip === 'string' ? tip : (tip.text || tip.description || JSON.stringify(tip))}</div>)}
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </DashboardCard>
  );
}
