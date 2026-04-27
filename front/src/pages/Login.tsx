import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface LoginProps {
  onLoginSuccess?: () => void;
  onLogin?: () => void;
}

export default function Login({ onLoginSuccess, onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // 1. Appel à la route d'inscription
        const registerRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            first_name: formData.firstName,
            last_name: formData.lastName
          })
        });

        if (!registerRes.ok) {
          const errData = await registerRes.json();
          throw new Error(errData.detail || 'Erreur lors de l\'inscription. Cet email est peut-être déjà utilisé.');
        }
      }

      // 2. Appel à la route de connexion (OAuth2 standard) pour obtenir le JWT
      const loginData = new URLSearchParams();
      loginData.append('username', formData.email);
      loginData.append('password', formData.password);

      const loginRes = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginData
      });

      if (!loginRes.ok) {
        throw new Error('Identifiants incorrects.');
      }

      const tokenData = await loginRes.json();
      
      // 3. Sauvegarde de la session
      localStorage.setItem('token', tokenData.access_token);
      localStorage.setItem('user', JSON.stringify({
        name: formData.firstName || 'Candidat',
        email: formData.email,
        subscription_status: 'active' // Remplacé par la vraie valeur venant du backend idéalement
      }));

      if (onLoginSuccess) onLoginSuccess(); // Notifie App.tsx du succès
      if (onLogin) onLogin(); // Notifie main.tsx du succès

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            {isRegister ? 'Créer un compte' : 'Bon retour'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isRegister ? 'Rejoignez BeyondTheCV pour propulser votre carrière.' : 'Connectez-vous pour accéder à votre tableau de bord.'}
          </p>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderRadius: '0.5rem' }}>
            <AlertCircle size={18} color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {isRegister && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Prénom</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="input-field" placeholder="Jean" />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Nom</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="input-field" placeholder="Dupont" />
              </div>
            </div>
          )}

          <div className="input-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Adresse Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-field" placeholder="jean.dupont@email.com" style={{ paddingLeft: '2.75rem', width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="password" name="password" value={formData.password} onChange={handleChange} required className="input-field" placeholder="••••••••" style={{ paddingLeft: '2.75rem', width: '100%', boxSizing: 'border-box' }} minLength={6} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            {loading ? <Loader2 size={18} className="spin" /> : (isRegister ? 'S\'inscrire' : 'Se connecter')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            {isRegister ? 'Vous avez déjà un compte ?' : 'Nouveau sur BeyondTheCV ?'}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="btn-link" style={{ marginLeft: '0.5rem', fontWeight: 600 }}>
              {isRegister ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}