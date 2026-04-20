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
}

export default function Questionnaire({ questions, onBack, onPrint, onUpdate, loading, hideHeader }: QuestionnaireProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  
  // --- GESTION DE LA PERSISTANCE (GLOBAL STATE) ---
  let dashboard: any = null;
  try { dashboard = useDashboard(); } catch(e) {} // Évite le crash si utilisé hors du Dashboard
  const cvData = dashboard?.cvData;
  const updateFormData = dashboard?.updateFormData;

  // Nouveaux états pour le mode interactif (Entraînement)
  const [activeMode, setActiveMode] = useState<Record<number, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(cvData?.interviewUserAnswers || {});
  const [isRecording, setIsRecording] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<number, any>>(cvData?.interviewFeedbacks || {});
  const [showFeedbackDetails, setShowFeedbackDetails] = useState<Record<number, boolean>>({});
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (cvData?.interviewUserAnswers) setUserAnswers(cvData.interviewUserAnswers);
    if (cvData?.interviewFeedbacks) setFeedbacks(cvData.interviewFeedbacks);
  }, [cvData?.interviewUserAnswers, cvData?.interviewFeedbacks]);

  const toggleReveal = (idx: number) => {
    setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }));
  };
  
  const getScoreTheme = (score100?: number) => {
    if (score100 === undefined) return { border: 'var(--border-color)', bg: 'var(--bg-card)', text: 'var(--text-muted)' };
    if (score100 >= 75) return { border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' };
    if (score100 >= 50) return { border: '#eab308', bg: 'rgba(234, 179, 8, 0.05)', text: '#eab308' };
    return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', text: '#ef4444' };
  };

  const handleRetry = (idx: number) => {
    const newF = {...feedbacks}; delete newF[idx];
    const newA = {...userAnswers}; delete newA[idx];
    setFeedbacks(newF); setUserAnswers(newA);
    if (updateFormData) { updateFormData("interviewFeedbacks", newF); updateFormData("interviewUserAnswers", newA); }
    
    setActiveMode(prev => ({...prev, [idx]: true}));
    setShowFeedbackDetails(prev => ({...prev, [idx]: false}));
  };

  // --- GESTION DE LA RECONNAISSANCE VOCALE ---
  const toggleRecording = (idx: number) => {
    if (isRecording === idx) {
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

    let baselineAnswer = userAnswers[idx] || "";

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
         baselineAnswer += (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + finalTranscript;
         setUserAnswers(prev => ({ ...prev, [idx]: baselineAnswer + interimTranscript }));
      } else {
         setUserAnswers(prev => ({ ...prev, [idx]: baselineAnswer + (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + interimTranscript }));
      }
    };

    recognition.onerror = () => setIsRecording(null);
    recognition.onend = () => setIsRecording(null);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(idx);
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
  const handleSubmit = async (idx: number, q: any) => {
    const answer = userAnswers[idx];
    if (!answer) return;
    
    setIsSubmitting(idx);
    try {
      // L'appel nécessite une nouvelle route backend pour corriger la réponse
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/evaluate-interview-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            question: q.question, 
            category: q.category, 
            suggested_framework: q.suggested_answer,
            user_answer: answer 
        }),
      });
      
      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      const newFeedbacks = { ...feedbacks, [idx]: data.feedback };
      setFeedbacks(newFeedbacks);
      
      // Sauvegarde persistante du résultat et de la réponse
      if (updateFormData) {
          updateFormData("interviewFeedbacks", newFeedbacks);
          updateFormData("interviewUserAnswers", { ...userAnswers, [idx]: answer });
      }
      setShowFeedbackDetails(prev => ({ ...prev, [idx]: true }));
      setActiveMode(prev => ({ ...prev, [idx]: false }));
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
          const isRevealed = revealed[idx];
          const isActive = activeMode[idx];
          const feedback = feedbacks[idx];
          const isRecordingThis = isRecording === idx;
          const isSubmittingThis = isSubmitting === idx;

          return (
          <div key={idx} className="staggered-card" style={{ 
            background: 'var(--bg-card)', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            transition: 'transform 0.2s ease-in-out',
            cursor: 'default',
            animationDelay: `${idx * 0.1}s` /* Apparition au fil de l'eau */
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ 
                background: '#eff6ff', 
                padding: '0.6rem', 
                borderRadius: '10px', 
                color: 'var(--primary)',
                flexShrink: 0
              }}>
                <HelpCircle size={22} />
              </div>
              <div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  textTransform: 'uppercase', 
                  fontWeight: '700', 
                  color: 'var(--text-muted)',
                  marginBottom: '0.25rem',
                  display: 'block',
                  letterSpacing: '0.05em'
                }}>
                  {q.category || 'Question'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '600' }}>
                  {q.question}
                </h3>
              </div>
            </div>

            {/* BOUTONS D'ACTION (Si ni révélé, ni en mode actif, ni feedback) */}
            {!isRevealed && !isActive && !feedback && (
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => toggleReveal(idx)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  <Eye size={16} /> Mode Lecture (Voir la suggestion)
                </button>
                <button onClick={() => setActiveMode(prev => ({...prev, [idx]: true}))} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem', background: '#8b5cf6', borderColor: '#8b5cf6', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}>
                  <Edit3 size={16} /> S'entraîner (Micro / Texte)
                </button>
              </div>
            )}

            {/* SI DONE ET COLLAPSED */}
            {isDone && !showFeedback && (
              <div style={{ marginTop: '0.5rem', display: 'inline-block' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <span onClick={() => setShowFeedbackDetails(prev => ({...prev, [idx]: true}))} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.border, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                    <Eye size={16} /> Voir mon évaluation
                  </span>
                  <span onClick={() => handleRetry(idx)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <RefreshCw size={16} /> Refaire cette question
                  </span>
                </div>
              </div>
            )}

            {/* MODE ACTIF (Entraînement) */}
            {isActive && !feedback && (
              <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Edit3 size={18} color="#8b5cf6" /> Rédigez ou dictez votre réponse
                    </div>
                    <button 
                      onClick={() => toggleRecording(idx)}
                      className={`btn-${isRecordingThis ? 'primary' : 'secondary'}`} 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: isRecordingThis ? '#ef4444' : undefined, borderColor: isRecordingThis ? '#ef4444' : undefined, color: isRecordingThis ? 'white' : undefined, animation: isRecordingThis ? 'pulse-record 1.5s infinite' : 'none' }}
                    >
                      {isRecordingThis ? <MicOff size={16} /> : <Mic size={16} />}
                      {isRecordingThis ? "Arrêter" : "Répondre à la voix"}
                    </button>
                 </div>
                 
                 <textarea 
                    value={userAnswers[idx] || ""}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                    onBlur={() => updateFormData && updateFormData("interviewUserAnswers", { ...userAnswers })}
                    placeholder="Commencez à parler ou tapez votre réponse ici..."
                    rows={4}
                    disabled={isSubmittingThis}
                    style={{ width: '100%', background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', outline: 'none', marginBottom: '1rem' }}
                 />

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setActiveMode(prev => ({...prev, [idx]: false}))} className="btn-ghost" style={{ fontSize: '0.85rem' }} disabled={isSubmittingThis}>Annuler</button>
                    <button onClick={() => handleSubmit(idx, q)} disabled={!(userAnswers[idx] || "").trim() || isSubmittingThis} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                      {isSubmittingThis ? <><Loader2 size={16} className="spin" /> Analyse IA en cours...</> : <><Send size={16} /> Analyser ma réponse</>}
                    </button>
                 </div>
              </div>
            )}

            {/* FEEDBACK IA APRÈS ENTRAÎNEMENT */}
            {isDone && showFeedback && (
              <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.4s ease-out' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <ScoreGauge score={feedback.score / 10} label="Impact de la réponse" />
                    <button onClick={() => setShowFeedbackDetails(prev => ({...prev, [idx]: false}))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} title="Fermer"><EyeOff size={16} /> Masquer</button>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> Points forts</h4>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>{feedback.strengths?.map((s: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>{s}</li>)}</ul>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> Axes d'amélioration</h4>
                      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>{feedback.weaknesses?.map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>)}</ul>
                    </div>
                 </div>
                 <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={16} /> Réponse Idéale (Méthode STAR)</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_answer}"</p>
                 </div>
                 
                 <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => handleRetry(idx)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <RefreshCw size={16} /> Recommencer l'exercice
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
                    <span>Suggestion de réponse (Éditable)</span>
                  </div>
                  <button onClick={() => toggleReveal(idx)} style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}>
                    <EyeOff size={14} /> Masquer
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
                  placeholder="Rédigez votre réponse ici..."
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