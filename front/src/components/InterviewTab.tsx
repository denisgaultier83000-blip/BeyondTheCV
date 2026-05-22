import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { Mic, MessageSquare, Play, Pause, RotateCcw, BrainCircuit, ArrowLeft, History, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import { SituationSimulator } from './SituationSimulator';
import Questionnaire from './Questionnaire';
import Flashcards from './Flashcards';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';

export const InterviewTab = () => {
  const { pitchResult, questionsResult, customScenariosResult, globalStatus, cvData } = useDashboard();
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [pitchAnalysis, setPitchAnalysis] = useState<any>(null);
  const [isEvaluatingPitch, setIsEvaluatingPitch] = useState(false);

  const [editablePitch, setEditablePitch] = useState<{accroche: string, preuve: string, valeur: string, projection: string}>({
    accroche: "", preuve: "", valeur: "", projection: ""
  });

  useEffect(() => {
    if (pitchResult) {
      const p = pitchResult?.pitch || pitchResult;
      setEditablePitch({
        accroche: p?.accroche || "",
        preuve: p?.preuve || "",
        valeur: p?.valeur || "",
        projection: p?.projection || ""
      });
      setPitchAnalysis(p?.analysis || null);
    }
  }, [pitchResult]);

  const handlePitchChange = (field: keyof typeof editablePitch, value: string) => {
    setEditablePitch(prev => ({ ...prev, [field]: value }));
  };

  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  // --- LOGIQUE TÉLÉPROMPTEUR DÉPLACÉE ICI ---
  const Teleprompter = () => {
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
          {fullPitchText.split('\n\n').map((p, i) => (
            <p key={i} style={{ maxWidth: '800px', width: '100%', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem', color: textColor, textAlign: 'center' }}>{p}</p>
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

  const handleEvaluatePitch = async () => {
    setIsEvaluatingPitch(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/evaluate-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...editablePitch, 
          target_job: cvData?.target_job || cvData?.target_role_primary || 'Candidat',
          target_language: cvData?.target_language || 'fr'
        })
      });
      const data = await res.json();
      if (data.analysis) {
        setPitchAnalysis(data.analysis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluatingPitch(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/interview/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history || []);
      }
    } catch (e) {
      console.error("Erreur de récupération de l'historique", e);
    }
  };

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

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
            if (obj.scenario || obj.question) {
                scenarios.push({
                    category: "SCÉNARIO : " + currentCategory.toUpperCase(),
                    question: obj.scenario || obj.question,
                    suggested_answer: obj.expected_behavior || obj.suggested_answer || obj.answer || "Conseil : Utilisez la méthode STAR pour structurer votre réponse.",
                    advice: obj.advice || obj.context || obj.rationale || "Cette mise en situation évalue vos réflexes professionnels.",
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

  const mergedQuestions = [...getQuestionsArray(questionsResult), ...getScenariosAsQuestions(customScenariosResult)];

  return (
    <>
      {isTeleprompterOpen && <Teleprompter />}
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
            <button className="btn-primary" onClick={() => setIsTeleprompterOpen(true)}>
              <Play size={16} style={{ marginRight: '0.5rem' }} /> {t('teleprompter_mode', 'Mode Téléprompteur')}
            </button>
          )}
        >
          {pitchResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="pitch-grid">
                <div className="pitch-card"><h4>{t('pitch_hook', 'Accroche')}</h4><textarea className="pitch-textarea" value={editablePitch.accroche} onChange={e => handlePitchChange('accroche', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_proof', 'Preuve & Impact')}</h4><textarea className="pitch-textarea" value={editablePitch.preuve} onChange={e => handlePitchChange('preuve', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_value', 'Valeur Ajoutée')}</h4><textarea className="pitch-textarea" value={editablePitch.valeur} onChange={e => handlePitchChange('valeur', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_projection', 'Projection')}</h4><textarea className="pitch-textarea" value={editablePitch.projection} onChange={e => handlePitchChange('projection', e.target.value)} /></div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BrainCircuit size={18} color="var(--primary)" /> Évaluation de votre Pitch
                  </h4>
                  <button onClick={handleEvaluatePitch} disabled={isEvaluatingPitch} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                    {isEvaluatingPitch ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                    {isEvaluatingPitch ? "Analyse en cours..." : "Analyser mon Pitch"}
                  </button>
                </div>
                
                {pitchAnalysis && (
                  <ScoreGauge 
                    score={Number(pitchAnalysis.global_score) || 0} 
                    label={t('pitch_impact_score', "Score d'Impact du Pitch")} 
                    critique={pitchAnalysis.critique}
                    metrics={[
                      { label: "Structure", value: pitchAnalysis.structure || "N/A" },
                      { label: "Clarté", value: pitchAnalysis.clarity || "N/A" },
                      { label: "Conviction", value: pitchAnalysis.conviction || "N/A" }
                    ]}
                  />
                )}
              </div>
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
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <History size={16} /> {showHistory ? "Masquer les archives" : "Archives de mes réponses"}
            </button>
          }
        >
          {showHistory && (
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Historique de vos réponses</h3>
              {historyData.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Aucune réponse enregistrée pour le moment.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {historyData.map((item, idx) => (
                    <div key={idx} style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{new Date(item.created_at).toLocaleDateString()} - Score : {item.score}/100</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Q : {item.question}</div>
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>R : "{item.user_answer}"</div>
                      <div style={{ color: '#166534', background: '#dcfce7', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.9rem' }}>Feedback : {item.feedback?.improved_answer || "Bonne réponse."}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {questionsResult && !showHistory && (
            <>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontStyle: "italic", background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                * Légende : ★ (1-Facile) à ★★★★★ (5-Très Difficile)
              </div>
              {mergedQuestions.length > 0 ? (
                <Questionnaire questions={mergedQuestions} hideHeader={true} />
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Les questions sont en cours d'analyse ou n'ont pas pu être formatées correctement.
                </div>
              )}
            </>
          )}
        </DashboardCard>
        </div>

      </div>
    </>
  );
};