import React, { useState } from "react";
import { API_BASE_URL } from "../config";
import { useTranslation } from "react-i18next";
import "./AuthScreen.css";

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // [ONBOARDING FLUIDE] 0. Réinitialisation du mot de passe
      if (isForgotPassword) {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.status === 404) {
          throw new Error("La récupération par email est en cours de configuration. Veuillez contacter le support.");
        }
        setResetSent(true);
        return;
      }

      // [ONBOARDING FLUIDE] 1. Si nouveau, on le crée d'abord
      if (isRegistering) {
        const regRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email, password, first_name: firstName, last_name: lastName
          }),
        });
        if (!regRes.ok) {
          const errData = await regRes.json().catch(() => ({}));
          throw new Error(errData.detail || "La création du compte a échoué. Cet email est peut-être déjà utilisé.");
        }
      }

      // [ONBOARDING FLUIDE] 2. On le connecte (soit il vient d'être créé, soit c'est un login classique)
      // [FIX EXPERT] Utilisation du format URL-encoded requis par OAuth2PasswordRequestForm
      const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || t('auth_error_signin_failed', "Identifiants incorrects"));
      }

      const data = await response.json();
      // [FIX EXPERT] Le backend renvoie 'access_token', pas 'token'
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message ?? t('auth_error_signin_failed', "L'action a échoué. Veuillez réessayer."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h2 className="auth-title">
          {isForgotPassword ? "Mot de passe oublié" : isRegistering ? "Créer un compte" : t('auth_required', "Connexion à votre espace")}
        </h2>
        <p className="auth-subtitle">
          {isForgotPassword ? "Saisissez votre email pour recevoir un lien de réinitialisation." : isRegistering ? "Préparez vos entretiens avec un avantage stratégique." : t('auth_please_login', "Veuillez vous connecter pour accéder à votre interface candidat.")}
        </p>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {isForgotPassword ? (
            <>
              <div className="auth-form-group" style={{marginBottom: 24}}>
                <label className="auth-label">{t('auth_email', "Email")}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" placeholder="vous@email.com" />
              </div>
              {resetSent && (
                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(34, 197, 94, 0.2)', textAlign: 'center', lineHeight: 1.5 }}>
                  Si ce compte existe, un email contenant les instructions vient de vous être envoyé.
                </div>
              )}
              <button type="submit" className="btn-primary auth-button" disabled={loading || resetSent}>
                {loading ? "Envoi en cours..." : (resetSent ? "Email envoyé" : "Envoyer le lien")}
              </button>
            </>
          ) : (
            <>
              {isRegistering && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="auth-form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="auth-label">Prénom</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="auth-input" placeholder="Ex: Jean" />
                  </div>
                  <div className="auth-form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="auth-label">Nom</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="auth-input" placeholder="Ex: Dupont" />
                  </div>
                </div>
              )}

              <div className="auth-form-group">
                <label className="auth-label">{t('auth_email', "Email")}</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="auth-input" placeholder="vous@email.com" />
              </div>
              <div className="auth-form-group" style={{marginBottom: 24}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="auth-label">{t('auth_password', "Password")}</label>
                  {!isRegistering && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setError(null); setResetSent(false); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>
                      Oublié ?
                    </button>
                  )}
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="••••••••" />
              </div>
              <button type="submit" className="btn-primary auth-button" disabled={loading}>
                {loading 
                  ? (isRegistering ? "Création en cours..." : t('auth_signing_in', "Connexion...")) 
                  : (isRegistering ? "S'inscrire" : t('auth_sign_in', "Se connecter"))}
              </button>
            </>
          )}
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isForgotPassword ? (
            <button 
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(null); setResetSent(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              Retour à la connexion
            </button>
          ) : (
            <>
              {isRegistering ? "Vous avez déjà un compte ?" : "Nouveau sur BeyondTheCV ?"}
              <button 
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
              >
                {isRegistering ? "Se connecter" : "Créer un compte"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}