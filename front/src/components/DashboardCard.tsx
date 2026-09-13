import React from 'react';
import { FeedbackWidget } from './FeedbackWidget';
import { AsyncBoundary } from './AsyncBoundary';

interface DashboardCardProps {
  id?: string;
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
  id, title, icon, headerAction, loading, loadingText = "Chargement en cours...",
  error, errorText = "Analyse échouée.", featureId, feedbackQuestion, feedbackBullets, jobType, children, className = "", style
}: DashboardCardProps) {
  if (!children && !loading && !error) return null;

  return (
    <AsyncBoundary
      loading={loading}
      loadingText={loadingText}
      error={error}
      errorText={errorText}
      title={title}
      icon={icon}
      className={`result-card ${className}`.trim()}
      style={style}
    >
      {children && (
        <div id={id} className={`result-card ${className}`.trim()} style={{ padding: '1.5rem', borderRadius: '1rem', position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.4s ease-out', ...style }}>
          {(title || headerAction) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: 'var(--text-main)' }}>
                {icon && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--primary)' }}>
                    {React.cloneElement(icon as React.ReactElement, { color: 'currentColor' })}
                  </span>
                )} {title}
              </h3>
              {headerAction && <div>{headerAction}</div>}
            </div>
          )}
          {children}
          {featureId && <FeedbackWidget feature={featureId} jobType={jobType} question={feedbackQuestion} negativeBullets={feedbackBullets} />}
        </div>
      )}
    </AsyncBoundary>
  );
}