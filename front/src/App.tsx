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
  StepQualitiesFlaws, StepClarification 
} from './components/CandidateSteps';
import AdminFeedbacks from './components/AdminFeedbacks';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { CGU } from './components/CGU';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LegalNotice } from './components/LegalNotice';
import ResetPassword from './components/ResetPassword';
import { LoadingScreen } from './components/LoadingScreen';
import DocumentsModal from './components/DocumentsModal';
import { API_BASE_URL } from './config';
import { authenticatedFetch } from './utils/auth';
import './index.css';

// Composant fantôme séparé pour isoler le cycle de vie du useEffect
function Step6Ghost({ onNext, t }: { onNext: () => void, t: any }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 100);
    return () => clearTimeout(timer);
  }, [onNext]);

  return <LoadingScreen title={t('loading_strat_title', "Création de votre profil stratégique...")} description={t('loading_strat_desc', "Analyse de vos expériences et exigences du marché...")} />;
}

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
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const [restoredData, setRestoredData] = useState<any>(null);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Ref pour éviter de déclencher l'auto-sauvegarde au montage initial de la page
  const initialLoadRef = useRef(true);

  // --- Contexte Global (Hooks) ---
  const { t, i18n } = useTranslation();
  const {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    gapResult, actionPlanResult,
    researchResult, salaryResult,
    jobDecoderResult,
    pitchResult, questionsResult,
    recruiterResult, realityResult, flawCoachingResult,
    globalStatus, error,
    customScenariosResult,
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
      ...source, // On spread la source en premier pour ne pas écraser nos listes sécurisées
      first_name: source.first_name || '',
      last_name: source.last_name || '',
      email: source.email || '',
      linkedin: source.linkedin || '',
      bio: source.bio || '',
      experiences: (source.experiences || []).map((exp: any, i: number) => ({ ...exp, id: exp.id || `exp_${Date.now()}_${i}` })),
      educations: (source.educations || []).map((edu: any, i: number) => ({ ...edu, id: edu.id || `edu_${Date.now()}_${i}` })),
      skills: source.skills || []
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
    
    const payload: Record<string, any> = {
      personal_info: {}
    };

    Object.entries(frontendData).forEach(([key, value]) => {
      if (personalInfoFields.includes(key)) payload.personal_info[key] = value;
      else payload[key] = value;
    });

    return payload;
  };

  const CAREER_EDGE_STEPS: Step[] = [
    { id: 0, title: t('step_import', "Import") }, { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') }, { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') }, { id: 5, title: t('qualities_title') },
    { id: 7, title: t('clarification_title') }, { id: 8, title: t('step_results', "Résultats") }
  ];

  // --- Handlers transmis aux composants enfants ---
  const handleChange = (key: string, value: any) => setFormData((prev: any) => ({ ...(prev || {}), [key]: value }));
  const handleUpdateList = (listName: string, id: string | number, field: string, val: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).map((item: any) => item.id === id ? { ...item, [field]: val } : item) }));
  const handleAddList = (listName: string, defaultItem: any) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: [...(prev?.[listName] || []), { ...defaultItem, id: Date.now() }] }));
  const handleRemoveList = (listName: string, id: string | number) => setFormData((prev: any) => ({ ...(prev || {}), [listName]: (prev?.[listName] || []).filter((item: any) => item.id !== id) }));
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setFormData((prev: any) => ({ ...(prev || {}), target_language: lang }));
  };

  // --- Fonction de Sauvegarde Silencieuse (Auto-Save) ---
  const saveProfileToDB = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const payloadForBackend = transformProfileForBackend(data);

      // Changement de PUT vers POST pour respecter le contrôleur backend
      const res = await fetch(`${API_BASE_URL}/api/cv/me/profile`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadForBackend)
      });
      if (res.ok) {
        setLastSaveTime(new Date());
      }
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
          setLastSaveTime(new Date());
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

  // --- IMPORT CV / LINKEDIN ---
  const handleCVImport = async (payload: File | string) => {
    setIsImportLoading(true);
    try {
      const uploadData = new FormData();
      if (typeof payload === "string") {
        uploadData.append('raw_text', payload);
      } else {
        uploadData.append('file', payload);
      }
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/cv/parse-cv`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: uploadData
      });
      if (!res.ok) throw new Error("Erreur d'analyse du document");
      const parsedData = await res.json();
      const frontendData = transformProfileForFrontend(parsedData);
      setFormData((prev: any) => ({ ...prev, ...frontendData }));
      setToasts(prev => [...prev, { id: Date.now(), text: "Données extraites avec succès !" }]);
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

      const storedUser = localStorage.getItem('user');
      let user = null;
      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
          user = JSON.parse(storedUser);
        } catch (e) {
          console.warn("Could not parse user from localStorage", e);
        }
      }

      // [FIX] Redirection de l'admin vers son interface, peu importe la page initiale.
      // On s'assure qu'il n'est pas déjà sur une page admin pour éviter une boucle.
      if (user && user.is_admin && !location.pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      } else if (user && !user.is_admin && (location.pathname === '/' || location.pathname === '/login')) {
        navigate('/candidate', { replace: true });
      }
      
      loadProfile();

      if (user) {
        try {
          // Vérifie si l'utilisateur est admin ou possède le flag is_tester
          const isTester = user.is_admin || user.is_tester;
          
          const isExpired = !isTester && (user.subscription_status === 'expired' || (user.subscription_expiration_date && new Date(user.subscription_expiration_date) < new Date()));
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

  // --- RESTAURATION DE CANDIDATURE (Depuis Mes Documents) ---
  useEffect(() => {
    if (isAuthenticated) {
      const restoredDataStr = sessionStorage.getItem('restored_application_data');
      if (restoredDataStr) {
        try {
          const parsedData = JSON.parse(restoredDataStr);
          setRestoredData(parsedData);
          setCurrentStep(8); // Redirection immédiate vers le Dashboard
          setToasts(prev => [...prev, { id: Date.now(), text: "Dossier de candidature restauré avec succès." }]);
        } catch (e) {
          console.error("Erreur de parsing des données restaurées", e);
        }
        sessionStorage.removeItem('restored_application_data');
      }
    }
  }, [isAuthenticated, setCurrentStep, setToasts]);

  // Nettoyage de l'archive si le candidat lance une toute nouvelle analyse
  useEffect(() => {
    if (globalStatus === 'STARTING') {
      setRestoredData(null);
    }
  }, [globalStatus]);

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

  // --- LOGIQUE DE CACHE (DIRTY CHECK) ---
  const getCoreDataSignature = (data: any) => {
    if (!data) return "";
    return JSON.stringify({
      target_job: data.target_job,
      target_company: data.target_company,
      experiences: data.experiences,
      educations: data.educations,
      skills: data.skills,
      flaws: data.flaws
    });
  };

  // --- RENDU DES ÉTAPES ---
  const renderStepContent = () => {
    if (isProfileLoading) return <LoadingScreen title={t('loading_profile_title', "Chargement de votre profil...")} description={t('loading_profile_desc', "Récupération de vos données sécurisées...")} />;

    switch(currentStep) {
      case 0: return (
        <div className="step-wrapper">
          <StepImport onUpload={handleCVImport} loading={isImportLoading} />
          {/* [FIX] Bouton secondaire repoussé à droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-outline" onClick={() => setCurrentStep(1)}>{t('or_fill_manually', 'Ou remplir manuellement')}</button></div>
        </div>);
      case 1: return (
        <div className="step-wrapper">
          <StepProfile data={cvData || {}} onChange={handleChange} />
          {/* [FIX] Alignement propre avec le bouton reset poussé à gauche (marginRight: 'auto') et les autres à droite */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', gap: '1rem', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => resetDashboard()} style={{ marginRight: 'auto' }}><RotateCcw size={16} style={{ marginRight: '0.5rem' }}/>{t('btn_reset')}</button>
            {lastSaveTime && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {t('last_saved_at', 'Sauvegardé à')} {lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button className="btn-secondary" onClick={loadProfile}><RefreshCw size={16} style={{ marginRight: '0.5rem' }}/>{t('btn_sync', 'Synchroniser')}</button>
            <button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button>
          </div>
        </div>);
      case 2: return (
        <div className="step-wrapper">
          <StepTarget data={cvData || {}} onChange={(key, val) => {
            handleChange(key, val);
            // Retire la bordure rouge dès que l'utilisateur commence à taper
            if (stepErrors[key]) setStepErrors(prev => ({ ...prev, [key]: false }));
          }} errors={stepErrors} loading={globalStatus === "STARTING"} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
          {/* [UX FIX] Le bouton est maintenant un simple "Suivant", le lancement de l'analyse est transparent */}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn-primary" onClick={() => {
              const company = cvData?.target_company?.trim();
              const industry = cvData?.target_industry?.trim();
              if (!company && !industry) {
                setStepErrors({ target_company: true, target_industry: true });
                setToasts(prev => [...prev, { id: Date.now(), text: "Veuillez spécifier au moins une entreprise cible ou un secteur d'activité." }]);
                return; // Bloque la requête vers le backend
              }
              handleNextStep();
            }} disabled={globalStatus === "STARTING"}>{t('btn_next')}</button>
          </div>
        </div>);
      case 3: return (
        <div className="step-wrapper">
          <StepEducation list={cvData?.educations || []} onAdd={() => handleAddList('educations', { degree: '', school: '', year: '' })} onRemove={(id: number) => handleRemoveList('educations', id)} onUpdate={(id: number, field: string, val: any) => handleUpdateList('educations', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button></div>
        </div>);
      case 4: return (
        <div className="step-wrapper">
          <StepExperience list={cvData?.experiences || []} onAdd={() => handleAddList('experiences', { role: '', company: '', description: '' })} onRemove={(id: number) => handleRemoveList('experiences', id)} onUpdate={(id: number, field: string, val: any) => handleUpdateList('experiences', id, field, val)} />
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={() => handleNextStep()}>{t('btn_next')}</button></div>
        </div>);
    case 5:
        if (["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)) return <LoadingScreen title={t('loading_strat_title', "Création de votre profil stratégique...")} description={t('loading_strat_desc', "Analyse de vos expériences et exigences du marché...")} />;
        return (
          <div className="step-wrapper">
          <StepQualitiesFlaws data={cvData || {}} onChange={handleChange} successes={[]} onAddSuccess={() => {}} onUpdateSuccess={() => {}} failures={[]} onAddFailure={() => {}} onUpdateFailure={() => {}} />
            {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('generation_error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
            <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                className="btn-primary" 
                onClick={(e) => { 
                  if (isFrozen) { 
                    e.preventDefault(); 
                    setShowPaywall(true); 
                  } else { 
                    const currentSignature = getCoreDataSignature(cvData);
                    // Si la signature n'a pas changé et que nous avons déjà des questions
                    if (cvData?.clarifications?.length > 0 && cvData?.last_clarification_signature === currentSignature) {
                    setCurrentStep(7); // On bypass le handleNextStep (pas d'appel API)
                    } else {
                      // Sinon, on sauvegarde la nouvelle signature et on lance l'IA
                      handleChange('last_clarification_signature', currentSignature);
                      handleNextStep(); 
                    }
                  } 
                }} 
                disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}
              >
                {["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('generating') : t('btn_generate_questions')}
              </button>
            </div>
          </div>);
    case 6:
      // [FIX EXPERT] Composant fantôme pour réaligner la machine à états du DashboardContext
      return <Step6Ghost onNext={handleNextStep} t={t} />;
    case 7: 
        const clarificationAnswers = (cvData?.clarifications || []).reduce((acc: any, curr: any) => {
          if (curr.answer) acc[curr.id] = curr.answer;
          return acc;
        }, {});
        
        return (
        <div className="step-wrapper">
          <StepClarification clarifications={cvData?.clarifications || []} answers={clarificationAnswers} onAnswer={(id: any, val: any) => handleChange("clarifications", (cvData?.clarifications || []).map((c: any) => c.id === id ? { ...c, answer: val } : c))} />
          {globalStatus === "FAILED" && (<div className="error-box"><AlertCircle size={16}/><span>{t('error_msg')} {error}</span><button className="btn-link" onClick={() => handleNextStep()}>{t('btn_retry')}</button></div>)}
          <div className="actions-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}><button className="btn-primary" onClick={(e) => { if (isFrozen) { e.preventDefault(); setShowPaywall(true); } else { handleNextStep(); } }} disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>{["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('btn_launching') : t('btn_launch_full_analysis')}</button></div>
        </div>);
    case 8: return (
        <div className="step-wrapper dashboard-wrapper">
          <TabProvider 
            initialCvData={cvData} 
            initialGapResult={restoredData?.gapResult || gapResult} 
            initialActionPlanResult={restoredData?.actionPlanResult || actionPlanResult} 
            initialResearchResult={restoredData?.researchResult || researchResult} 
            initialSalaryResult={restoredData?.salaryResult || salaryResult} 
            initialJobDecoderResult={restoredData?.jobDecoderResult || jobDecoderResult} 
            initialPitchResult={restoredData?.pitchResult || pitchResult} 
            initialQuestionsResult={restoredData?.questionsResult || questionsResult} 
            initialRecruiterResult={restoredData?.recruiterResult || recruiterResult} 
            initialRealityResult={restoredData?.realityResult || realityResult} 
            initialFlawCoachingResult={restoredData?.flawCoachingResult || flawCoachingResult} 
            initialCustomScenariosResult={restoredData?.customScenariosResult || customScenariosResult} 
            initialGlobalStatus={restoredData ? "COMPLETED" : globalStatus} 
            onSetCurrentStep={setCurrentStep} 
            onTriggerResearch={triggerResearch}
          >
            <DashboardView />
            {/* Exemple d'intégration si vous appelez ApplicationDossier depuis App.tsx : */}
            {/* <ApplicationDossier onGoToTraining={() => { setActiveTab('training'); setCurrentStep(8); }} /> */}
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

  // Interception de la route pour le mot de passe oublié
  if (location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  // [FIX] Sécurisation du parsing JSON du nom d'utilisateur pour éviter la page blanche au login
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

  // Interception de la route pour l'interface Administrateur
  if (location.pathname === '/admin') {
    if (!isAuthenticated) {
      return (
        <div className="app-container">
          <main className="main-content" style={{ paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <Login onLoginSuccess={() => {
              setIsAuthenticated(true);
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              if (user.is_admin) {
                navigate('/admin', { replace: true });
              }
            }} />
          </main>
        </div>
      );
    }
    if (!isAdmin) {
      return (
        <div className="app-container"><main className="main-content" style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--danger-text)', fontWeight: 'bold' }}>🚨 Accès refusé : Droits administrateur requis.</main></div>
      );
    }
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <button onClick={() => navigate('/candidate')} className="btn-outline" style={{ marginBottom: '2rem' }}>← Retour à l'application</button>
          <AdminDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isAuthenticated={isAuthenticated}
        userName={parsedUserName} 
        onOpenProfile={() => setShowDocsModal(true)} 
        onLogout={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); resetDashboard(); setIsAuthenticated(false); navigate('/', { replace: true }); }} 
        onLanguageChange={handleLanguageChange} 
        steps={CAREER_EDGE_STEPS}
        currentStep={currentStep}
      />
      <main className="main-content">
        {showLanding && !isAuthenticated ? (
          <LandingPage darkMode={darkMode} onStart={() => setShowLanding(false)} onShowCGU={() => setShowCGU(true)} onShowPrivacy={() => setShowPrivacy(true)} onShowLegal={() => setShowLegal(true)} />
        ) : 
         !isAuthenticated ?
            (<Login onLoginSuccess={() => setIsAuthenticated(true)} />) : 
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
        <div className="frozen-banner"><Lock size={20} /> {t('frozen_banner_text', 'Accès expiré. La génération IA est bloquée.')}<button onClick={() => setShowPaywall(true)} className="btn-reactivate">{t('btn_reactivate', 'Réactiver (30€)')}</button></div>)}

      <div className="toast-container">{(toasts || []).map(t => (<div key={t.id} className="toast-notification"><LucideBell size={16} /> {t.text}<button onClick={() => removeToast(t.id)}><LucideX size={14}/></button></div>))}</div>

      {showPaywall && (
        <div className="modal-overlay">
           <div className="modal-content">
              <div className="modal-icon"><Lock size={40} color="#3b82f6" /></div>
              <h2>{t('paywall_title', 'Période d\'accès expirée')}</h2>
              <p>{t('paywall_desc', 'Vos 3 mois d\'accès illimité sont terminés. Rassurez-vous, votre historique est sauvegardé.')}</p>
              <div className="modal-actions">
                 <button onClick={() => setShowPaywall(false)} className="btn-outline">{t('btn_later', 'Plus tard')}</button>
                 <button onClick={() => window.open('/payment?plan=renewal', '_blank')} className="btn-primary">{t('btn_unlock', 'Débloquer pour 30 €')}</button>
              </div>
           </div>
        </div>)}

      {showDocsModal && <DocumentsModal onClose={() => setShowDocsModal(false)} />}

      {/* [FIX] Alignement centré et aéré du Footer réglementaire */}
      <footer className="app-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '2rem', flexWrap: 'wrap', opacity: 0.8, marginTop: 'auto' }}>
        {isAdmin && (
          <>
            <button className="btn-ghost" onClick={() => navigate('/admin')}>Dashboard Admin</button><span>|</span>
            <button className="btn-ghost" onClick={() => setShowAdmin(true)}>Feedbacks Admin</button><span>|</span>
          </>
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
