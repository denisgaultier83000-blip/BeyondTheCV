import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import './AuthScreen.css'; // On réutilise le CSS existant de l'écran de login

export default function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Extraction automatique du token de sécurité depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    setToken(urlToken);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères pour être sécurisé.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Erreur lors de la réinitialisation. Le lien est peut-être expiré.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Si l'utilisateur arrive sur la page sans token dans l'URL
  if (!token) {
    return (
      <div className="auth-screen">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <AlertTriangle size={48} color="var(--danger-text)" style={{ margin: '0 auto 1rem' }} />
          <h2 className="auth-title">Lien invalide</h2>
          <p className="auth-subtitle">Ce lien de réinitialisation est introuvable ou mal formaté.</p>
          <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem', width: '100%' }}>Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <h2 className="auth-title">Nouveau mot de passe</h2>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              Votre mot de passe a été mis à jour avec succès !
            </p>
            <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', width: '100%' }}>
              Se connecter
            </a>
          </div>
        ) : (
          <>
            <p className="auth-subtitle">Veuillez saisir votre nouveau mot de passe (8 caractères minimum).</p>
            
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label className="auth-label">Nouveau mot de passe</label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="auth-input" 
                  placeholder="••••••••" 
                />
              </div>
              <div className="auth-form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="auth-label">Confirmer le mot de passe</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="auth-input" 
                  placeholder="••••••••" 
                />
              </div>
              <button type="submit" className="btn-primary auth-button" disabled={loading}>
                {loading ? "Mise à jour en cours..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}