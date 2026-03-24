import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, WithTranslation } from "react-i18next";

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Met à jour l'état pour afficher l'UI de repli au prochain rendu
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Vous pouvez aussi logger l'erreur vers un service de reporting (Sentry, etc.)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
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
            onClick={() => this.setState({ hasError: false, error: null })}
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