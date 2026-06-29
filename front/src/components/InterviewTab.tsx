import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard, } from './DashboardContext';
import { Mic, MessageSquare, Play, Pause, RotateCcw, BrainCircuit, ArrowLeft, Loader2, RefreshCw, Lightbulb, Shield, Users, Briefcase, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import { SituationSimulator } from './SituationSimulator';
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
  const { pitchResult, questionsResult, customScenariosResult, globalStatus, cvData, updateFormData, purgeCacheMutation } = useDashboard();
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));
  const [pitchMatrix, setPitchMatrix] = useState<any>(pitchResult || null);
  const [activePitch, setActivePitch] = useState('pitch_3_minutes');
  const [editablePitch, setEditablePitch] = useState({
    accroche: "",
    preuve: "",
    valeur: "",
    projection: ""
  });

  useEffect(() => {
    if (pitchResult) {
      const savedEditablePitch = cvData?.editablePitch;
      if (savedEditablePitch && Object.values(savedEditablePitch).some(v => v)) {
        setEditablePitch(savedEditablePitch);
      } else {
        // On charge le pitch stratégique par défaut (`pitch_3_minutes`)
        populateFieldsFromMatrix(pitchResult, 'pitch_3_minutes');
      }
    }
  }, [pitchResult]);

  // Peuple les 4 champs à partir de la matrice de l'IA
  const populateFieldsFromMatrix = (matrix: any, pitchType: string) => {
    const pitchData = matrix?.[pitchType];
    if (!pitchData) return;

    let newFields;
    if (pitchData.full_text) {
      // Pour les formats courts, on met tout dans le premier champ
      newFields = { accroche: pitchData.full_text, preuve: '', valeur: '', projection: '' };
    } else {
      // Pour les formats structurés, on utilise les clés directement
      newFields = { accroche: pitchData.accroche || '', preuve: pitchData.preuve || '', valeur: pitchData.valeur || '', projection: pitchData.projection || '' };
    }

    setEditablePitch(newFields);
    if (updateFormData) {
      updateFormData('editablePitch', newFields);
    }
  };

  // Gère le changement dans un des 4 champs
  const handleFieldChange = (field: keyof typeof editablePitch, value: string) => {
    const newEditablePitch = { ...editablePitch, [field]: value };
    setEditablePitch(newEditablePitch);
    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  // Définir les formats de pitch qui doivent utiliser une seule zone de texte
  const shortPitchFormats = ['pitch_30_seconds', 'networking_pitch'];
  const isShortFormat = shortPitchFormats.includes(activePitch);

  // Le texte du téléprompteur est la concaténation des 4 champs éditables
  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  const handleResetPitch = () => {
    if (!window.confirm(t('confirm_reset_pitch', "Voulez-vous vraiment annuler vos modifications et restaurer le pitch original généré par l'IA ?"))) return;
    // On repeuple les champs avec la version sélectionnée actuellement
    if (pitchResult) {
      populateFieldsFromMatrix(pitchResult, activePitch);
    }
  };

  const handlePurgeCache = async () => {
    if (window.confirm(t('confirm_purge', "Voulez-vous effacer vos anciennes réponses et forcer l'IA à regénérer un nouveau set de questions au prochain chargement ?"))) {
      purgeCacheMutation.mutate('interview_questions');
      purgeCacheMutation.mutate('extra_scenarios');
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

  const handleTabClick = (pitchType: string) => {
    setActivePitch(pitchType);
    // Au clic, on met à jour les 4 champs avec le contenu correspondant
    populateFieldsFromMatrix(pitchMatrix, pitchType);
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
          title={t('deliv_pitch', "Pitch de 3 minutes")}
          icon={<Mic size={24} />}
          loading={globalStatus === 'PROCESSING' && !pitchResult}
          loadingText={t('pitch_loading', "Génération de votre pitch...")}
          error={!pitchResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED')}
          errorText={t('pitch_error', "Le pitch n'a pas pu être généré.")}
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
              <div className="pitch-selector-container">
                <div className="pitch-selector-group">
                  <h6 className="pitch-selector-title">Format</h6>
                  <div className="pitch-selector-tabs">
                    <button onClick={() => handleTabClick('pitch_30_seconds')} className={activePitch === 'pitch_30_seconds' ? 'active' : ''}><Clock size={16}/> 30 sec</button>
                    <button onClick={() => handleTabClick('pitch_1_minute')} className={activePitch === 'pitch_1_minute' ? 'active' : ''}><Clock size={16}/> 1 min</button>
                    <button onClick={() => handleTabClick('pitch_3_minutes')} className={activePitch === 'pitch_3_minutes' ? 'active' : ''}><Clock size={16}/> Stratégique</button>
                  </div>
                </div>
                <div className="pitch-selector-group">
                  <h6 className="pitch-selector-title">Par Audience</h6>
                  <div className="pitch-selector-tabs">
                    <button onClick={() => handleTabClick('recruiter_pitch')} className={activePitch === 'recruiter_pitch' ? 'active' : ''}><Briefcase size={16}/> Recruteur</button>
                    <button onClick={() => handleTabClick('executive_pitch')} className={activePitch === 'executive_pitch' ? 'active' : ''}><Building size={16}/> Dirigeant</button>
                    <button onClick={() => handleTabClick('hr_pitch')} className={activePitch === 'hr_pitch' ? 'active' : ''}><Users size={16}/> RH</button>
                    <button onClick={() => handleTabClick('networking_pitch')} className={activePitch === 'networking_pitch' ? 'active' : ''}><Users size={16}/> Réseau</button>
                    <button onClick={() => handleTabClick('anti_flaw_pitch')} className={activePitch === 'anti_flaw_pitch' ? 'active' : ''}><Shield size={16}/> Anti-Failles</button>
                  </div>
                </div>
              </div>

              {/* --- BLOC DES 4 CHAMPS ÉDITABLES --- */}
              {isShortFormat ? (
                // --- VUE POUR FORMATS COURTS (30s, Réseau) ---
                <div className="pitch-single-field" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <textarea
                    className="pitch-textarea"
                    value={editablePitch.accroche} // Pour les formats courts, tout est dans 'accroche'
                    onChange={e => {
                      // On met à jour uniquement le champ 'accroche'
                      handleFieldChange('accroche', e.target.value);
                    }}
                    rows={10}
                  />
                </div>
              ) : (
                // --- VUE POUR FORMATS LONGS (Structure en 4 parties) ---
                <div className="pitch-grid" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <div className="pitch-card"><h4>{t('pitch_hook', 'Accroche')}</h4><textarea className="pitch-textarea" value={editablePitch.accroche} onChange={e => handleFieldChange('accroche', e.target.value)} /></div>
                  <div className="pitch-card"><h4>{t('pitch_proof', 'Preuve & Impact')}</h4><textarea className="pitch-textarea" value={editablePitch.preuve} onChange={e => handleFieldChange('preuve', e.target.value)} /></div>
                  <div className="pitch-card"><h4>{t('pitch_value', 'Valeur Ajoutée')}</h4><textarea className="pitch-textarea" value={editablePitch.valeur} onChange={e => handleFieldChange('valeur', e.target.value)} /></div>
                  <div className="pitch-card"><h4>{t('pitch_projection', 'Projection')}</h4><textarea className="pitch-textarea" value={editablePitch.projection} onChange={e => handleFieldChange('projection', e.target.value)} /></div>
                </div>
              )}
              
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
              <button onClick={handlePurgeCache} disabled={purgeCacheMutation.isPending} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Effacer l'historique d'entraînement du profil">
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
                        <div style={{ marginTop: '1rem' }}>
                          <h3 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                            <Lightbulb size={22} color="var(--primary)" /> Vos questions de fin d'entretien
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {smartQuestions.map((q, idx) => (
                              <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '1rem', textTransform: 'uppercase' }}>
                                  {q.axis || "Stratégie"}
                                </span>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '1.25rem 0' }}>
                                  {q.question}
                                </h4>
                                <div style={{ background: 'var(--bg-card)', borderLeft: '4px solid #f59e0b', borderRadius: '0 0.5rem 0.5rem 0', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid var(--border-color)', borderLeftWidth: '4px' }}>
                                  <span style={{ fontSize: '1.25rem' }}>💡</span>
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pourquoi la poser ?</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{q.intention || q.advice || q.suggested_answer}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
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