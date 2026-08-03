/**
 * PackStatusWidget — bloc quota permanent affiché en haut de la page "Cible".
 * Fetche ses propres données via /cv/training/balance (indépendant du TabProvider).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Building2, FileText, Dumbbell, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

interface Quotas {
  entreprises: number;
  offres: number;
  credits: number;  // séances entraînement (on prend credits comme proxy des séances restantes)
  qa: number;
  pitch: number;
  mes: number;
  negotiation: number;
}

// Totaux pack testeur
const TOTAL_ENTREPRISES = 5;
const TOTAL_OFFRES = 15;
const TOTAL_ENTRAINEMENTS = 30;

interface Props {
  /** Appelé après chaque fetch — permet au parent d'accéder aux quotas frais */
  onQuotasLoaded?: (quotas: Quotas) => void;
  /** Permet de forcer un re-fetch depuis le parent (ex: après une analyse) */
  refreshToken?: number;
}

const PackStatusWidget: React.FC<Props> = ({ onQuotasLoaded, refreshToken }) => {
  const [quotas, setQuotas] = useState<Quotas | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuotas = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/cv/training/balance`);
      if (res.ok) {
        const data: Quotas = await res.json();
        setQuotas(data);
        onQuotasLoaded?.(data);
      }
    } catch {
      // Silencieux — le widget s'affiche juste vide
    } finally {
      setLoading(false);
    }
  }, [onQuotasLoaded]);

  useEffect(() => {
    fetchQuotas();
    // Rafraîchissement toutes les 30 secondes (pas à chaque render)
    const interval = setInterval(fetchQuotas, 30_000);
    return () => clearInterval(interval);
  }, [fetchQuotas, refreshToken]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <Loader2 size={14} className="spin" style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chargement du pack…</span>
      </div>
    );
  }

  if (!quotas) return null;

  const trainingsUsed = TOTAL_ENTRAINEMENTS - (quotas.credits ?? 0);
  const trainingsLeft = quotas.credits ?? 0;

  const items = [
    {
      icon: <Building2 size={16} />,
      label: 'Entreprises ciblées',
      used: TOTAL_ENTREPRISES - quotas.entreprises,
      total: TOTAL_ENTREPRISES,
      left: quotas.entreprises,
    },
    {
      icon: <FileText size={16} />,
      label: 'Offres préparées',
      used: TOTAL_OFFRES - quotas.offres,
      total: TOTAL_OFFRES,
      left: quotas.offres,
    },
    {
      icon: <Dumbbell size={16} />,
      label: 'Entraînements',
      used: trainingsUsed,
      total: TOTAL_ENTRAINEMENTS,
      left: trainingsLeft,
    },
  ];

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
        Votre pack Stratégique
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {items.map((item) => {
          const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;
          const color = item.left === 0 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
          return (
            <div key={item.label} style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, marginBottom: '0.3rem' }}>
                {item.icon}
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</span>
              </div>
              {/* Barre de progression */}
              <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginBottom: '0.3rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 700, color: item.left === 0 ? '#ef4444' : 'var(--text-main)' }}>{item.used}</span>
                {' sur '}
                <span style={{ fontWeight: 600 }}>{item.total}</span>
                {' utilisé' + (item.used > 1 ? 's' : '')}
                {item.left > 0 && (
                  <span style={{ marginLeft: '0.4rem', color }}> — {item.left} restant{item.left > 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.75rem',
  padding: '1rem 1.25rem',
  marginBottom: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
};

const itemStyle: React.CSSProperties = {
  flex: '1 1 140px',
  minWidth: '130px',
};

export default PackStatusWidget;
