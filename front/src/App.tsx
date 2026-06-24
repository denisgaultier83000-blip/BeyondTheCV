import React, { useState, useEffect, useRef } from 'react';
 import { Bell as LucideBell, X as LucideX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// [EXPERT] Remplacement de la navigation manuelle par un système de routage complet
import { useNavigate, Outlet, Link } from 'react-router-dom';
import Header, { Step } from './components/Header';
import { DashboardProvider as GlobalProvider, useDashboard as useGlobalDashboard } from './hooks/DashboardContext';
import { CGU } from './components/CGU';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LegalNotice } from './components/LegalNotice';
import DocumentsModal from './components/DocumentsModal';
import './index.css';

function AppContent() {
  const navigate = useNavigate();

  // --- États de l'interface (simplifiés) ---
  const [showCGU, setShowCGU] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [showDocsModal, setShowDocsModal] = useState(false);

  // --- Contexte Global (Hooks) ---
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

  // --- EFFETS DE BORD ---

  // [FIX EXPERT] Interception globale pour forcer l'ouverture de la page de paiement dans un nouvel onglet
  // Cela évite de perdre le contexte de l'application (ex: une réponse vocale en cours d'évaluation)
  // lorsque l'utilisateur clique sur une proposition de recharge.
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href && link.href.includes('/payment') && link.target !== '_blank') {
        e.preventDefault();
        window.open(link.href, '_blank');
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const LegalComponent = showCGU ? CGU : showPrivacy ? PrivacyPolicy : showLegal ? LegalNotice : null;
  const closeLegal = () => { setShowCGU(false); setShowPrivacy(false); setShowLegal(false); };
  if (LegalComponent) return (
    <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={closeLegal} className="btn-outline" style={{ marginBottom: '2rem' }}>← Retour</button><LegalComponent /></main></div>
  );

  // [FIX] Sécurisation du parsing JSON du nom d'utilisateur pour éviter la page blanche au login
  let parsedUserName = undefined;
  // [FIX CRITIQUE] Centralisation de la logique admin.
  // On utilise la même méthode de vérification que dans le Header pour garantir la cohérence.
  let isAdmin = false;
  if (isAuthenticated) {
    try {
      const storedUser = localStorage.getItem('user');
      const adminEmail = import.meta.env.VITE_REACT_APP_ADMIN_EMAIL;
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
          const u = JSON.parse(storedUser);
          parsedUserName = u.first_name || u.name || t('default_candidate_name', "Candidat");
          // La seule source de vérité est la comparaison avec la variable d'environnement.
          isAdmin = !!(adminEmail && u.email && u.email.toLowerCase() === adminEmail.toLowerCase());
      }
    } catch (e) {
        parsedUserName = t('default_candidate_name', "Candidat");
    }
      if (cvData?.first_name) {
        parsedUserName = cvData.first_name;
      }
  }

  // [FIX] S'assurer que le prénom commence toujours par une majuscule dans le Header
  if (parsedUserName && typeof parsedUserName === 'string') {
    parsedUserName = parsedUserName.charAt(0).toUpperCase() + parsedUserName.slice(1);
  }

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isAuthenticated={isAuthenticated}
        userName={parsedUserName} 
        isAdmin={isAdmin} // [FIX] On passe le statut admin calculé comme prop
        onOpenProfile={() => setShowDocsModal(true)} 
        onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); resetDashboard(); setIsAuthenticated(false); navigate('/', { replace: true }); }}
        onLanguageChange={(lang) => i18n.changeLanguage(lang)}
        steps={CAREER_EDGE_STEPS}
        currentStep={currentStep}
      />
      <main className="main-content">
        {/* Le routeur de main.tsx va injecter le bon composant ici via Outlet. On lui passe toutes les fonctions nécessaires. */}
        <Outlet context={{ CAREER_EDGE_STEPS, currentStep, setCurrentStep, onStart: () => navigate('/login'), onShowCGU: () => setShowCGU(true), onShowPrivacy: () => setShowPrivacy(true), onShowLegal: () => setShowLegal(true), darkMode }} />
      </main>

      <div className="toast-container">{(toasts || []).map(t => (<div key={t.id} className="toast-notification"><LucideBell size={16} /> {t.text}<button onClick={() => removeToast(t.id)}><LucideX size={14}/></button></div>))}</div>

      {showDocsModal && <DocumentsModal onClose={() => setShowDocsModal(false)} />}

      {/* [FIX] Alignement centré et aéré du Footer réglementaire */}
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        {isAdmin && (
          <><Link to="/admin" className="btn-ghost">👑 Administration</Link><span>|</span></>
        )}
        <button className="btn-ghost" onClick={() => setShowLegal(true)}>{t('footer_legal', 'Mentions Légales')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowCGU(true)}>{t('footer_cgu', 'CGU')}</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowPrivacy(true)}>{t('footer_privacy', 'Politique de Confidentialité')}</button>
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
