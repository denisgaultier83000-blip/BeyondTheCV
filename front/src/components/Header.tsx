import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';
import LanguageSelector from './LanguageSelector';

export interface Step {
  id: number;
  title: string;
}

interface HeaderProps {
  // [FIX] Ajout des propriétés manquantes pour satisfaire TypeScript
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  showLogin?: boolean;
  showLangSelector?: boolean;
  loginText?: string;
  showStepper?: boolean;
  steps?: Step[];
  currentStep?: number;
  goToStep?: (stepId: number) => void;
  userName?: string;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onLanguageChange?: (lang: string) => void;
  isAuthenticated?: boolean;
  targetLanguage?: string;
}

export default function Header({
  darkMode,
  setDarkMode,
  showLogin = false,
  showLangSelector = true,
  loginText = "Login",
  userName,
  onOpenProfile,
  onLogout,
  onLanguageChange,
  isAuthenticated
}: HeaderProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> staging4
  // [CORRECTIF FINAL] Vérification locale et directe du statut admin.
  // On abandonne le contexte pour cette logique pour garantir la fiabilité.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const adminEmail = import.meta.env.VITE_REACT_APP_ADMIN_EMAIL;
      if (userStr && adminEmail) {
        const user = JSON.parse(userStr);
        setIsAdmin(user?.email?.toLowerCase() === adminEmail.toLowerCase());
<<<<<<< HEAD
      }
    } catch (e) {}
  }, [userName]); // On recalcule si l'utilisateur change (login/logout)

>>>>>>> parent of e044586 (fix: Update admin status handling in Header component to reset state when user is not present)
=======
      } else {
        setIsAdmin(false); // S'assurer de réinitialiser si l'utilisateur n'est plus là
      }
    } catch (e) { setIsAdmin(false); }
  }, [userName, isAuthenticated]); // [FIX] On recalcule si l'utilisateur change OU si le statut d'authentification change.

>>>>>>> staging4
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="header-main">
        <div className="header-logo">
          <img src="/logo_reduit_BTCV.png" alt="BeyondTheCV" className="logo-img" />
        </div>

        <div className="header-actions">
          {/* Menu Langue Contrôlé */}
          {showLangSelector && <LanguageSelector 
            onChange={onLanguageChange}
            style={{ marginRight: "10px" }}
          />}
          
          {userName ? (
            <div className="user-menu-container" ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="user-profile-btn" title="Menu utilisateur">
                <span className="user-icon">👤</span>
                <span className="user-name">{userName}</span>
              </button>
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: '120%', right: 0, background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', borderRadius: '8px', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', minWidth: '200px', 
                  display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000
                }}>
              {isAdmin && (
                <Link to="/admin" style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setDropdownOpen(false)}
                >
                  👑 Administration
                </Link>
              )}
                  <button 
                    onClick={() => { 
                      setDropdownOpen(false); 
                      window.dispatchEvent(new Event('open-print-modal'));
                      if (onOpenProfile) onOpenProfile(); 
                    }} 
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📄 Imprimer mon dossier
                  </button>
                  <button 
                    onClick={() => { setDropdownOpen(false); onLogout?.(); }} 
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪 Déconnexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            showLogin && <Link to="/login" className="login-link">{t('login')}</Link>
          )}

          <button onClick={() => setDarkMode(prev => !prev)} className="dark-mode-toggle">
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}