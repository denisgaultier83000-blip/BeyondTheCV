import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth'; // Assurez-vous que le chemin est correct
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // Récupère l'état d'authentification global

  // Effet pour gérer la redirection si l'utilisateur est déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.is_admin) {
        navigate('/admin'); // Redirige vers la page admin si l'utilisateur est admin
      } else {
        navigate('/dashboard'); // Redirige vers le tableau de bord pour les utilisateurs normaux
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Appelle la fonction de connexion qui interagit avec le backend
      const response = await login(email, password);
      
      // La fonction `login` stocke déjà le token et renvoie l'objet `user`
      // Le hook `useAuth` sera mis à jour, déclenchant l'useEffect ci-dessus.
      // Pour une redirection immédiate sans attendre le re-fetch de useAuth:
      if (response.user?.is_admin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.message || t('auth_error_signin_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      <div style={{ padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--text-main)', marginBottom: '1.5rem' }}>{t('nav_login')}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '600' }}>{t('auth_email')}</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: '600' }}>{t('auth_password')}</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
          </div>
          {error && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? t('auth_signing_in') : t('auth_sign_in')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;