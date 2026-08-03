/**
 * ConfirmAnalysisModal — modal affiché juste avant le lancement d'une analyse.
 * Explique le coût réel calculé côté backend et demande confirmation.
 */
import React from 'react';
import { Building2, FileText, Dumbbell, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Quotas {
  entreprises: number;
  offres: number;
  credits: number;
}

interface AnalysisPreview {
  company_cached: boolean;
  offer_cached: boolean;
  costs: {
    entreprises: number;
    offres: number;
  };
}

interface Props {
  companyName: string;
  quotas: Quotas;
  preview: AnalysisPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmAnalysisModal: React.FC<Props> = ({ companyName, quotas, preview, onConfirm, onCancel }) => {
  const companyCached = preview.company_cached;
  const offerCached = preview.offer_cached;
  const costsEntreprise = preview.costs.entreprises;
  const costsOffre = preview.costs.offres;

  const afterEntreprises = quotas.entreprises - costsEntreprise;
  const afterOffres = quotas.offres - costsOffre;

  const canAfford = (costsEntreprise === 0 || quotas.entreprises >= costsEntreprise) && (costsOffre === 0 || quotas.offres >= costsOffre);

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Titre */}
        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
          {companyCached
            ? `Ajouter une nouvelle offre chez ${companyName}`
            : `Analyser ${companyName || 'cette cible'}`}
        </h3>

        <>
          {(companyCached || offerCached) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {companyCached && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem' }}>
                  <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    L'analyse de {companyName} existe déjà — aucun crédit entreprise utilisé.
                  </span>
                </div>
              )}
              {offerCached && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem' }}>
                  <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
                    L'analyse de l'offre existe déjà ou ne nécessite aucun nouveau crédit offre.
                  </span>
                </div>
              )}
            </div>
          )}

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Cette action utilisera</div>
            <CostRow
              icon={<Building2 size={14} />}
              label="analyse d'entreprise"
              cost={costsEntreprise}
              zero={companyCached}
            />
            <CostRow
              icon={<FileText size={14} />}
              label="analyse d'offre"
              cost={costsOffre}
              zero={offerCached}
            />
          </div>

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Après validation, il vous restera</div>
            <AfterRow
              icon={<Building2 size={14} />}
              label={`nouvelle${afterEntreprises > 1 ? 's' : ''} entreprise${afterEntreprises > 1 ? 's' : ''}`}
              count={Math.max(afterEntreprises, 0)}
              danger={afterEntreprises <= 0 && costsEntreprise > 0}
            />
            <AfterRow
              icon={<FileText size={14} />}
              label={`nouvelle${afterOffres > 1 ? 's' : ''} offre${afterOffres > 1 ? 's' : ''}`}
              count={Math.max(afterOffres, 0)}
              danger={afterOffres <= 0 && costsOffre > 0}
            />
            <AfterRow
              icon={<Dumbbell size={14} />}
              label={`entraînement${quotas.credits !== 1 ? 's' : ''}`}
              count={quotas.credits}
              danger={quotas.credits <= 0}
            />
          </div>

          {!canAfford && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                Quota insuffisant. Vous ne pouvez pas lancer cette analyse.
              </span>
            </div>
          )}
        </>

        {/* Boutons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn-outline" onClick={onCancel} style={{ fontSize: '0.9rem' }}>
            Annuler
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={!canAfford}
            style={{ fontSize: '0.9rem', opacity: !canAfford ? 0.5 : 1 }}
          >
            {companyCached && !offerCached ? 'Analyser cette offre' : 'Confirmer l\'analyse'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sous-composants ───────────────────────────────────────────────────────────

const CostRow = ({
  icon, label, cost, zero,
}: { icon: React.ReactNode; label: string; cost: number; zero?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.88rem', color: 'var(--text-main)' }}>
    <span style={{ color: zero ? 'var(--text-muted)' : 'var(--primary)' }}>{icon}</span>
    <span style={{ textDecoration: zero ? 'line-through' : undefined, color: zero ? 'var(--text-muted)' : undefined }}>
      {zero ? 'aucune' : `${cost}`} {label} {zero ? '(réutilisée)' : ''}
    </span>
  </div>
);

const AfterRow = ({
  icon, label, count, danger,
}: { icon: React.ReactNode; label: string; count: number; danger: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.88rem' }}>
    <span style={{ color: danger ? '#ef4444' : 'var(--text-muted)' }}>{icon}</span>
    <span style={{ fontWeight: 700, color: danger ? '#ef4444' : 'var(--text-main)' }}>{count}</span>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

// ─── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '1rem',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '440px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.6rem',
  padding: '0.75rem 1rem',
  marginBottom: '0.75rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
};

export default ConfirmAnalysisModal;
