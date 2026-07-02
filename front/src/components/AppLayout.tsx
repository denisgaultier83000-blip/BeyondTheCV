import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { useGlobalDashboard } from '../hooks/DashboardContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const AppLayout = () => {
  const { isAuthenticated, setIsAuthenticated, resetDashboard, cvData } = useGlobalDashboard();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  let parsedUserName = undefined;
  let isAdmin = false;
  if (isAuthenticated) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
          const u = JSON.parse(storedUser);
          parsedUserName = u.first_name || u.name || t('default_candidate_name', "Candidat");
          isAdmin = !!u.is_admin;
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

  const CAREER_EDGE_STEPS = [
    { id: 0, title: t('step_import', "Import") }, { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') }, { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') }, { id: 5, title: t('qualities_title') },
    { id: 7, title: t('clarification_title') }, { id: 8, title: t('step_results', "Résultats") }
  ];

  const [darkMode, setDarkMode] = React.useState<boolean>(() => localStorage.getItem('theme') === 'dark');

  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isAuthenticated={isAuthenticated}
        userName={parsedUserName} 
        onOpenProfile={() => {}} 
        onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); resetDashboard(); setIsAuthenticated(false); navigate('/', { replace: true }); }} 
        onLanguageChange={() => {}} 
        steps={CAREER_EDGE_STEPS}
        currentStep={0}
      />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        {isAdmin && (
          <>
            <button className="btn-ghost" onClick={() => navigate('/admin')}>Dashboard Admin</button><span className="footer-separator">|</span>
          </>
        )}
        <button className="btn-ghost" >{t('footer_legal', 'Mentions Légales')}</button><span>|</span>
        <button className="btn-ghost" >{t('footer_cgu', 'CGU')}</button><span>|</span>
        <button className="btn-ghost" >{t('footer_privacy', 'Politique de Confidentialité')}</button>
      </footer>
    </div>
  );
};

export default AppLayout;
