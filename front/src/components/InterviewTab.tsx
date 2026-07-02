import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../hooks/DashboardContext';
import { Mic, MessageSquare, Play, Pause, RotateCcw, BrainCircuit, ArrowLeft, Loader2, RefreshCw, Lightbulb, Shield, Users, Briefcase, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';

import Questionnaire from './Questionnaire';
import Flashcards from './Flashcards';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import SalaryNegotiator from './SalaryNegotiator';
import PitchOralTrainer from './PitchOralTrainer';

// --- LOGIQUE TÉLÉPROMPTEUR DÉPLACÉE ICI (À LA RACINE) ---
const Teleprompter = ({ fullPitchText, setIsTeleprompterOpen, isDark, t }: { fullPitchText: string, setIsTeleprompterOpen: any, isDark: boolean, t: any }) => {
  const [timer, setTimer] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimer(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsTimerRunning(prev => !prev);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimer(180);
    const container = document.getElementById('teleprompter-scroll-container');
    if (container) container.scrollTop = 0;
  };

  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const controlBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bgColor, zIndex: 999999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <button onClick={() => setIsTeleprompterOpen(false)} style={{ position: 'absolute', top: '2rem', left: '2rem', background: controlBg, color: textColor, border: 'none', padding: '0.75rem 1.5rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}>
        <ArrowLeft size={20} /> {t('btn_back', 'Retour')}
      </button>
      
      <div id="teleprompter-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '8rem 2rem 15rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollbarWidth: 'thin' }}>
        {fullPitchText.split('\n\n').map((p: string, i: number) => (
          <p key={i} style={{ maxWidth: '800px', width: '100%', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem', color: textColor, textAlign: 'center' }}>{p}</p>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', background: bgColor, padding: '1rem 2rem', borderRadius: '1rem', boxShadow: isDark ? '0 -10px 40px rgba(255,255,255,0.05)' : '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 100000, border: `1px solid ${controlBg}` }}>
        <div style={{ background: controlBg, padding: '0.5rem 1.5rem', borderRadius: '2rem', fontSize: '2rem', color: textColor, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {formatTime(timer)}
        </div>
        <button onClick={toggleTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isTimerRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
        </button>
        <button onClick={resetTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={24} />
        </button>
      </div>
    </div>,
    document.body
  );
};

export const InterviewTab = () => {
  const { pitchResult, questionsResult, customScenariosResult, globalStatus, cvData, updateFormData } = useDashboard();
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false); // État pour le téléprompteur
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));
  const [activePitchKey, setActivePitchKey] = useState('three_minutes'); // [FIX] Le pitch par défaut est maintenant celui de 3 minutes
  const [activePitchGroup, setActivePitchGroup] = useState('core_pitches');
  const [editablePitch, setEditablePitch] = useState({
    written: "",
    oral: "",
    accroche: "", preuve: "", valeur: "", projection: ""
  });

  useEffect(() => {
    console.log('--- Pitch Result (Final Debug) ---');
    console.log(JSON.stringify(pitchResult, null, 2));
    if (pitchResult) {
      const savedEditablePitch = cvData?.editablePitch;
      if (savedEditablePitch && Object.values(savedEditablePitch).some(v => v)) {
        setEditablePitch(savedEditablePitch); // Restaure les modifications de l'utilisateur
      } else {
        // [FIX] On charge le pitch de 3 minutes par défaut au premier chargement
        populateFieldsFromMatrix(pitchResult, 'three_minutes', 'core_pitches');
      }
    }
  }, [pitchResult]);

  // Peuple les 4 champs à partir de la matrice de l'IA
  const populateFieldsFromMatrix = (matrix: any, pitchKey: string, pitchGroup: string) => {
    const pitchData = matrix?.[pitchGroup]?.[pitchKey];
    if (!pitchData) return;

    // La nouvelle structure est plus simple : on a toujours `oral` et `written`.
    // On utilise le texte oral pour le découper en 4 champs éditables.
    const fullText = pitchData.oral || pitchData.written || '';

    const newEditablePitch = {
      written: pitchData.written || '',
      oral: pitchData.oral || '',
      full_text: fullText // [NOUVEAU] On stocke le texte complet pour l'édition
    };

    setEditablePitch(newEditablePitch);

    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  // Gère le changement dans un des 4 champs
  const handlePitchChange = (newText: string) => {
    const newEditablePitch = { ...editablePitch, full_text: newText };
    setEditablePitch(newEditablePitch);
    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  const currentPitchData = pitchResult?.[activePitchGroup]?.[activePitchKey];
  const coachingAngle = currentPitchData?.angle || currentPitchData?.goal || pitchResult?.coaching_notes?.strongest_angle || null;


  // Le texte du téléprompteur est maintenant directement le champ éditable
  const fullPitchText = editablePitch.full_text || "";

  const handleResetPitch = () => {
    if (!window.confirm(t('confirm_reset_pitch', "Voulez-vous vraiment annuler vos modifications et restaurer le pitch original généré par l'IA ?"))) return;
    // On repeuple les champs avec la version sélectionnée actuellement
    if (pitchResult) {
      populateFieldsFromMatrix(pitchResult, activePitchKey, activePitchGroup);
    }
  };

  const handlePurgeCache = async () => {
    if (window.confirm(t('confirm_purge', "Voulez-vous effacer vos anciennes réponses et forcer l'IA à regénérer un nouveau set de questions au prochain chargement ?"))) {
      try {
        await authenticatedFetch(`${API_BASE_URL}/api/cv/cache?content_type=interview_questions`, { method: 'DELETE' });
        await authenticatedFetch(`${API_BASE_URL}/api/cv/cache?content_type=extra_scenarios`, { method: 'DELETE' });
        alert(t('purge_success', "Cache purgé. Veuillez rafraîchir la page (F5) pour générer de nouvelles questions vierges."));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Extraction ultra-robuste des questions pour pallier les variations de structure (encapsulation IA)
  const getQuestionsArray = (data: any): any[] => {
    if (!data) return [];
    
    // 1. Déballage d'un potentiel { result: ... } du polling
    let actualData = data.result !== undefined ? data.result : data;
    
    // [FIX EXPERT] Boucle de désérialisation pour détruire la double/triple stringification
    // Fréquent lors de l'enregistrement de JSON stringifié dans des colonnes JSONB (PostgreSQL)
    let depth = 0;
    while (typeof actualData === 'string' && depth < 7) {
        try {
            const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            actualData = JSON.parse(match ? match[1] : actualData);
            depth++;
        } catch(e) {
            break;
        }
    }
    
    if (Array.isArray(actualData)) return actualData;
    
    const payload = actualData.interview_questions_result || actualData.interview_questions || actualData;
    if (Array.isArray(payload)) return payload;
    
    // 1. Cherche un format exact connu (ex: interview_prep)
    if (payload?.interview_prep && typeof payload.interview_prep === 'object') {
      if (Array.isArray(payload.interview_prep)) return payload.interview_prep;
      const allQuestions: any[] = [];
      Object.values(payload.interview_prep).forEach(val => {
        if (Array.isArray(val)) allQuestions.push(...val);
      });
      if (allQuestions.length > 0) return allQuestions;
    }

    if (payload?.questions && Array.isArray(payload.questions)) return payload.questions;

    // 2. Recherche récursive d'un tableau contenant des objets avec une clé "question"
    const extractQuestionsDeep = (obj: any): any[] => {
        if (!obj || typeof obj !== 'object') return [];
        let found: any[] = [];
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (Array.isArray(val)) {
                if (val.length > 0 && typeof val[0] === 'object' && val[0].question) {
                    found = found.concat(val);
                }
            } else if (typeof val === 'object' && val !== null) {
                found = found.concat(extractQuestionsDeep(val));
            }
        }
        return found;
    };

    const deepExtracted = extractQuestionsDeep(payload);
    if (deepExtracted.length > 0) return deepExtracted;

    // 3. Fallback: on retourne le premier tableau trouvé dans l'objet
    return (Object.values(payload).find(v => Array.isArray(v)) as any[]) || [];
  };

  const handleTabClick = (pitchKey: string, pitchGroup: string) => {
    setActivePitchKey(pitchKey);
    setActivePitchGroup(pitchGroup);
    // Au clic, on met à jour les 4 champs avec le contenu correspondant
    populateFieldsFromMatrix(pitchResult, pitchKey, pitchGroup);
  };

  // Convertir les Mises en Situation (MES) en format "Question" pour les fusionner
  const getScenariosAsQuestions = (data: any): any[] => {
    if (!data) return [];
    let actualData = data.result !== undefined ? data.result : data;
    let depth = 0;
    while (typeof actualData === 'string' && depth < 7) {
        try {
            const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            actualData = JSON.parse(match ? match[1] : actualData);
            depth++;
        } catch(e) { break; }
    }
    
    const scenarios: any[] = [];
    const extractDeep = (obj: any, currentCategory: string = "Mise en situation") => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(item => extractDeep(item, currentCategory));
        } else {
            if (obj.scenario || obj.question || obj.situation || obj.text || obj.contexte || obj.description || obj.defi) {
                scenarios.push({
                    category: "SCÉNARIO : " + currentCategory.toUpperCase(),
                    question: obj.scenario || obj.question || obj.situation || obj.text || obj.contexte || obj.description || obj.defi,
                    suggested_answer: obj.expected_behavior || obj.suggested_answer || obj.answer || obj.solution || "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer votre réponse.",
                    advice: obj.advice || obj.context || obj.rationale || obj.strategy || obj.feedback || "Cette mise en situation évalue vos réflexes professionnels.",
                    user_answer: obj.user_answer,
                    evaluation: obj.feedback || obj.evaluation
                });
            } else {
                const cat = obj.category || obj.theme || obj.title || currentCategory;
                Object.values(obj).forEach(v => extractDeep(v, cat));
            }
        }
    };
    extractDeep(actualData);
    return scenarios;
  };

  const questionsArray = getQuestionsArray(questionsResult);
  
  const standardQuestions = questionsArray.filter(q => q.category !== "Questions à poser au recruteur" && q.category !== "Questions to Ask Recruiter");
  const smartQuestions = questionsArray.filter(q => q.category === "Questions à poser au recruteur" || q.category === "Questions to Ask Recruiter");
  
  const scenariosArray = getScenariosAsQuestions(customScenariosResult);
  const mergedQuestions = [...questionsArray, ...scenariosArray];

  return (
    <>
      {isTeleprompterOpen && <Teleprompter fullPitchText={fullPitchText} isDark={isDark} setIsTeleprompterOpen={setIsTeleprompterOpen} t={t} />}
      <div className="interview-tab-container">
        
        <div id="pitch_section">
        <DashboardCard
          title={t('deliv_pitch', "Matrice de Pitchs")}
          icon={<Mic size={24} />}
          loading={globalStatus === 'PROCESSING' && !pitchResult}
          loadingText={t('pitch_loading', "Génération de votre pitch...")}
          error={pitchResult?.error || (!pitchResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED'))}
          errorText={pitchResult?.message ? `Erreur IA : ${pitchResult.message}` : t('pitch_error', "Le pitch n'a pas pu être généré.")}
          featureId="pitch_3_min"
          headerAction={pitchResult && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleResetPitch} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Restaurer le pitch généré par l'IA">
                <RotateCcw size={16} /> {t('btn_reset', 'Réinitialiser')}
              </button>
              <button className="btn-primary" onClick={() => setIsTeleprompterOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <Play size={16} /> {t('teleprompter_mode', 'Téléprompteur')}
              </button>
            </div>
          )}
        >
          {pitchResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* --- NOUVELLE INTERFACE À ONGLETS --- */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h6 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Format</h6>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleTabClick('thirty_seconds', 'core_pitches')} className={`btn-tab-pitch ${activePitchKey === 'thirty_seconds' ? 'active' : ''}`}><Clock size={14}/> 30s</button>
                    <button onClick={() => handleTabClick('three_minutes', 'core_pitches')} className={`btn-tab-pitch ${activePitchKey === 'three_minutes' ? 'active' : ''}`}><Clock size={14}/> 3min</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h6 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Par Audience</h6>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button onClick={() => handleTabClick('role_fit_pitch', 'audience_adaptations')} className={`btn-tab-pitch ${activePitchKey === 'role_fit_pitch' ? 'active' : ''}`}><Briefcase size={14}/> Manager</button>
                    <button onClick={() => handleTabClick('business_impact_pitch', 'audience_adaptations')} className={`btn-tab-pitch ${activePitchKey === 'business_impact_pitch' ? 'active' : ''}`}><Building size={14}/> Dirigeant</button>
                    <button onClick={() => handleTabClick('culture_fit_pitch', 'audience_adaptations')} className={`btn-tab-pitch ${activePitchKey === 'culture_fit_pitch' ? 'active' : ''}`}><Users size={14}/> RH</button>
                    <button onClick={() => handleTabClick('objection_handling_pitch', 'audience_adaptations')} className={`btn-tab-pitch ${activePitchKey === 'objection_handling_pitch' ? 'active' : ''}`}><Shield size={14}/> Anti-Failles</button>
                  </div>
                </div>
              </div>

              {/* --- NOUVEAU BLOC DE COACHING --- */}
              {coachingAngle && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', animation: 'fadeIn 0.4s ease-out' }}>
                  <Lightbulb size={18} />
                  <div>
                    <strong>Angle stratégique :</strong>
                    <p>{coachingAngle}</p>
                  </div>
                </div>
              )}


              {/* --- BLOC DES 4 CHAMPS ÉDITABLES --- */}
              {/* --- [NOUVEAU] Champ d'édition unique --- */}
              <div className="pitch-single-field" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <textarea
                  className="pitch-textarea"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
                  value={fullPitchText}
                  onChange={e => handlePitchChange(e.target.value)}
                  rows={12}
                />
              </div>
              
              {/* NOUVEAU MODULE D'ENTRAÎNEMENT ORAL DU PITCH */}
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                {t('teleprompter_pitch_hint', "Le téléprompteur utilisera le contenu de la version orale que vous avez sélectionnée et modifiée ci-dessus.")}
              </p>
              <PitchOralTrainer />
            </div>
          )}
        </DashboardCard>
        </div>

        <div id="questionnaire_section">
        <DashboardCard
          title={t('deliv_questions', "Questions & Mises en situation")}
          icon={<MessageSquare size={24} />}
          loading={globalStatus === 'PROCESSING' && !questionsResult}
          loadingText={t('questions_loading', "Génération des questions...")}
          error={!!questionsResult?.error || (!questionsResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED'))}
          errorText={questionsResult?.error ? `Erreur IA : ${typeof questionsResult.error === 'boolean' ? "Limite de contexte atteinte (données trop lourdes)." : questionsResult.error}` : t('questions_error', "Le questionnaire n'a pas pu être généré.")}
          featureId="interview_questions"
          headerAction={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handlePurgeCache} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Effacer l'historique d'entraînement du profil">
                <RotateCcw size={16} /> Purger le cache
              </button>
            </div>
          }
        >
          {questionsResult && (
            <>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontStyle: "italic", background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                * Légende : ★ (1-Facile) à ★★★★★ (5-Très Difficile)
              </div>
              {mergedQuestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {standardQuestions.length > 0 && (
                        <Questionnaire questions={standardQuestions} hideHeader={true} />
                  )}
                  {scenariosArray.length > 0 && (
                    <div id="mes_anchor"><Questionnaire questions={scenariosArray} hideHeader={true} /></div>
                  )}
                      {smartQuestions.length > 0 && (
                        <SmartQuestionsList questions={smartQuestions} />
                      )}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Les questions sont en cours d'analyse ou n'ont pas pu être formatées correctement.
                </div>
              )}
            </>
          )}
        </DashboardCard>
        </div>

        <div id="negotiation_section">
          <SalaryNegotiator />
        </div>

      </div>
    </>
  );
};