import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, WithTranslation } from "react-i18next";

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour afficher l'UI de repli au prochain rendu
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Vous pouvez aussi logger l'erreur vers un service de reporting (Sentry, etc.)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      // En mode développement, on affiche une erreur détaillée pour le débogage.
      if (import.meta.env.DEV) {
        return (
          <div style={{ margin: '1rem', padding: '1.5rem', background: 'var(--bg-secondary)', border: '2px solid var(--danger-text)', borderRadius: '1rem', color: 'var(--text-main)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            <h2 style={{ color: 'var(--danger-text)', marginTop: 0 }}>💥 Erreur d'affichage interceptée</h2>
            <details open style={{ marginBottom: '1rem' }}>
              <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>{this.state.error?.toString()}</summary>
              <p style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                {this.state.error?.stack}
              </p>
            </details>
            <details>
              <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>Pile des composants React</summary>
              <p style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                {this.state.errorInfo?.componentStack}
              </p>
            </details>
            <button className="btn-secondary" onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} style={{ marginTop: '1.5rem' }}>
              Tenter de réinitialiser
            </button>
          </div>
        );
      }

      // En production, on affiche une UI de repli générique.
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // UI de repli par défaut
      return (
        <div style={{ 
          padding: "20px", 
          margin: "20px", 
          border: "1px solid var(--danger-text)", 
          borderRadius: "8px", 
          backgroundColor: "var(--error-bg)",
          color: "var(--danger-text)",
          textAlign: "center"
        }}>
          <h3>{t('error_boundary_unexpected_error')}</h3>
          <p style={{ fontSize: "0.9em" }}>{this.state.error?.message}</p>
          <button 
            className="btn-secondary" 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{ marginTop: "10px" }}
          >
            {t('error_boundary_retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);