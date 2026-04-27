import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, MessageSquare, Printer, ArrowLeft, CheckCircle2, Lightbulb, Eye, EyeOff, Edit3, Mic, MicOff, Send, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { useDashboard } from './DashboardContext';

interface QuestionnaireProps {
  questions: any[];
  onBack?: () => void;
  onPrint?: (questions: any[]) => void;
  onUpdate?: (index: number, field: string, value: any) => void;
  loading?: boolean;
  hideHeader?: boolean;
  storageKeyPrefix?: string; // "interview" ou "training"
  evalEndpoint?: string; // Route API spécifique si besoin
  onEvaluateSuccess?: () => void;
}

export default function Questionnaire({ questions, onBack, onPrint, onUpdate, loading, hideHeader, storageKeyPrefix = "interview", evalEndpoint, onEvaluateSuccess }: QuestionnaireProps) {
  const { t } = useTranslation();
  
  // --- GESTION DE LA PERSISTANCE (GLOBAL STATE) ---
  let dashboard: any = null;
  try { dashboard = useDashboard(); } catch(e) {} // Évite le crash si utilisé hors du Dashboard
  const cvData = dashboard?.cvData;
  const updateFormData = dashboard?.updateFormData;
  
  const userAnswersKey = `${storageKeyPrefix}UserAnswers`;
  const feedbacksKey = `${storageKeyPrefix}Feedbacks`;

  // Nouveaux états pour le mode interactif (Entraînement)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [activeMode, setActiveMode] = useState<Record<string, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(cvData?.[userAnswersKey] || {});
  const [isRecording, setIsRecording] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, any>>(cvData?.[feedbacksKey] || {});
  const [showFeedbackDetails, setShowFeedbackDetails] = useState<Record<string, boolean>>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const getKey = (q: any, idx: number): string => q.id || idx.toString();

  useEffect(() => {
    if (cvData?.[userAnswersKey]) setUserAnswers(cvData[userAnswersKey]);
    if (cvData?.[feedbacksKey]) setFeedbacks(cvData[feedbacksKey]);
  }, [cvData?.[userAnswersKey], cvData?.[feedbacksKey], userAnswersKey, feedbacksKey]);

  const toggleReveal = (qKey: string) => {
    setRevealed(prev => ({ ...prev, [qKey]: !prev[qKey] }));
  };
  
  const getScoreTheme = (score100?: number) => {
    if (score100 === undefined) return { border: 'var(--border-color)', bg: 'var(--bg-card)', text: 'var(--text-muted)' };
    if (score100 >= 75) return { border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' };
    if (score100 >= 50) return { border: '#eab308', bg: 'rgba(234, 179, 8, 0.05)', text: '#eab308' };
    return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', text: '#ef4444' };
  };

  const handleRetry = (qKey: string) => {
    const newF = {...feedbacks}; delete newF[qKey];
    const newA = {...userAnswers}; delete newA[qKey];
    setFeedbacks(newF); setUserAnswers(newA);
    if (updateFormData) { updateFormData(feedbacksKey, newF); updateFormData(userAnswersKey, newA); }
    
    setActiveMode(prev => ({...prev, [qKey]: true}));
    setShowFeedbackDetails(prev => ({...prev, [qKey]: false}));
  };

  // --- GESTION DE LA RECONNAISSANCE VOCALE ---
  const toggleRecording = (qKey: string) => {
    if (isRecording === qKey) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(null);
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur actuel.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baselineAnswer = userAnswers[qKey] || "";

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
         baselineAnswer += (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + finalTranscript;
         setUserAnswers(prev => ({ ...prev, [qKey]: baselineAnswer + interimTranscript }));
      } else {
         setUserAnswers(prev => ({ ...prev, [qKey]: baselineAnswer + (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + interimTranscript }));
      }
    };

    recognition.onerror = () => setIsRecording(null);
    recognition.onend = () => setIsRecording(null);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(qKey);
    } catch (e) {
      setIsRecording(null);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // --- SOUMISSION DE LA RÉPONSE À L'IA ---
  const handleSubmit = async (qKey: string, q: any) => {
    const answer = userAnswers[qKey];
    if (!answer) return;
    
    setIsSubmitting(qKey);
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}${evalEndpoint || '/api/cv/evaluate-interview-answer'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            question: q.question, 
            category: q.category, 
            suggested_framework: q.suggested_answer,
            user_answer: answer,
            // Ajouts spécifiques pour garantir la compatibilité avec la route d'entraînement
            theme: q.category,
            question_type: q.type,
            question_text: q.question
        }),
      });
      
      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      const newFeedbacks = { ...feedbacks, [qKey]: data.feedback };
      setFeedbacks(newFeedbacks);
      
      // Sauvegarde persistante du résultat et de la réponse
      if (updateFormData) {
          updateFormData(feedbacksKey, newFeedbacks);
          updateFormData(userAnswersKey, { ...userAnswers, [qKey]: answer });
      }
      setShowFeedbackDetails(prev => ({ ...prev, [qKey]: true }));
      setActiveMode(prev => ({ ...prev, [qKey]: false }));
      
      if (onEvaluateSuccess) onEvaluateSuccess();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'évaluation par l'IA. La route backend doit être configurée.");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className={hideHeader ? "" : "step-content"} style={{ maxWidth: '1200px', margin: '0 auto', padding: hideHeader ? '0' : '20px' }}>
      {!hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          {onBack ? (
            <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> {t('back_productions') || 'Retour'}
            </button>
          ) : <div />}
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
            <MessageSquare size={28} color="var(--primary)" />
            {t('card_interview_title') || 'Questionnaire d\'Entretien'}
          </h2>
          {onPrint ? (
            <button onClick={() => onPrint(questions)} className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> {loading ? t('generating') : (t('print') || 'Imprimer')}
            </button>
          ) : <div />}
        </div>
      )}

      <style>{`
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .staggered-card { animation: slideUpFade 0.5s ease-out forwards; opacity: 0; }
      `}</style>

      {/* Affichage pleine largeur (1fr) pour plus de lisibilité avec animation en cascade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {questions.map((q, idx) => {
          const qKey = getKey(q, idx);
          const isRevealed = revealed[qKey];
          const isActive = activeMode[qKey];
          const feedback = feedbacks[qKey];
          const isRecordingThis = isRecording === qKey;
          const isSubmittingThis = isSubmitting === qKey;
          const isDone = !!feedback;
          const theme = getScoreTheme(feedback?.score);
          const showFeedback = showFeedbackDetails[qKey];
          const isHovered = hoveredCard === qKey;

          return (
          <div key={idx} className="staggered-card" style={{ 
            background: isDone && !showFeedback ? theme.bg : 'var(--bg-card)', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            border: isDone && !showFeedback ? `2px solid ${theme.border}` : '1px solid var(--border-color)',
            boxShadow: isHovered ? (isDone && !showFeedback ? `0 10px 15px -3px ${theme.border}40` : '0 10px 15px -3px rgba(0,0,0,0.05)') : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'all 0.2s ease-in-out',
            cursor: 'default',
            animationDelay: `${idx * 0.1}s`,
            transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
          }}
          onMouseEnter={() => setHoveredCard(qKey)}
          onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ 
                  background: isDone ? theme.border + '20' : '#eff6ff', 
                  padding: '0.6rem', 
                  borderRadius: '10px', 
                  color: isDone ? theme.border : 'var(--primary)',
                  flexShrink: 0
                }}>
                  <HelpCircle size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                      {q.category || 'Question'}
                    </span>
                    {q.trap_type && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {q.trap_type}
                      </span>
                    )}
                    {q.difficulty && <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }} title="Difficulté">{q.difficulty}</span>}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '600' }}>
                    {q.question}
                  </h3>
                </div>
              </div>
              {isDone && !showFeedback && (
                 <div style={{ background: theme.border, color: 'white', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                   {(feedback.score / 10).toFixed(1)} / 10
                 </div>
              )}
            </div>

            {/* BOUTONS D'ACTION (Si ni révélé, ni en mode actif, ni feedback) */}
            {!isRevealed && !isActive && !feedback && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => toggleReveal(qKey)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  <Eye size={16} /> {t('q_read_mode', 'Mode Lecture (Voir la suggestion)')}
                </button>
                <button onClick={() => setActiveMode(prev => ({...prev, [qKey]: true}))} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem', background: '#8b5cf6', borderColor: '#8b5cf6', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}>
                  <Edit3 size={16} /> {t('q_practice_mode', "S'entraîner (Micro / Texte)")}
                </button>
              </div>
            )}

            {/* SI DONE ET COLLAPSED */}
            {isDone && !showFeedback && (
              <div style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <span onClick={() => setShowFeedbackDetails(prev => ({...prev, [qKey]: true}))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.border, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                    <Eye size={16} /> {t('q_view_eval', 'Voir mon évaluation')}
                  </span>
                  <span onClick={() => handleRetry(qKey)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <RefreshCw size={16} /> {t('q_retry', 'Refaire cette question')}
                  </span>
                </div>
              </div>
            )}

            {/* MODE ACTIF (Entraînement) */}
            {isActive && !feedback && (
              <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Edit3 size={18} color="#8b5cf6" /> {t('q_write_dictate', 'Rédigez ou dictez votre réponse')}
                    </div>
                    <button 
                      onClick={() => toggleRecording(qKey)}
                      className={`btn-${isRecordingThis ? 'primary' : 'secondary'}`} 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: isRecordingThis ? '#ef4444' : undefined, borderColor: isRecordingThis ? '#ef4444' : undefined, color: isRecordingThis ? 'white' : undefined, animation: isRecordingThis ? 'pulse-record 1.5s infinite' : 'none' }}
                    >
                      {isRecordingThis ? <MicOff size={16} /> : <Mic size={16} />}
                      {isRecordingThis ? t('q_stop_recording', "Arrêter") : t('q_voice_answer', "Répondre à la voix")}
                    </button>
                 </div>
                 
                 <textarea 
                    value={userAnswers[qKey] || ""}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [qKey]: e.target.value }))}
                    onBlur={() => updateFormData && updateFormData(userAnswersKey, { ...userAnswers })}
                    placeholder={t('q_answer_placeholder', "Commencez à parler ou tapez votre réponse ici...")}
                    rows={4}
                    disabled={isSubmittingThis}
                    style={{ width: '100%', background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', outline: 'none', marginBottom: '1rem' }}
                 />

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setActiveMode(prev => ({...prev, [qKey]: false}))} className="btn-ghost" style={{ fontSize: '0.85rem' }} disabled={isSubmittingThis}>{t('btn_cancel', 'Annuler')}</button>
                    <button onClick={() => handleSubmit(qKey, q)} disabled={!(userAnswers[qKey] || "").trim() || isSubmittingThis} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      {isSubmittingThis ? <><Loader2 size={16} className="spin" /> {t('q_ai_analyzing', 'Analyse IA en cours...')}</> : <><Send size={16} /> {t('q_analyze_answer', 'Analyser ma réponse')}</>}
                    </button>
                 </div>
              </div>
            )}

            {/* FEEDBACK IA APRÈS ENTRAÎNEMENT */}
            {isDone && showFeedback && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <ScoreGauge score={feedback.score / 10} label={t('q_impact_score', "Impact de la réponse")} />
                    <div style={{ flex: 1 }}>
                       <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{t('q_ai_diagnostic', 'Diagnostic IA')}</h4>
                       <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                         {feedback.score >= 80 ? t('q_diag_excellent', "Excellente réponse, très bien structurée.") : feedback.score >= 50 ? t('q_diag_good', "Bonne base, mais manque de structure ou de pragmatisme.") : t('q_diag_poor', "Réponse à retravailler, les attentes du recruteur ne sont pas couvertes.")}
                       </p>
                    </div>
                    <button onClick={() => setShowFeedbackDetails(prev => ({...prev, [qKey]: false}))} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} title="Fermer"><EyeOff size={16} /> {t('q_hide', 'Masquer')}</button>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> {t('q_strengths', 'Ce qui fonctionne bien')}</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{feedback.strengths?.map((s: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}</ul>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {t('q_weaknesses', "Ce qu'il manque")}</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{feedback.weaknesses?.map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{w}</li>)}</ul>
                    </div>
                 </div>
                 <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> {t('q_optimized_answer', 'Proposition de réponse optimisée (Méthode STAR)')}</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_answer}"</p>
                 </div>
                 
                 <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => handleRetry(qKey)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.75rem 2rem' }}>
                      <RefreshCw size={16} /> {t('q_restart_exercise', "Recommencer l'exercice")}
                    </button>
                 </div>
              </div>
            )}

            {/* MODE LECTURE (Suggestion brute) */}
            {q.suggested_answer && isRevealed && !isActive && !feedback && (
              <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.9rem', color: '#166534', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                    <CheckCircle2 size={16} /> 
                    <span>{t('q_suggested_answer', 'Suggestion de réponse (Éditable)')}</span>
                  </div>
                  <button onClick={() => toggleReveal(qKey)} style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}>
                    <EyeOff size={14} /> {t('q_hide', 'Masquer')}
                  </button>
                </div>
                {/* [FIX] Textarea éditable pour la réponse */}
                <textarea 
                  defaultValue={q.suggested_answer || ""} 
                  onChange={(e) => onUpdate && onUpdate(idx, "suggested_answer", e.target.value)}
                  style={{ 
                      width: "100%", 
                      background: "transparent", 
                      border: "none", 
                      resize: "vertical", 
                      color: "#166534", 
                      fontFamily: "inherit",
                      fontSize: "inherit",
                      lineHeight: "1.5",
                      minHeight: "80px",
                      outline: "none"
                  }}
                  placeholder={t('q_write_answer_here', "Rédigez votre réponse ici...")}
                />
              </div>
            )}
            
            {q.advice && isRevealed && (
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', animation: 'fadeIn 0.3s ease-out' }}>
                 <Lightbulb size={16} style={{ flexShrink: 0, color: '#eab308' }} /> 
                 <span>{q.advice}</span>
               </div>
            )}
          </div>
        )})}
      </div>
    </div>
  );
}