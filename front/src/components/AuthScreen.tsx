import React, { useState } from "react";
import { API_BASE_URL } from "../config";
import { useTranslation } from "react-i18next";

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
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh", 
      width: "100%",
      backgroundColor: "var(--bg-body)",
      color: "var(--text-main)"
    }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "30px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px", color: "var(--text-main)" }}>{t('auth_required', "Authentication Required")}</h2>
        <p style={{ textAlign: "center", marginBottom: "20px", color: "var(--text-muted)" }}>
          {t('auth_please_login', "Please log in to access the candidate interface.")}
        </p>
        
        {error && (
          <div style={{ marginBottom: 16, padding: "10px", background: "var(--error-bg)", color: "var(--error-text)", borderRadius: 8, border: "1px solid var(--error-border)", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: "8px" }}>{t('auth_email', "Email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: "8px" }}>{t('auth_password', "Password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-color)", boxSizing: "border-box" }} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>{loading ? t('auth_signing_in', "Signing in...") : t('auth_sign_in', "Sign In")}</button>
        </form>
      </div>
    </div>
  );
}