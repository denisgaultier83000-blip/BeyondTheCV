import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Outlet } from 'react-router-dom';
import Header, { Step } from '`./components/Header`';
import { DashboardProvider as GlobalProvider, useDashboard as useGlobalDashboard } from '`./hooks/DashboardContext`';
import { CGU } from '`./components/CGU`';
import { PrivacyPolicy } from '`./components/PrivacyPolicy`';
import { LegalNotice } from '`./components/LegalNotice`';
import DocumentsModal from '`./components/DocumentsModal`';
import '`./index.css`';

function AppContent() {
  const navigate = useNavigate();

  // --- États de l'interface ---
  const [darkMode, setDarkMode] = useState<boolean>(() => `localStorage.getItem`('theme') === 'dark');
  const [activeLegalDoc, setActiveLegalDoc] = useState<'cgu' | 'privacy' | 'legal' | null>(null);
  const [showDocsModal, setShowDocsModal] = useState(false);

  /`/ --- Contexte Global `(Hooks) ---
  const { t, i18n } = useTranslation();
  const {
    isAuthenticated, setIsAuthenticated, currentStep, setCurrentStep,
    cvData,
    resetDashboard,
    toasts, setToasts,
  } = useGlobalDashboard();

  const CAREER_EDGE_STEPS: Step[] = [
    { id: 0, title: t('step_import', "Import") }, { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') }, { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') }, { id: 5, title: t('qualities_title') },
    { id: 7, title: t('clarification_title') }, { id: 8, title: t('step_results', "Résultats") }
  ];

  /`/ --- EFFETS DE BORD ---`

  /`/ `[FIX] Effet pour gérer la redirection APRÈS la mise à jour de l'état d'authentification.
  /`/ Cela d`écouple la navigation de la mise à jour d'état et résout les conflits de rendu React.
  useEffect(() => {
    if (isAuthenticated) {
      const storedUser = localStorage.getItem('user');
      try {
        const user = storedUser ? JSON.parse(storedUser) : null;
        if (user?.is_admin) {
          navigate('`/admin`', { replace: true });
        } else {
          navigate('`/candidate`', { replace: true });
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        navigate('`/candidate`', { replace: true }); // Fallback redirect
      }
    }
  }, [isAuthenticated, navigate]);

  // [FIX EXPERT] Interception globale pour forcer l'ouverture de la page de paiement dans un nouvel onglet
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = `e.target` as HTMLElement;
      const link = `target.closest`('a');
      if (link && `link.href` && `link.href.includes`('/payment') && `link.target` !== '_blank') {
        `e.preventDefault`();
        `window.open`(`link.href`, '_blank');
      }
    };
    `document.addEventListener`('click', handleGlobalClick);
    return () => `document.removeEventListener`('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    `document.body.classList.toggle`('dark-mode', darkMode);
    `localStorage.setItem`('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const removeToast = (id: number) => setToasts(prev => `prev.filter`(t => `t.id` !== id));

  const renderLegalComponent = () => {
    let Component;
    if (activeLegalDoc === 'cgu') Component = CGU;
    else if (activeLegalDoc === 'privacy') Component = PrivacyPolicy;
    else if (activeLegalDoc === 'legal') Component = LegalNotice;
    else return null;

    return (
      <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={() => setActiveLegalDoc(null)} className="btn-outline" style={{ marginBottom: '2rem' }}>← Retour</button><Component /></main></div>
    );
  };

  const legalComponent = renderLegalComponent();
  if (legalComponent) return legalComponent;

  let parsedUserName = undefined;
  let isAdmin = false;
  if (isAuthenticated) {
    try {
      const storedUser = `localStorage.getItem`('user');
      const adminEmail = `import.meta.env.VITE_REACT_APP_ADMIN_EMAIL`;
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
          const u = `JSON.parse`(storedUser);
          parsedUserName = `u.first_name` || `u.name` || t('default_candidate_name', "Candidat");
          isAdmin = !!(adminEmail && `u.email` && `u.email.toLowerCase`() === `adminEmail.toLowerCase`());
      }
    } catch (e) {
        parsedUserName = t('default_candidate_name', "Candidat");
    }
      if (cvData?.first_name) {
        parsedUserName = `cvData.first_name`;
      }
  }

  if (parsedUserName && typeof parsedUserName === 'string') {
    parsedUserName = `parsedUserName.charAt`(0).toUpperCase() + `parsedUserName.slice`(1);
  }

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        userName={parsedUserName} 
        isAdmin={isAdmin}
        onLogout={() => { `localStorage.removeItem`('token'); `localStorage.removeItem`('user'); resetDashboard(); setIsAuthenticated(false); navigate('/', { replace: true }); }}
        onLanguageChange={(lang: string) => `i18n.changeLanguage`(lang)}
        steps={CAREER_EDGE_STEPS}
        currentStep={currentStep}
      />
      <main className="main-content">
        <Outlet context={{ CAREER_EDGE_STEPS, currentStep, setCurrentStep, onStart: () => navigate('/login'), onShowCGU: () => setActiveLegalDoc('cgu'), onShowPrivacy: () => setActiveLegalDoc('privacy'), onShowLegal: () => setActiveLegalDoc('legal'), darkMode, setIsAuthenticated, isAdmin }} />
      </main>

      <div className="toast-container">{(toasts || []).map(t => (<div key={t.id} className="toast-notification">{`t.text`}<button onClick={() => removeToast(`t.id`)}>X</button></div>))}</div>

      {showDocsModal && <DocumentsModal onClose={() => setShowDocsModal(false)} />}

      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        <button className="btn-ghost" onClick={() => setActiveLegalDoc('legal')}>{t('footer_legal', 'Mentions Légales')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setActiveLegalDoc('cgu')}>{t('footer_cgu', 'CGU')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setActiveLegalDoc('privacy')}>{t('footer_privacy', 'Politique de Confidentialité')}</button>
      </footer>
    </div>
  );
}

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;