import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginOrRegister } from '../api/authApi';
import { storageManager } from '../utils/storageManager';
import "./AuthScreen.css";


interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: loginOrRegister,
    onSuccess: (data) => {
      // La mutation a réussi, on gère les effets de bord ici
      if (data.access_token) {
        storageManager.local.setItem("token", data.access_token);
        if (data.user) {
          storageManager.local.setItem("user", JSON.stringify(data.user));
        }
        // Invalide la query 'currentUser' pour que le hook useAuth se mette à jour
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        onLoginSuccess();
      } else {
        // Lance une erreur si le token est manquant, qui sera attrapée par onError
        throw new Error("Le token d'authentification est manquant dans la réponse.");
      }
    },
    // onError est géré automatiquement par useMutation, pas besoin de try/catch
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    authMutation.mutate({
      email,
      password,
      firstName,
      lastName,
      isRegistering,
    });
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h2 className="auth-title">
          {isRegistering ? "Créer un compte" : t('auth_required', "Connexion à votre espace")}
        </h2>
        <p className="auth-subtitle">
          {isRegistering ? "Préparez vos entretiens avec un avantage stratégique." : t('auth_please_login', "Veuillez vous connecter pour accéder à votre interface candidat.")}
        </p>
        
        {authMutation.isError && (
          <div className="auth-error">
            {authMutation.error.message}
          </div>
        )}

        <form onSubmit={onSubmit}>
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
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="auth-input" placeholder="••••••••" />
              </div>
              <button type="submit" className="btn-primary auth-button" disabled={authMutation.isPending}>
                {authMutation.isPending 
                  ? (isRegistering ? "Création en cours..." : t('auth_signing_in', "Connexion...")) 
                  : (isRegistering ? "S'inscrire" : t('auth_sign_in', "Se connecter"))}
              </button>
            </>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <>
              {isRegistering ? "Vous avez déjà un compte ?" : "Nouveau sur BeyondTheCV ?"}
              <button 
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); authMutation.reset(); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem' }}
              >
                {isRegistering ? "Se connecter" : "Créer un compte"}
              </button>
            </>
        </div>
      </div>
    </div>
  );
}