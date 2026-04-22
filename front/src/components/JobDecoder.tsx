import React from 'react';
import { Search, AlertCircle, MessageSquare, Target, ShieldAlert, Building, ArrowRight } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { FeedbackWidget } from './FeedbackWidget';

interface JobDecoderProps {
  data?: any;
  loading?: boolean;
  error?: boolean;
}

export const JobDecoder: React.FC<JobDecoderProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>
          <Search size={24} /> Décodeur d'Annonce
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="skeleton-pulse" style={{ width: '100%', height: '200px', borderRadius: '8px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="skeleton-pulse" style={{ width: '100%', height: '120px', borderRadius: '8px' }}></div>
             <div className="skeleton-pulse" style={{ width: '100%', height: '120px', borderRadius: '8px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
        <AlertCircle size={24} />
        <span>Une erreur est survenue lors du décodage de l'annonce. Veuillez vérifier que vous avez bien fourni une description de poste.</span>
      </div>
    );
  }

  const decoderData = data?.job_decoder_result || data;
  if (!decoderData || Object.keys(decoderData).length === 0) return null;

  const realityCheck = decoderData.reality_check || [];
  const realExpectations = decoderData.real_expectations || [];
  const redFlags = decoderData.red_flags || [];
  const cultureFit = decoderData.culture_fit || "";

  return (
    <div className="result-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>
        <Search size={24} /> Décodeur d'Annonce
      </h3>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
        Traduction du jargon RH en réalité opérationnelle pour déjouer les pièges de l'offre.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Reality Check (Jargon translation) */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
            <MessageSquare size={18} color="var(--primary)" /> Traduction du Jargon RH
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {realityCheck.map((item: any, idx: number) => (
              <div key={idx} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontStyle: 'italic' }}>L'annonce dit :</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>"{item.jargon}"</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <ArrowRight size={14} /> Ce que ça signifie vraiment :
                </div>
                <div style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.translation}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Real Expectations */}
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', margin: '0 0 1rem 0' }}>
              <Target size={18} /> Les vraies attentes (Non écrites)
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {realExpectations.map((exp: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '0.5rem' }} dangerouslySetInnerHTML={formatMarkdown(exp)} />
              ))}
            </ul>
          </div>

          {/* Red Flags */}
          {redFlags.length > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)', margin: '0 0 1rem 0' }}>
                <ShieldAlert size={18} /> Signaux d'alerte (Red Flags)
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                {redFlags.map((flag: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }} dangerouslySetInnerHTML={formatMarkdown(flag)} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Culture Fit */}
      {cultureFit && (
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
            <Building size={18} color="var(--primary)" /> Culture d'Entreprise Déduite
          </h4>
          <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            <span dangerouslySetInnerHTML={formatMarkdown(cultureFit)} />
          </p>
        </div>
      )}

      <FeedbackWidget feature="job_decoder" question="Cette traduction de l'annonce vous est-elle utile ?" />
    </div>
  );
}