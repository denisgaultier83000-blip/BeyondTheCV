import React, { useState } from "react";
import { API_BASE_URL } from "../config";
import { useTranslation } from "react-i18next";
import "./AuthScreen.css";

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("secret");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || t('auth_error_signin_failed', "Sign-in failed"));
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message ?? t('auth_error_signin_failed', "Sign-in failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h2 className="auth-title">{t('auth_required', "Authentication Required")}</h2>
        <p className="auth-subtitle">
          {t('auth_please_login', "Please log in to access the candidate interface.")}
        </p>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="auth-form-group">
            <label className="auth-label">{t('auth_email', "Email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" />
          </div>
          <div className="auth-form-group" style={{marginBottom: 24}}>
            <label className="auth-label">{t('auth_password', "Password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" />
          </div>
          <button type="submit" className="btn-primary auth-button" disabled={loading}>{loading ? t('auth_signing_in', "Signing in...") : t('auth_sign_in', "Sign In")}</button>
        </form>
      </div>
    </div>
  );
}