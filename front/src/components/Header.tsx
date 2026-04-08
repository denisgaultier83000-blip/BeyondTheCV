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
}

export default function Header({
  darkMode,
  setDarkMode,
  showLogin = false,
  showLangSelector = true,
  loginText = "Login",
  showStepper = false,
  steps = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Step ${i + 1}` })),
  currentStep = 1,
  goToStep = () => {},
  userName,
  onOpenProfile,
  onLogout,
  onLanguageChange
}: HeaderProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className={`app-header ${showStepper ? 'with-stepper' : ''}`}>
      <div className="header-main">
        <div className="header-logo">
          <img src="/logo_reduit_BTCV.png" alt="BeyondTheCV" className="logo-img" />
        </div>

        {showStepper && (
          <div className="stepper-container header-stepper">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`step-item ${currentStep >= step.id ? 'active' : ''}`}
                onClick={() => step.id <= currentStep && goToStep(step.id)}
              >
                <div className="step-circle">{step.id}</div>
                <span className="step-label">{step.title}</span>
              </div>
            ))}
          </div>
        )}

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
                  <button 
                    onClick={() => { setDropdownOpen(false); onOpenProfile?.(); }} 
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📄 Mes Productions
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