import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RotateCcw, RefreshCw, Loader2, FileText, Target, MessageSquare, BarChart3, Bell as LucideBell, X as LucideX, Lock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Header, { Step } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DashboardProvider as GlobalProvider, useDashboard as useGlobalDashboard } from './hooks/DashboardContext';
import { DashboardProvider as TabProvider } from './components/DashboardContext';
import { 
  StepImport, StepProfile, StepTarget, StepEducation, StepExperience, 
  StepQualitiesFlaws, StepFreeText, StepClarification 
} from './components/CandidateSteps';
import AdminFeedbacks from './components/AdminFeedbacks';
import { LandingPage } from './components/LandingPage';
import { CGU } from './components/CGU';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LegalNotice } from './components/LegalNotice';
import { LoadingScreen } from './components/LoadingScreen';
import { API_BASE_URL } from './config';
import { authenticatedFetch } from './utils/auth';
import './index.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- États de l'interface ---
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');

  // Ref pour éviter de déclencher l'auto-sauvegarde au montage initial de la page
  const initialLoadRef = useRef(true);

  // --- Contexte Global (Hooks) ---
  const { t, i18n } = useTranslation();
  const {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    cvResult, gapResult, actionPlanResult,
    researchResult, salaryResult,
    careerGpsResult, careerRadarResult, jobDecoderResult,
    pitchResult, questionsResult,
    hiddenMarketResult, recruiterResult, realityResult, flawCoachingResult,
    globalStatus, error,
    handleNextStep,
    cvData,
    setFormData,
    resetDashboard,
    triggerResearch,
    toasts, setToasts,
    // [FIX] Ajout des variables manquantes pour gérer les onglets
    activeTab, setActiveTab 
  } = useGlobalDashboard();

  // --- Contrat de Données (Lecture seule) ---
  const transformProfileForFrontend = (profileData: any): object => {
    if (!profileData) return {};
    // Priorité: 1. Form data, 2. Personal info, 3. Root data
    const source = { ...profileData, ...(profileData.personal_info || {}), ...(profileData.form || {}) };
    
    const frontendData = {
      first_name: source.first_name || '',
      last_name: source.last_name || '',
      email: source.email || '',
      linkedin: source.linkedin || '',
      bio: source.bio || '',
      experiences: source.experiences || [],
      educations: source.educations || [],
      skills: source.skills || [],
      ...source // Spread the rest of the source
    };

    // Clean up to avoid redundant nested objects
    delete frontendData.form;
    delete frontendData.personal_info;
    
    return frontendData;
  };

  // --- Contrat de Données (Écriture) ---
  // Reconstruit la structure attendue par le backend avant le PUT
  const transformProfileForBackend = (frontendData: any): object => {
    if (!frontendData) return {};
    
    // Liste des champs appartenant aux informations personnelles
    const personalInfoFields = ['first_name', 'last_name', 'email', 'phone', 'city', 'country', 'linkedin', 'bio', 'target_language'];
    
    const payload = {
      personal_info: {} as Record<string, any>,
      form: {} as Record<string, any>
    };

    Object.entries(frontendData).forEach(([key, value]) => {
      if (personalInfoFields.includes(key)) payload.personal_info[key] = value;
      else payload.form[key] = value;
    });

    return payload;
  };

  const CAREER_EDGE_STEPS: Step[] = [
    { id: 0, title: "Import" }, { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') }, { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') }, { id: 5, title: t('qualities_title') },
    { id: 6, title: t('express_yourself') }, { id: 7, title: t('clarification_title') },
    { id: 8, title: "Résultats" }
  ];

  // --- Handlers transmis aux composants enfants ---
  const handleChange = (key: string, value: any) => setFormData((prev: any) => ({ ...(prev || {}), [key]: value }));
  const handleUpdateList = (listName: string, id: number, field: string, val: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).map((item: any) => item.id === id ? { ...item, [field]: val } : item) }));
  const handleAddList = (listName: string, defaultItem: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: [...(prev?.[listName] || []), { ...defaultItem, id: Date.now() }] }));
  const handleRemoveList = (listName: string, id: number) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).filter((item: any) => item.id !== id) }));
  const handleLanguageChange = (lang: string) => i18n.changeLanguage(lang);

  // --- Fonction de Sauvegarde Silencieuse (Auto-Save) ---
  const saveProfileToDB = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const payloadForBackend = transformProfileForBackend(data);

      // Changement de PUT vers POST pour respecter le contrôleur backend
      await fetch(`${API_BASE_URL}/api/cv/me/profile`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadForBackend)
      });
    } catch (e) {
      console.error("🚨 [AUTO-SAVE] Échec de la sauvegarde en arrière-plan:", e);
    }
  };

  // --- Effet Debounce pour Sauvegarder Progressivement ---
  useEffect(() => {
    // On ignore le tout premier rendu pour ne pas écraser la BDD avec des données vides
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // On ne sauvegarde pas si l'utilisateur n'est pas co ou si les données chargent
    if (!isAuthenticated || isProfileLoading || !cvData || Object.keys(cvData).length === 0) return;

    // Le "Debounce" : on attend 1.5s d'inactivité avant de faire l'appel réseau
    const timer = setTimeout(() => {
      saveProfileToDB(cvData);
    }, 1500);

    // Nettoyage : si l'utilisateur re-tape dans les 1.5s, on annule le timer précédent
    return () => clearTimeout(timer);
  }, [cvData, isAuthenticated, isProfileLoading]);

  // --- LOGIQUE DE CHARGEMENT ---
  const loadProfile = async () => {
    setIsProfileLoading(true);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/me/profile`);
      if (response.ok) {
        const rawProfileData = await response.json();
        if (rawProfileData && Object.keys(rawProfileData).length > 0) {
          const frontendData = transformProfileForFrontend(rawProfileData);
          setFormData(frontendData); // On utilise le setter du hook global
          if ((frontendData as any).target_language) {
            i18n.changeLanguage((frontendData as any).target_language.toLowerCase());
          }
        }
      } else if (response.status === 404) {
        resetDashboard(); // Le hook gère la réinitialisation à INITIAL_DATA
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        navigate('/', { replace: true });
      }
    } catch (e) {
      console.error("🚨 [PROFIL] Fatal error during fetch:", e);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // --- IMPORT LINKEDIN ---
  const handleLinkedInImport = async (file: File) => {
    setIsImportLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cv/parse-linkedin`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: uploadData
      });
      if (!res.ok) throw new Error("Erreur d'analyse du PDF");
      const parsedData = await res.json();
      const frontendData = transformProfileForFrontend(parsedData);
      setFormData((prev: any) => ({ ...prev, ...frontendData }));
      setToasts(prev => [...prev, { id: Date.now(), text: "Profil importé avec succès !" }]);
      setCurrentStep(1);
    } catch (e) {
      console.error(e);
      setToasts(prev => [...prev, { id: Date.now(), text: "Échec de l'import." }]);
    } finally {
      setIsImportLoading(false);
    }
  };

  // --- EFFETS DE BORD ---
  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);
      if (location.pathname === '/') navigate('/candidate', { replace: true });
      loadProfile();
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
          const user = JSON.parse(storedUser);
          const isExpired = user.subscription_status === 'expired' || (user.subscription_expiration_date && new Date(user.subscription_expiration_date) < new Date());
          setIsFrozen(isExpired);
        } catch (e) {
          console.warn("Could not parse user subscription", e);
        }
      }
    } else if (localStorage.getItem('token')) {
      setIsAuthenticated(true);
    } else {
      setIsProfileLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- RENDU DES ÉTAPES ---
  const renderStepContent = () => {
    if (isProfileLoading) return <LoadingScreen title="Chargement de votre profil..." description="Récupération de vos données sécurisées..." />;

    switch(currentStep) {
      case 0: return (
        <div className="step-wrapper">
          <StepImport onUpload={handleLinkedInImport} loading={isImportLoading} />
          {/* [FIX] Bouton secondaire repoussé à droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-outline" onClick={() => setCurrentStep(1)}>Ou remplir manuellement</button></div>
        </div>);
      case 1: return (
        <div className="step-wrapper">
          <StepProfile data={cvData || {}} onChange={handleChange} />
          {/* [FIX] Alignement propre avec le bouton reset poussé à gauche (marginRight: 'auto') et les autres à droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={resetDashboard} style={{ marginRight: 'auto' }}><RotateCcw size={16} style={{ marginRight: '0.5rem' }}/>{t('btn_reset')}</button>
            <button className="btn-secondary" onClick={loadProfile}><RefreshCw size={16} style={{ marginRight: '0.5rem' }}/>Synchroniser</button>
            <button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button>
          </div>
        </div>);
      case 2: return (
        <div className="step-wrapper">
          <StepTarget data={cvData || {}} onChange={handleChange} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button></div>)}
          {/* [UX FIX] Le bouton est maintenant un simple "Suivant", le lancement de l'analyse est transparent */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={handleNextStep} disabled={globalStatus === "STARTING"}>{t('btn_next')}</button></div>
        </div>);
      case 3: return (
        <div className="step-wrapper">
          <StepEducation list={cvData?.educations || []} onAdd={() => handleAddList('educations', { degree: '', school: '', year: '' })} onRemove={(id) => handleRemoveList('educations', id)} onUpdate={(id, field, val) => handleUpdateList('educations', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
        </div>);
      case 4: return (
        <div className="step-wrapper">
          <StepExperience list={cvData?.experiences || []} onAdd={() => handleAddList('experiences', { role: '', company: '', description: '' })} onRemove={(id) => handleRemoveList('experiences', id)} onUpdate={(id, field, val) => handleUpdateList('experiences', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
        </div>);
      case 5: return (
        <div className="step-wrapper">
          <StepQualitiesFlaws data={cvData || {}} onChange={handleChange} successes={[]} onAddSuccess={() => {}} onUpdateSuccess={() => {}} failures={[]} onAddFailure={() => {}} onUpdateFailure={() => {}} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
        </div>);
      case 6:
        if (["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)) return <LoadingScreen title="Création de votre profil stratégique..." description="Analyse de vos expériences et exigences du marché..." />;
        return (
          <div className="step-wrapper">
            <StepFreeText data={cvData || {}} onChange={handleChange} />
            {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('generation_error_msg')} {error}</span><button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button></div>)}
            <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={(e) => { if (isFrozen) { e.preventDefault(); setShowPaywall(true); } else { handleNextStep(); } }} disabled={["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>{["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('generating') : t('btn_generate_questions')}</button></div>
          </div>);
      case 7: return (
        <div className="step-wrapper">
          <StepClarification clarifications={cvData?.clarifications || []} onAnswer={(id: any, val: any) => handleChange("clarifications", (cvData?.clarifications || []).map((c: any) => c.id === id ? { ...c, answer: val } : c))} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button></div>)}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={(e) => { if (isFrozen) { e.preventDefault(); setShowPaywall(true); } else { handleNextStep(); } }} disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>{["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('btn_launching') : t('btn_launch_full_analysis')}</button></div>
        </div>);
      case 8: return (
        <div className="step-wrapper dashboard-wrapper">
          <TabProvider initialCvData={cvData} initialCvResult={cvResult} initialGapResult={gapResult} initialActionPlanResult={actionPlanResult} initialResearchResult={researchResult} initialSalaryResult={salaryResult} initialCareerGpsResult={careerGpsResult} initialCareerRadarResult={careerRadarResult} initialJobDecoderResult={jobDecoderResult} initialPitchResult={pitchResult} initialQuestionsResult={questionsResult} initialHiddenMarketResult={hiddenMarketResult} initialRecruiterResult={recruiterResult} initialRealityResult={realityResult} initialFlawCoachingResult={flawCoachingResult} initialGlobalStatus={globalStatus} onSetCurrentStep={setCurrentStep} onTriggerResearch={triggerResearch}>
            <DashboardView />
          </TabProvider>
        </div>);
      default: return null;
    }
  };

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const LegalComponent = showCGU ? CGU : showPrivacy ? PrivacyPolicy : showLegal ? LegalNotice : null;
  const closeLegal = () => { setShowCGU(false); setShowPrivacy(false); setShowLegal(false); };
  if (LegalComponent) return (
    <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={closeLegal} className="btn-outline" style={{ marginBottom: '2rem' }}>← Retour</button><LegalComponent /></main></div>);

  if (showAdmin) return (
    <div className="app-container"><main className="main-content" style={{ paddingTop: '2rem' }}><button onClick={() => setShowAdmin(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>← Retour</button><AdminFeedbacks /></main></div>);

  // [FIX] Sécurisation du parsing JSON du nom d'utilisateur pour éviter la page blanche au login
  let parsedUserName = undefined;
  if (isAuthenticated) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        parsedUserName = JSON.parse(storedUser).name || "Mon Compte";
      }
    } catch (e) {
      parsedUserName = "Mon Compte";
    }
  }

  return (
    <div className="app-container">
      {/* @ts-ignore - Ignore type differences between Header props and what is passed */}
      <Header darkMode={darkMode} setDarkMode={setDarkMode} showLogin={!isAuthenticated} userName={parsedUserName} onOpenProfile={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); resetDashboard(); setIsAuthenticated(false); navigate('/', { replace: true }); }} onLanguageChange={handleLanguageChange} />
      <main className="main-content">
        {showLanding && !isAuthenticated ? (<LandingPage onStart={() => setShowLanding(false)} onShowCGU={() => setShowCGU(true)} onShowPrivacy={() => setShowPrivacy(true)} onShowLegal={() => setShowLegal(true)} />) : 
         !isAuthenticated ? (
            // @ts-ignore - Login component might be missing the onLogin prop declaration
            <Login onLogin={() => setIsAuthenticated(true)} />) : 
          (<div style={{ paddingTop: '100px', paddingBottom: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem', boxSizing: 'border-box' }}>
            {/* [FIX] Ajout d'un padding-top de 100px pour descendre sous le Header et centrage global de l'interface */}
            {/* [FIX] Forcer la largeur à 100% et injecter un padding fantôme à droite pour éviter la coupure au scroll */}
            <div className="stepper-container custom-stepper" style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '1.5rem 1rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', margin: '0 auto 2rem auto', gap: '0.25rem', width: '100%', boxSizing: 'border-box' }}>
              {CAREER_EDGE_STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div 
                    className={`stepper-item ${currentStep === step.id ? 'current' : currentStep > step.id ? 'completed' : ''}`} 
                    onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: currentStep > step.id ? 'pointer' : 'default', flex: 1, minWidth: '70px', flexShrink: 0, opacity: currentStep < step.id ? 0.5 : 1 }}
                  >
                    <div 
                      className="stepper-circle" 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: currentStep > step.id ? '#10b981' : currentStep === step.id ? 'var(--primary)' : 'var(--bg-secondary)', color: currentStep >= step.id ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', fontWeight: 'bold', boxShadow: currentStep === step.id ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none', transition: 'all 0.3s ease', flexShrink: 0 }}
                    >
                      {currentStep > step.id ? <CheckCircle2 size={18} /> : step.id}
                    </div>
                    <span 
                      className="stepper-title" 
                      style={{ fontSize: '0.7rem', textAlign: 'center', color: currentStep === step.id ? 'var(--primary)' : 'var(--text-main)', fontWeight: currentStep === step.id ? 700 : 500, whiteSpace: 'normal', maxWidth: '100px', lineHeight: 1.2 }}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < CAREER_EDGE_STEPS.length - 1 && (
                    <div 
                      className={`stepper-line ${currentStep > step.id ? 'completed' : ''}`} 
                      style={{ flex: 1, height: '3px', background: currentStep > step.id ? '#10b981' : 'var(--border-color)', minWidth: '15px', borderRadius: '2px', transition: 'background 0.3s ease', marginTop: '16px' }}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <style>{`
              .custom-stepper { scrollbar-width: none; } /* Cache la scrollbar sur Firefox */
              .custom-stepper::-webkit-scrollbar { display: none; } /* Cache la scrollbar Chrome/Safari */
              .custom-stepper::after { content: ''; min-width: 1.5rem; display: block; flex-shrink: 0; } /* Élément fantôme pour forcer le padding droit */
              .custom-stepper::before { display: none !important; } /* Nettoie la ligne absolue obsolète d'index.css */
            `}</style>
            <div className="card-container">{renderStepContent()}</div>
          </div>)}
      </main>

      {isFrozen && isAuthenticated && !showLanding && !LegalComponent && !showAdmin && (
        <div className="frozen-banner"><Lock size={20} /> Accès expiré. La génération IA est bloquée.<button onClick={() => setShowPaywall(true)} className="btn-reactivate">Réactiver (30€)</button></div>)}

      <div className="toast-container">{(toasts || []).map(t => (<div key={t.id} className="toast-notification"><LucideBell size={16} /> {t.text}<button onClick={() => removeToast(t.id)}><LucideX size={14}/></button></div>))}</div>

      {showPaywall && (
        <div className="modal-overlay">
           <div className="modal-content">
              <div className="modal-icon"><Lock size={40} color="#3b82f6" /></div>
              <h2>Période d'accès expirée</h2>
              <p>Vos 3 mois d'accès illimité sont terminés. Rassurez-vous, votre historique est sauvegardé.</p>
              <div className="modal-actions">
                 <button onClick={() => setShowPaywall(false)} className="btn-outline">Plus tard</button>
                 <button onClick={() => window.location.href = '/payment?plan=renewal'} className="btn-primary">Débloquer pour 30 €</button>
              </div>
           </div>
        </div>)}

      {/* [FIX] Alignement centré et aéré du Footer réglementaire */}
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        <button className="btn-ghost" onClick={() => setShowAdmin(true)}>Accès Administrateur</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowLegal(true)}>Mentions Légales</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowCGU(true)}>CGU</button><span>|</span>
        <button className="btn-ghost" onClick={() => setShowPrivacy(true)}>Politique de Confidentialité</button>
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
