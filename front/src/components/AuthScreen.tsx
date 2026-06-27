import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2 as LucideLoader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// [EXPERT REFACTOR] Création d'un hook personnalisé pour isoler la logique métier.
// Le composant devient plus simple et se concentre uniquement sur l'affichage (UI).
function useAuth(onLoginSuccess: (user: any) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApiCall = async (url: string, body: any, headers: any, isLogin: boolean) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(url, { method: 'POST', headers, body });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'An unknown error occurred.');
      }

      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setSuccess('Registration successful! Please log in.');
        return true; // Indique qu'il faut basculer vers la vue de login
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return { isLoading, error, success, handleApiCall };
}


interface AuthScreenProps {
  // [FIX] The onLoginSuccess prop now expects a function that receives the user object.
  onLoginSuccess: (user: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { t } = useTranslation();
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Le composant utilise maintenant le hook pour sa logique.
  const { isLoading, error, success, handleApiCall } = useAuth(onLoginSuccess);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = isLoginView ? `${API_URL}/auth/token` : `${API_URL}/auth/register`;
    const body = isLoginView
      ? new URLSearchParams({ username: email, password: password })
      : JSON.stringify({ email, password, first_name: firstName, last_name: lastName });

    const headers = isLoginView
      ? { 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/json' };

    const shouldSwitchToLogin = await handleApiCall(url, body, headers, isLoginView);
    if (shouldSwitchToLogin) {
      setIsLoginView(true);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{isLoginView ? t('auth_login_title', 'Login') : t('auth_register_title', 'Create Account')}</h2>
        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <>
              <input type="text" placeholder={t('auth_firstname', 'First Name')} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <input type="text" placeholder={t('auth_lastname', 'Last Name')} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </>
          )}
          <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? <><LucideLoader className="spinner" /> {t('auth_loading', 'Processing...')}</> : (isLoginView ? t('auth_login_button', 'Login') : t('auth_register_button', 'Register'))}
          </button>
        </form>
        <div className="auth-footer">
          {isLoginView ? (
            <>
              <Link to="/reset-password">{t('auth_forgot_password', 'Forgot Password?')}</Link>
              <p>{t('auth_no_account', "Don't have an account?")} <button onClick={() => setIsLoginView(false)}>{t('auth_register_now', 'Register')}</button></p>
            </>
          ) : (
            <p>{t('auth_has_account', 'Already have an account?')} <button onClick={() => setIsLoginView(true)}>{t('auth_login_now', 'Login')}</button></p>
          )}
        </div>
      </div>
    </div>
  );
}
