import React, { useState, useEffect } from 'react';
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

  // État pour basculer sur la vue Administrateur
  const [showAdmin, setShowAdmin] = useState(false);
  // État pour basculer sur les CGU
  const [showCGU, setShowCGU] = useState(false);
  // État pour basculer sur la Politique de confidentialité
  const [showPrivacy, setShowPrivacy] = useState(false);
  // État pour basculer sur les Mentions Légales
  const [showLegal, setShowLegal] = useState(false);
  // État pour afficher la page d'accueil (Landing Page) au premier accès
  const [showLanding, setShowLanding] = useState(true);
  // États pour le "Gel" de compte
  const [isFrozen, setIsFrozen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  // État de chargement du profil
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  // État de chargement pour l'import du PDF LinkedIn
  const [isImportLoading, setIsImportLoading] = useState(false);
  
  // État pour le Dark Mode avec persistance (localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const { t, i18n } = useTranslation();
  const {
    isAuthenticated, setIsAuthenticated,
    currentStep, setCurrentStep,
    cvResult, researchResult, salaryResult, displaySalary,
    careerGpsResult, careerRadarResult, jobDecoderResult,
    pitchResult, questionsResult,
    globalStatus, error,
    handleNextStep,
    cvData,
    updateFormData,
    setFormData,
    updateList,
    resetDashboard,
    triggerResearch,
    toasts, setToasts
  } = useGlobalDashboard();

  const CAREER_EDGE_STEPS: Step[] = [
    { id: 0, title: "Import" },
    { id: 1, title: t('profile_title') },
    { id: 2, title: t('target_title') },
    { id: 3, title: t('education_title') },
    { id: 4, title: t('experience_title') },
    { id: 5, title: t('qualities_title') },
    { id: 6, title: t('express_yourself') },
    { id: 7, title: t('clarification_title') }
  ];

  // Helpers pour les listes
  const handleAddList = (listName: string, defaultItem: any) => {
    const newList = [...(cvData[listName] || []), { ...defaultItem, id: Date.now() }];
    updateFormData(listName, newList);
  };
  const handleRemoveList = (listName: string, id: number) => {
    const newList = (cvData[listName] || []).filter((item: any) => item.id !== id);
    updateFormData(listName, newList);
  };

  // Synchronisation Langue Interface + Langue Cible IA
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // --- RÉCUPÉRATION DU PROFIL (PRÉ-REMPLISSAGE) ---
  const loadProfile = async () => {
    setIsProfileLoading(true);
    try {
      console.log(`🚀 [PROFIL] Fetching from: ${API_BASE_URL}/api/cv/me/profile`);
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/me/profile`, {
        method: 'GET'
      });
      if (response.ok) {
        const profileData = await response.json();
        console.log("✅ [PROFIL] Raw Data received:", profileData);
        if (profileData && Object.keys(profileData).length > 0) {
          setFormData((prev: any) => {
            const nextState = JSON.parse(JSON.stringify(prev)); // Deep clone
            if (!nextState.personal_info) nextState.personal_info = {};
            if (profileData.form) {
              Object.entries(profileData.form).forEach(([k, v]) => {
                const finalKey = k === 'target_role_primary' ? 'target_job' : k;
                if (['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'country', 'linkedin', 'photo', 'bio'].includes(finalKey)) {
                  nextState.personal_info[finalKey] = v || "";
                  nextState[finalKey] = v || ""; // Fix : on place la donnée partout pour que le formulaire la trouve à coup sûr
                } else if (finalKey === 'target_job') {
                  nextState['target_job'] = v || "";
                  nextState['target_role'] = v || ""; // Rétrocompatibilité avec d'anciens composants
                } else {
                  nextState[finalKey] = v || "";
                }
              });
            }
            Object.entries(profileData).forEach(([k, v]) => {
              if (k !== 'form') nextState[k] = v;
            });
            console.log("🎯 [PROFIL] State successfully updated:", nextState);
            return nextState;
          });
        }
      } else if (response.status === 404) {
        console.log("🚨 [PROFIL] Nouveau candidat détecté (404). Initialisation à l'étape 1.");
        resetDashboard();
      } else if (response.status === 401) {
        console.warn("🚨 [PROFIL] Session fantôme détectée (401). Déconnexion automatique...");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentStep'); // 🔥 FORCE LE RETOUR À L'ÉTAPE 1
        localStorage.removeItem('cvData');      // 🔥 VIDE LES DONNÉES OBSOLÈTES
        setCurrentStep(0);                      // Reset l'état local
        setIsAuthenticated(false);
      } else {
        console.error(`❌ [PROFIL] API Error ${response.status}`);
      }
    } catch (e) {
      console.error("🚨 [PROFIL] Fatal error during fetch:", e);
      setCurrentStep(0); // Retour de secours à l'étape 0 en cas de problème réseau
    } finally {
      setIsProfileLoading(false);
    }
  };

  // --- IMPORT LINKEDIN (ETAPE 0) ---
  const handleLinkedInImport = async (file: File) => {
    setIsImportLoading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const token = localStorage.getItem('token');
      // [EXPERT FIX] On utilise le fetch natif pour ne PAS forcer de 'Content-Type'. 
      // Le navigateur va générer lui-même le boundary Multipart indispensable au fichier.
      const res = await fetch(`${API_BASE_URL}/api/cv/parse-linkedin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });
      
      if (!res.ok) throw new Error("Erreur d'analyse du PDF");
      const parsedData = await res.json();
      
      setFormData((prev: any) => {
        const next = JSON.parse(JSON.stringify(prev));
        if (parsedData.first_name) next.personal_info.first_name = parsedData.first_name;
        if (parsedData.last_name) next.personal_info.last_name = parsedData.last_name;
        if (parsedData.email) next.personal_info.email = parsedData.email;
        if (parsedData.linkedin) next.personal_info.linkedin = parsedData.linkedin;
        if (parsedData.bio) next.personal_info.bio = parsedData.bio;
        if (parsedData.experiences) next.experiences = parsedData.experiences.map((e: any, i: number) => ({ ...e, id: Date.now() + i }));
        if (parsedData.educations) next.educations = parsedData.educations.map((e: any, i: number) => ({ ...e, id: Date.now() + 100 + i }));
        if (parsedData.skills) next.skills = parsedData.skills;
        return next;
      });
      
      setToasts(prev => [...prev, { id: Date.now(), text: "Profil importé avec succès !" }]);
      setCurrentStep(1); // Le fichier a été lu, on propulse le candidat à la vérification
    } catch (e) {
      console.error(e);
      setToasts(prev => [...prev, { id: Date.now(), text: "Échec de l'import. Assurez-vous d'avoir fourni le PDF LinkedIn officiel." }]);
    } finally {
      setIsImportLoading(false);
    }
  };

  // --- RENDU ---
  const renderStepContent = () => {
    if (isProfileLoading) {
      return <LoadingScreen title="Chargement de votre profil..." description="Récupération de vos données sécurisées..." />;
    }

    // Ligne de débug pour voir exactement ce que l'application comprend
    console.log(`[DEBUG] Affichage Page ${currentStep}/${CAREER_EDGE_STEPS.length} | Statut: '${globalStatus}'`);

    switch(currentStep) {
      case 0:
        return (
          <div className="step-wrapper">
            <StepImport onUpload={handleLinkedInImport} loading={isImportLoading} />
            <div className="actions-row" style={{ justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setCurrentStep(1)}>
                Ou remplir manuellement
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="step-wrapper">
            <StepProfile data={cvData} onChange={updateFormData} />
            <div className="actions-row">
              {/* Bouton Reset si des données existent déjà */}
              <button className="btn-ghost" onClick={resetDashboard} style={{ marginRight: 'auto' }}>
                <RotateCcw size={16} style={{ marginRight: '0.5rem' }}/>
                {t('btn_reset')}
              </button>
              <button className="btn-secondary" onClick={loadProfile} style={{ marginRight: '1rem' }}>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }}/>
                Synchroniser Profil
              </button>
              <button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="step-wrapper">
            <StepTarget data={cvData} onChange={updateFormData} />
            
            {/* Gestion Erreur API Page 2 */}
            {globalStatus === "FAILED" && (
              <div className="error-box">
                <AlertCircle size={16}/> 
                <span>{t('error_msg')} {error}</span>
                <button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button>
              </div>
            )}

            <div className="actions-row">
               <button className="btn-primary" onClick={handleNextStep} disabled={globalStatus === "STARTING"}>{t('btn_validate_launch')}</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="step-wrapper">
            <StepEducation 
              list={cvData.educations} 
              onAdd={() => handleAddList('educations', { degree: '', school: '', year: '' })}
              onRemove={(id) => handleRemoveList('educations', id)}
              onUpdate={(id, field, val) => updateList('educations', id, field, val)}
            />
            <div className="actions-row"><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
          </div>
        );
      case 4:
        return (
          <div className="step-wrapper">
            <StepExperience 
              list={cvData.experiences} 
              onAdd={() => handleAddList('experiences', { role: '', company: '', description: '' })}
              onRemove={(id) => handleRemoveList('experiences', id)}
              onUpdate={(id, field, val) => updateList('experiences', id, field, val)}
            />
            <div className="actions-row"><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
          </div>
        );
      case 5:
        return (
          <div className="step-wrapper">
            <StepQualitiesFlaws 
              data={cvData} onChange={updateFormData}
              successes={[]} onAddSuccess={() => {}} onUpdateSuccess={() => {}} // Simplifié pour l'exemple
              failures={[]} onAddFailure={() => {}} onUpdateFailure={() => {}}
            />
            <div className="actions-row"><button className="btn-primary" onClick={handleNextStep}>{t('btn_next')}</button></div>
          </div>
        );
      case 6:
        // Écran d'attente interstitiel pendant l'appel IA
        if (["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)) {
          return (
            <LoadingScreen 
              title="Création de votre profil stratégique..."
              description="Notre IA est en train d'analyser vos expériences et de les croiser avec les exigences du marché pour préparer votre dossier de candidature."
            />
          );
        }

        return (
          <div className="step-wrapper">
            <StepFreeText data={cvData} onChange={updateFormData} />
            
            {/* Gestion Erreur API Page 6 -> 7 */}
            {globalStatus === "FAILED" && (
              <div className="error-box">
                <AlertCircle size={16}/> 
                <span>{t('generation_error_msg')} {error}</span>
                <button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button>
              </div>
            )}

            <div className="actions-row">
              <button className="btn-primary" onClick={(e) => { 
                if (isFrozen) { e.preventDefault(); setShowPaywall(true); } 
                else { handleNextStep(); } 
              }} disabled={["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>
                {["PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('generating') : t('btn_generate_questions')}
              </button>
            </div>
          </div>
        );
      case 7: // Clarification (Ex-8)
        // Écran d'attente interstitiel pendant le lancement de l'analyse complète
        if (["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)) {
          return (
            <LoadingScreen 
              title="Génération du Dashboard final..."
              description="Notre IA compile actuellement toutes vos données pour créer vos modules de coaching personnalisés."
            />
          );
        }

        return (
          <div className="step-wrapper">
            <StepClarification 
              clarifications={cvData.clarifications} 
              onAnswer={(id, val) => {
                const newClars = cvData.clarifications.map((c: any) => c.id === id ? { ...c, answer: val } : c);
                updateFormData("clarifications", newClars);
              }} 
            />
            
            {/* Gestion Erreur API Page 7 -> Dashboard */}
            {globalStatus === "FAILED" && (
              <div className="error-box">
                <AlertCircle size={16}/> 
                <span>{t('error_msg')} {error}</span>
                <button className="btn-link" onClick={handleNextStep}>{t('btn_retry')}</button>
              </div>
            )}

            <div className="actions-row">
              <button className="btn-primary" onClick={(e) => { 
                if (isFrozen) { e.preventDefault(); setShowPaywall(true); } 
                else { handleNextStep(); } 
              }} disabled={["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus)}>
                {["STARTING", "PROCESSING", "LOADING", "FETCHING", "POLLING", "PENDING", "RUNNING"].includes(globalStatus) ? t('btn_launching') : t('btn_launch_full_analysis')}
              </button>
            </div>
          </div>
        );
      case 8: // DASHBOARD
        return (
          <TabProvider 
            initialCvData={cvData} 
            initialResearchResult={researchResult} 
            initialSalaryResult={salaryResult} 
            initialCareerGpsResult={careerGpsResult}
            initialCareerRadarResult={careerRadarResult}
            initialJobDecoderResult={jobDecoderResult}
            initialPitchResult={pitchResult}
            initialQuestionsResult={questionsResult}
            initialGlobalStatus={globalStatus} 
            onSetCurrentStep={setCurrentStep}
            onTriggerResearch={triggerResearch}
          >
            <DashboardView />
          </TabProvider>
        );
      default:
        return null;
    }
  };

  // Suppression d'un toast manuel
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Si l'utilisateur est déjà authentifié (via cache/token), on masque immédiatement la landing page
  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);
      
      // [FIX] On force l'URL /candidate pour que le Header affiche correctement les pastilles
      if (location.pathname === '/') {
        navigate('/candidate', { replace: true });
      }

      loadProfile();

      // Vérification du statut d'abonnement au chargement
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const isExpired = user.subscription_status === 'expired' || 
                           (user.subscription_expiration_date && new Date(user.subscription_expiration_date) < new Date());
          setIsFrozen(isExpired);
        }
      } catch (e) { console.error("Erreur parsing user", e); }
    }
  }, [isAuthenticated]);

  // Appliquer la classe sur le body pour que toute l'app (y compris les modales) hérite du thème
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Rendu de la vue Admin si activée
  if (showAdmin) {
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <button onClick={() => setShowAdmin(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>
            ← Retour à l'application
          </button>
          <AdminFeedbacks />
        </main>
      </div>
    );
  }

  // Rendu de la vue CGU si activée
  if (showCGU) {
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <button onClick={() => setShowCGU(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>
            ← Retour
          </button>
          <CGU />
        </main>
      </div>
    );
  }

  // Rendu de la vue Confidentialité si activée
  if (showPrivacy) {
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <button onClick={() => setShowPrivacy(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>
            ← Retour
          </button>
          <PrivacyPolicy />
        </main>
      </div>
    );
  }

  // Rendu de la vue Mentions Légales si activée
  if (showLegal) {
    return (
      <div className="app-container">
        <main className="main-content" style={{ paddingTop: '2rem' }}>
          <button onClick={() => setShowLegal(false)} className="btn-outline" style={{ marginBottom: '2rem' }}>
            ← Retour
          </button>
          <LegalNotice />
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        showLogin={!isAuthenticated}
        userName={isAuthenticated ? "Mon Compte" : undefined}
        onOpenProfile={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          resetDashboard(); // 🔥 Détruit le localStorage du CV et remet à l'étape 1
          setIsAuthenticated(false);
          navigate('/', { replace: true });
        }}
        onLanguageChange={handleLanguageChange}
      />
      <main className="main-content">
        {showLanding && !isAuthenticated ? (
          <LandingPage 
            onStart={() => setShowLanding(false)} 
            onShowCGU={() => setShowCGU(true)} 
            onShowPrivacy={() => setShowPrivacy(true)} 
            onShowLegal={() => setShowLegal(true)} 
          />
        ) : !isAuthenticated ? (
          <Login onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <>
            {/* NOUVELLE FRISE DE PASTILLES INFAILLIBLE */}
            {currentStep < 8 && (
              <div className="stepper-container">
                {CAREER_EDGE_STEPS.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className={`stepper-item ${currentStep === step.id ? 'current' : currentStep > step.id ? 'completed' : ''}`} onClick={() => currentStep > step.id && setCurrentStep(step.id)}>
                      <div className="stepper-circle">
                        {currentStep > step.id ? <CheckCircle2 size={16} /> : step.id}
                      </div>
                      <span className="stepper-title">{step.title}</span>
                    </div>
                    {index < CAREER_EDGE_STEPS.length - 1 && (
                      <div className={`stepper-line ${currentStep > step.id ? 'completed' : ''}`}></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="card-container">{renderStepContent()}</div>
          </>
        )}
      </main>

      {/* Bannière d'avertissement globale (Gel de compte) */}
      {isFrozen && isAuthenticated && !showLanding && !showAdmin && !showCGU && !showPrivacy && !showLegal && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#fffbeb', border: '1px solid #f59e0b', color: '#b45309', padding: '1rem 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={20} /> Accès expiré. La génération IA est bloquée.</span>
          <button onClick={() => setShowPaywall(true)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Réactiver (30€)</button>
        </div>
      )}

      {/* TOAST CONTAINER */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast-notification">
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}><LucideBell size={16} /> {t.text}</div>
            <button onClick={() => removeToast(t.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b'}}><LucideX size={14}/></button>
          </div>
        ))}
      </div>

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '1rem' }}>
           <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '1.5rem', maxWidth: '500px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ background: '#eff6ff', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Lock size={40} color="#3b82f6" />
              </div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Période d'accès expirée</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>Vos 3 mois d'accès illimité sont terminés. Rassurez-vous, votre historique est sauvegardé. Relancez le moteur d'Intelligence Artificielle pour analyser de nouvelles offres.</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                 <button onClick={() => setShowPaywall(false)} className="btn-outline">Plus tard</button>
                 <button onClick={() => window.location.href = '/payment?plan=renewal'} className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Débloquer pour 30 €</button>
              </div>
           </div>
        </div>
      )}

      {/* Lien vers le Dashboard Admin en pied de page */}
      <footer style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
        <button 
          onClick={() => setShowAdmin(true)} 
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Accès Administrateur (Feedbacks)
        </button>
        <span style={{ color: '#cbd5e1', margin: '0 1rem' }}>|</span>
        <button 
          onClick={() => setShowLegal(true)} 
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Mentions Légales
        </button>
        <span style={{ color: '#cbd5e1', margin: '0 1rem' }}>|</span>
        <button 
          onClick={() => setShowCGU(true)} 
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Conditions Générales d'Utilisation (CGU)
        </button>
        <span style={{ color: '#cbd5e1', margin: '0 1rem' }}>|</span>
        <button 
          onClick={() => setShowPrivacy(true)} 
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Politique de Confidentialité
        </button>
      </footer>

      <style>{`
        .step-container { text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; }
        .step-icon { color: #cbd5e1; margin-bottom: 1rem; } .step-icon.success { color: #22c55e; }
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
        .actions-row { display: flex; justify-content: flex-end; margin-top: 2rem; }
        .btn-secondary { background: #1e293b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-outline { background: transparent; border: 1px solid #cbd5e1; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.processing { background: #dbeafe; color: #1e40af; } .status-badge.completed { background: #dcfce7; color: #166534; }
        .results-grid { display: flex; flex-direction: column; gap: 1.5rem; }
        .result-card { background: var(--bg-card); padding: 1.5rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
        .loading-placeholder { color: #64748b; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
        .result-card.success { background: rgba(34, 197, 94, 0.05); border-color: rgba(34, 197, 94, 0.2); }
        .main-content { padding-top: 100px; padding-bottom: 2rem; max-width: 1600px; margin: 0 auto; padding-left: 2rem; padding-right: 2rem; }
        .card-container { background: var(--bg-card); padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 500px; color: var(--text-main); }
        .mock-data-info { margin-bottom: 1.5rem; color: var(--text-muted); background: var(--bg-secondary); padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.8rem; }
        .tasks-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .task-item { font-size: 0.9rem; color: #64748b; } .task-item.done { color: #166534; font-weight: 600; }
        .error-box { margin-top: 1rem; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 0.5rem; color: var(--danger-text); display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
        .btn-link { background: none; border: none; color: #dc2626; text-decoration: underline; cursor: pointer; font-weight: 600; padding: 0; margin-left: 0.5rem; }
        
        @keyframes loading-bar { 0% { width: 0%; } 10% { width: 35%; } 30% { width: 65%; } 60% { width: 85%; } 100% { width: 98%; } }
        .pulsing-text { animation: pulse-opacity 1.5s infinite; }
        @keyframes pulse-opacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .fade-text { animation: fadeInText 0.5s ease-out; display: inline-block; }
        @keyframes fadeInText { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        
        /* NOUVEAU STEPPER INTEGRE */
        .stepper-container { display: flex; align-items: flex-start; justify-content: space-between; max-width: 900px; margin: 0 auto 3rem auto; padding: 0 1rem; position: relative; z-index: 10; }
        .stepper-item { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; position: relative; z-index: 2; cursor: pointer; transition: 0.2s; width: 80px; }
        .stepper-item:not(.completed):not(.current) { cursor: not-allowed; opacity: 0.6; }
        .stepper-item:hover.completed { transform: translateY(-3px); }
        .stepper-circle { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-card); border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-muted); transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .stepper-item.current .stepper-circle { border-color: var(--primary); background: var(--primary); color: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
        .stepper-item.completed .stepper-circle { border-color: #10b981; background: #10b981; color: white; border: none; }
        .stepper-title { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-align: center; line-height: 1.3; }
        .stepper-item.current .stepper-title { color: var(--primary); font-weight: 700; }
        .stepper-item.completed .stepper-title { color: #10b981; }
        .stepper-line { flex: 1; height: 4px; background: var(--border-color); margin: 18px 0.5rem 0 0.5rem; position: relative; z-index: 1; transition: background 0.3s; border-radius: 2px; }
        .stepper-line.completed { background: rgba(16, 185, 129, 0.3); }
      `}</style>
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