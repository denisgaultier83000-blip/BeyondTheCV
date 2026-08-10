import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Header.css';
import LanguageSelector from './LanguageSelector';

export interface Step {
  id: number;
  title: string;
}

interface TargetNode {
  company: string;
  jobs: string[];
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
  onOpenRemainingSessions?: () => void;
  onLogout?: () => void;
  onLanguageChange?: (lang: string) => void;
  isAuthenticated?: boolean;
  targetLanguage?: string;
  remainingSessions?: number;
  remainingCompanies?: number;
  remainingOffers?: number;
  onboardingCompleted?: boolean;
  onStartNewCompany?: () => void;
  onStartNewApplication?: () => void;
  targetTree?: TargetNode[];
  onSelectTargetNode?: (company: string, job?: string) => void;
}

export default function Header({
  darkMode,
  setDarkMode,
  showLogin = false,
  showLangSelector = true,
  loginText = "Login",
  userName,
  onOpenProfile,
  onOpenRemainingSessions,
  onLogout,
  onLanguageChange,
  isAuthenticated,
  remainingSessions,
  remainingCompanies,
  remainingOffers,
  onboardingCompleted = false,
  onStartNewCompany,
  onStartNewApplication,
  targetTree = [],
  onSelectTargetNode,
  steps = [],
  currentStep = 0,
  goToStep,
}: HeaderProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCompanies = 5;
  const totalOffers = 15;
  const treeCompaniesUsed = targetTree.length;
  const treeOffersUsed = targetTree.reduce((sum, node) => sum + (Array.isArray(node.jobs) ? node.jobs.length : 0), 0);
  const companiesUsed = treeCompaniesUsed > 0 ? treeCompaniesUsed : Math.max(0, totalCompanies - (Number.isFinite(remainingCompanies) ? Math.max(0, Number(remainingCompanies)) : 0));
  const offersUsed = treeOffersUsed > 0 ? treeOffersUsed : Math.max(0, totalOffers - (Number.isFinite(remainingOffers) ? Math.max(0, Number(remainingOffers)) : 0));
  const companiesLeft = Math.max(0, totalCompanies - companiesUsed);
  const offersLeft = Math.max(0, totalOffers - offersUsed);

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
      } else {
        setIsAdmin(false); // S'assurer de réinitialiser si l'utilisateur n'est plus là
      }
    } catch (e) { setIsAdmin(false); }
  }, [userName, isAuthenticated]); // [FIX] On recalcule si l'utilisateur change OU si le statut d'authentification change.

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
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenRemainingSessions?.();
                    }}
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🎯 Mes séances restantes : {Number.isFinite(remainingSessions) ? remainingSessions : '—'}
                  </button>
                  <div
                    className="header-quotas-mobile-only"
                    style={{
                      padding: '0.65rem 1rem',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      background: 'var(--bg-secondary)'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Entreprises ciblées</div>
                    <div>{companiesUsed} sur {totalCompanies} utilisé{companiesUsed > 1 ? 's' : ''} — {companiesLeft} restant{companiesLeft > 1 ? 's' : ''}</div>
                    <div style={{ fontWeight: 700, marginTop: '0.45rem', marginBottom: '0.2rem' }}>Offres préparées</div>
                    <div>{offersUsed} sur {totalOffers} utilisé{offersUsed > 1 ? 's' : ''} — {offersLeft} restant{offersLeft > 1 ? 's' : ''}</div>
                  </div>
                  <button 
                    onClick={() => { setDropdownOpen(false); onLogout?.(); }} 
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪 Déconnexion
                  </button>

                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.65rem 1rem', background: 'var(--bg-secondary)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Mon profil</div>
                    <div style={{ display: 'grid', gap: '0.3rem' }}>
                      {steps.filter((s) => s.id !== 0).map((step) => (
                        <button
                          key={step.id}
                          onClick={() => {
                            setDropdownOpen(false);
                            if (goToStep) goToStep(step.id);
                          }}
                          style={{
                            textAlign: 'left',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            background: step.id === currentStep ? 'var(--bg-card)' : 'transparent',
                            padding: '0.35rem 0.45rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-main)'
                          }}
                        >
                          {step.id}. {step.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {onboardingCompleted && (
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.65rem 1rem', background: 'var(--bg-card)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Mes cibles</div>
                      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <button onClick={() => { setDropdownOpen(false); onStartNewCompany?.(); }} className="btn-outline" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>+ Entreprise</button>
                        <button onClick={() => { setDropdownOpen(false); onStartNewApplication?.(); }} className="btn-primary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>+ Candidature</button>
                      </div>
                      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '0.35rem' }}>
                        {targetTree.length === 0 ? (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Aucune cible enregistree.</div>
                        ) : targetTree.map((node, idx) => (
                          <details key={`${node.company}-${idx}`}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-main)' }}>{node.company} ({node.jobs.length})</summary>
                            <div style={{ marginTop: '0.3rem', display: 'grid', gap: '0.25rem' }}>
                              <button
                                onClick={() => { setDropdownOpen(false); onSelectTargetNode?.(node.company); }}
                                style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', padding: '0.28rem 0.4rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-main)' }}
                              >
                                Ouvrir les candidatures
                              </button>
                              {node.jobs.map((job, jdx) => (
                                <button
                                  key={`${job}-${jdx}`}
                                  onClick={() => { setDropdownOpen(false); onSelectTargetNode?.(node.company, job); }}
                                  style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', padding: '0.28rem 0.4rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-main)' }}
                                >
                                  {job}
                                </button>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
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