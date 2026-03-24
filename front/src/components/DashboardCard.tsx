import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

interface DashboardCardProps {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  error?: boolean | string;
  errorText?: string;
  featureId?: string;
  feedbackQuestion?: string;
  feedbackBullets?: string[];
  jobType?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DashboardCard({
  title, icon, headerAction, loading, loadingText = "Chargement en cours...",
  error, errorText = "Analyse échouée.", featureId, feedbackQuestion, feedbackBullets, jobType, children, className = "", style
}: DashboardCardProps) {
  if (error) {
    return (
      <div className={`result-card ${className}`} style={{ borderColor: 'var(--error-border)', background: 'var(--error-bg)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--error-border)', ...style }}>
        {title && (
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: 'var(--error-text)' }}>
            {icon} {title}
          </h3>
        )}
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--error-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <XCircle size={32} />
          <p style={{ margin: 0 }}>{typeof error === 'string' ? error : errorText}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`result-card ${className}`} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', ...style }}>
        {title && (
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: 'var(--text-main)' }}>
            {icon && React.cloneElement(icon as React.ReactElement, { color: 'var(--primary)' })} {title}
          </h3>
        )}
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 className="spin" size={32} color="var(--primary)" />
          <p style={{ margin: 0 }}>{loadingText}</p>
        </div>
      </div>
    );
  }

  if (!children) return null;

  return (
    <div className={`result-card ${className}`} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', ...style }}>
      {(title || headerAction) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--text-main)' }}>
            {icon && React.cloneElement(icon as React.ReactElement, { color: 'var(--primary)' })} {title}
          </h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
      {featureId && <FeedbackWidget feature={featureId} jobType={jobType} question={feedbackQuestion} negativeBullets={feedbackBullets} />}
    </div>
  );
}