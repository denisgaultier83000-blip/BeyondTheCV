import React from 'react';
import { useTranslation } from 'react-i18next';

interface SalaryModalProps {
  data: any;
  onClose: () => void;
  lang?: string;
}

const SalaryModal: React.FC<SalaryModalProps> = ({ data, onClose, lang }) => {
  if (!data) return null;
  const { t } = useTranslation();

  const { min, max, currency, commentary } = data;

  // Helper pour formater la devise
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const avg = (min + max) / 2;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '1rem', backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1rem', width: '90%', maxWidth: '600px', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid var(--border-color)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <button 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
        >
            ✕
        </button>
        
		<h2 style={{ textAlign: 'center', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>{t('salary_title', 'Baromètre des Salaires')}</h2>
		<p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>{t('salary_subtitle', 'Estimation basée sur votre profil et le marché')}</p>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>{t('salary_min', 'Fourchette basse')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                    {formatCurrency(min)}
                </div>
            </div>
            
            <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
                <div style={{ fontSize: '2rem', color: '#cbd5e1' }}>-</div>
            </div>

            <div style={{ textAlign: 'center' }}>
				<div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>{t('salary_min', 'Fourchette basse')}</div>
				<div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                    {formatCurrency(max)}
                </div>
            </div>
        </div>

      <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)', marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('salary_avg', 'Médiane Estimée')}</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>
                {formatCurrency(avg)}
            </div>
        </div>

        {commentary && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{t('salary_analysis', 'Analyse IA')}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-muted)', textAlign: 'justify' }}>
                     {commentary}
                </p>
            </div>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '0.75rem 2.5rem', fontSize: '1rem' }}>
              {t('btn_close', 'Fermer')}
           </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryModal;