import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2 as LucideLoader } from 'lucide-react';
import { api, setToken } from '../api/client';

// [EXPERT REFACTOR] Création d'un hook personnalisé pour isoler la logique métier.
// Le composant devient plus simple et se concentre uniquement sur l'affichage (UI).
function useAuth(onLoginSuccess: (user: any) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApiCall = async (isLogin: boolean, data: any) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let responseData;
      if (isLogin) {
        // Login uses x-www-form-urlencoded
        const body = new URLSearchParams({ username: data.email, password: data.password });
        responseData = await api<any>('/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      } else {
        // Register uses application/json
        responseData = await api<any>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      if (isLogin) {
        setToken(responseData.access_token);
        localStorage.setItem('user', JSON.stringify(responseData.user));
        onLoginSuccess(responseData.user);
      } else {
        setSuccess('Registration successful! Please log in.');
        return true; // Indique qu'il faut basculer vers la vue de login
      }
    } catch (err: any) {
        // The 'api' client throws an error with the response text as the message
        try {
            const errorJson = JSON.parse(err.message);
            setError(errorJson.detail || 'An unknown error occurred.');
        } catch (e) {
            setError(err.message || 'An unknown error occurred.');
        }
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return { isLoading, error, success, handleApiCall };
}


interface AuthScreenProps {
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

    const data = isLoginView
      ? { email, password }
      : { email, password, first_name: firstName, last_name: lastName };

    const shouldSwitchToLogin = await handleApiCall(isLoginView, data);
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