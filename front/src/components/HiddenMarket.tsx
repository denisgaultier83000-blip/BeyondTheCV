import React from 'react';
import { Network, Users, MessageCircle, Lightbulb, AlertCircle, Compass } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

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
  if (error) {
    return (
      <div className="error-box" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        <AlertCircle size={24} />
        <span>Une erreur est survenue lors de l'analyse du marché caché et réseau. Veuillez réessayer.</span>
      </div>
    );
  }

  // Résolution robuste (Support de l'encapsulation IA)
  const hidden_market: any = data && 'hidden_market' in data ? data.hidden_market : data;
  if (loading || !hidden_market || Object.keys(hidden_market).length === 0) return null;

  const outreach = hidden_market.outreach_message || { subject: "", body: "" };
  const tips = hidden_market.networking_tips || [];
  const strategy = hidden_market.connection_strategy || "";

  return (
    <>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        Stratégie pour accéder aux offres non publiées (qui représentent jusqu'à 80% du marché).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Colonne Gauche : Cibles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Stratégie Globale */}
          {strategy && (
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={18} /> Approche Recommandée
              </h4>
              <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>{strategy}</p>
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--primary)" /> Profils à cibler en priorité
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(hidden_market.target_profiles || []).map((p: any, i: number) => (
                <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem' }}>{typeof p === 'string' ? p : p.role}</div>
                  {typeof p !== 'string' && p.reason && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pourquoi : {p.reason}</div>}
                </div>
              ))}
            </div>
          </div>
          
          {(hidden_market.suggested_companies || []).length > 0 && (
            <div>
               <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Entreprises Suggérées</h4>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {(hidden_market.suggested_companies || []).map((company: any, i: number) => (
                   <span key={i} style={{ 
                     background: 'var(--bg-secondary)', 
                     padding: '0.5rem 1rem', 
                     borderRadius: '2rem', 
                     fontSize: '0.85rem', 
                     color: 'var(--text-main)',
                     border: '1px solid var(--border-color)',
                     fontWeight: 500
                   }}>
                     {typeof company === 'string' ? company : (company.name || JSON.stringify(company))}
                   </span>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Colonne Droite : Message & Tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={18} color="var(--primary)" /> Message d'approche (Modèle)
            </h4>
            <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px dashed var(--border-color)', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Objet :</span> {outreach.subject || "Prise de contact"}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{outreach.body || "Contenu non disponible."}</div>
            </div>
          </div>

          {tips.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)', padding: '1.25rem', borderRadius: '0.75rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lightbulb size={18} color="#a78bfa" /> Conseils de Networking
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {tips.map((tip: any, i: number) => (
                  <li key={i} style={{ marginBottom: '0.5rem' }}>
                    {typeof tip === 'string' ? tip : (tip.text || tip.description || JSON.stringify(tip))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
