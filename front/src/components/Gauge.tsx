import { useReducer, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  showLangSelector?: boolean;
  steps?: Step[];
  currentStep?: number;
  isAuthenticated?: boolean;
  userName?: string;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  isAdmin?: boolean; // [FIX] On attend la prop du parent
  targetLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

// [EXPERT REFACTOR] Centralisation de la logique d'état avec un reducer.
// Même pour un état simple, cela prépare le terrain pour une future complexification
// et rend les transitions d'état plus explicites et maintenables.

interface HeaderState {
  isDropdownOpen: boolean;
}

type HeaderAction =
  | { type: 'open_dropdown' }
  | { type: 'close_dropdown' }
  | { type: 'toggle_dropdown' };

const headerReducer = (state: HeaderState, action: HeaderAction): HeaderState => {
  switch (action.type) {
    case 'open_dropdown': return { ...state, isDropdownOpen: true };
    case 'close_dropdown': return { ...state, isDropdownOpen: false };
    case 'toggle_dropdown': return { ...state, isDropdownOpen: !state.isDropdownOpen };
    default: return state;
  }
};

const initialState: HeaderState = { isDropdownOpen: false };

export default function Header({
  darkMode,
  setDarkMode,
  showLangSelector = true,
  userName,
  onLogout,
  onOpenProfile,
  isAdmin = false // [FIX] On reçoit le statut admin du parent
}: HeaderProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(headerReducer, initialState);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        dispatch({ type: 'close_dropdown' });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenDocuments = () => {
    dispatch({ type: 'close_dropdown' });
    navigate('/documents');
  };

  return (
    <header className="app-header">
      <div className="header-main">
        <div className="header-logo">
          <img src="/logo_reduit_BTCV.png" alt="BeyondTheCV" className="logo-img" />
        </div>

        <div className="header-actions">
          {/* Menu Langue Contrôlé */}
          {/* LanguageSelector is now part of the main app, not the header */}
          
          {userName ? (
            <div className="user-menu-container" ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => dispatch({ type: 'toggle_dropdown' })} className="user-profile-btn" title="Menu utilisateur">
                <span className="user-icon">👤</span>
                <span className="user-name">{userName}</span>
              </button>
              {state.isDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '120%', right: 0, background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', borderRadius: '8px', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', minWidth: '200px', 
                  display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000
                }}>
                  <button onClick={onOpenProfile} style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📂 Mes Dossiers
                  </button>
              {isAdmin && (
                <Link to="/admin" style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => dispatch({ type: 'close_dropdown' })}
                >
                  <span role="img" aria-label="admin">👑</span> Administration
                </Link>
              )}
                  <button 
                    onClick={() => { 
                      dispatch({ type: 'close_dropdown' }); 
                      window.dispatchEvent(new CustomEvent('open-print-modal'));
                    }} 
                    style={{ padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    📄 Imprimer mon dossier
                  </button>
                  <button 
                    onClick={() => { dispatch({ type: 'close_dropdown' }); onLogout?.(); }} 
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
            <Link to="/login" className="login-link">{t('login')}</Link>
          )}

          <button onClick={() => setDarkMode(prev => !prev)} className="dark-mode-toggle">
            {darkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </header>
  );
}