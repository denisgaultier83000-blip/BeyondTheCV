import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface AsyncBoundaryProps {
  loading?: boolean;
  error?: boolean | string;
  loadingText?: string;
  errorText?: string;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
  loading,
  error,
  loadingText = "Chargement en cours...",
  errorText = "Une erreur est survenue.",
  title,
  icon,
  children,
  className = "result-card",
  style
}) => {
  const baseStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    padding: '1.5rem',
    borderRadius: '1rem',
    border: '1px solid var(--border-color)',
    animation: 'fadeIn 0.3s ease-out',
    ...style
  };

  if (loading) {
    return (
      <div className={className} style={baseStyle}>
        {title && (
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 0, color: 'var(--text-main)' }}>
            {icon && <span style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</span>} {title}
          </h3>
        )}
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 className="spin" size={32} color="var(--primary)" />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{loadingText}</p>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    const errorMsg = typeof error === 'string' ? error : errorText;
    return (
      <div className={className} style={{ ...baseStyle, borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
        {title && (
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 0, color: 'var(--danger-text)' }}>
            {icon && <span style={{ display: 'flex' }}>{icon}</span>} {title}
          </h3>
        )}
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--danger-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={32} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};