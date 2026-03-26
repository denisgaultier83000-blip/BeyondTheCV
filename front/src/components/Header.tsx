import React from 'react';
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
  onLanguageChange
}: HeaderProps) {
  const { t } = useTranslation();

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
            <button onClick={onOpenProfile} className="user-profile-btn" title="Mes Documents">
              <span className="user-icon">👤</span>
              <span className="user-name">{userName}</span>
            </button>
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