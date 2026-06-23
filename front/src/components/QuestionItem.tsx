import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Eye, EyeOff, Edit3, Mic, MicOff, Send, Loader2, AlertTriangle, RefreshCw, CheckCircle2, Lightbulb } from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import { formatMarkdownReact } from '../utils/formatUtils';
import { AsyncBoundary } from './AsyncBoundary';

interface QuestionItemProps {
  question: any;
  qKey: string;
  userAnswer: string;
  feedback: any;
  error: string;
  isSubmitting: boolean;
  quotas: number;
  onAnswerChange: (qKey: string, value: string) => void;
  onSubmit: (qKey: string, question: any) => void;
  onRetry: (qKey: string) => void;
  onUpdate?: (field: string, value: any) => void;
}

export const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  qKey,
  userAnswer,
  feedback,
  error,
  isSubmitting,
  quotas,
  onAnswerChange,
  onSubmit,
  onRetry,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [isRevealed, setRevealed] = useState(false);
  const [isActive, setActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isDone = !!feedback;

  const getScoreTheme = (score100?: number) => {
    if (score100 === undefined) return { border: 'var(--border-color)', bg: 'var(--bg-card)', text: 'var(--text-muted)' };
    if (score100 >= 75) return { border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' };
    if (score100 >= 50) return { border: '#eab308', bg: 'rgba(234, 179, 8, 0.05)', text: '#eab308' };
    return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', text: '#ef4444' };
  };

  const theme = getScoreTheme(feedback?.score);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baselineAnswer = userAnswer || "";

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) baselineAnswer += (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + finalTranscript;
      onAnswerChange(qKey, baselineAnswer + interimTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const suggestedAnswer = question.suggested_answer || question.answer || question.reponse_suggeree || question.reponse || "";
  const advice = question.advice || question.conseil || question.coach_advice || question.tip || "";
  const questionText = question.question || question.text || "Question non spécifiée";

  return (
    <div
      className="staggered-card"
      style={{
        background: isDone && !showFeedbackDetails ? theme.bg : 'var(--bg-card)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: isDone && !showFeedbackDetails ? `2px solid ${theme.border}` : '1px solid var(--border-color)',
        boxShadow: isHovered ? (isDone && !showFeedbackDetails ? `0 10px 15px -3px ${theme.border}40` : '0 10px 15px -3px rgba(0,0,0,0.05)') : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'all 0.2s ease-in-out',
        cursor: 'default',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ background: isDone ? theme.border + '20' : '#eff6ff', padding: '0.6rem', borderRadius: '10px', color: isDone ? theme.border : 'var(--primary)', flexShrink: 0 }}>
            <HelpCircle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: '600' }}>
              {formatMarkdownReact(questionText)}
            </h3>
          </div>
        </div>
        {isDone && !showFeedbackDetails && (
          <div style={{ background: theme.border, color: 'white', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {(feedback.score / 10).toFixed(1)} / 10
          </div>
        )}
      </div>

      {!isRevealed && !isActive && !feedback && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {suggestedAnswer && (
            <button onClick={() => setRevealed(true)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <Eye size={16} /> {t('q_read_mode', 'Mode Lecture (Voir la suggestion)')}
            </button>
          )}
          <button onClick={() => setActive(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem', background: '#8b5cf6', borderColor: '#8b5cf6', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}>
            <Edit3 size={16} /> {t('q_practice_mode', "S'entraîner (Micro / Texte)")}
          </button>
        </div>
      )}

      {isDone && !showFeedbackDetails && (
        <div style={{ marginTop: '0.5rem', display: 'inline-block' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span onClick={() => setShowFeedbackDetails(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.border, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
              <Eye size={16} /> {t('q_view_eval', 'Voir mon évaluation')}
            </span>
            <span onClick={() => onRetry(qKey)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <RefreshCw size={16} /> {t('q_retry', 'Refaire cette question')}
            </span>
          </div>
        </div>
      )}

      {isActive && !feedback && (
        <AsyncBoundary loading={isSubmitting} loadingText={t('q_ai_analyzing', 'Analyse IA en cours...')} style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div style={{ marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#8b5cf6" /> {t('q_write_dictate', 'Rédigez ou dictez votre réponse')}
              </div>
              <button onClick={toggleRecording} className={`btn-${isRecording ? 'primary' : 'secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: isRecording ? '#ef4444' : undefined, borderColor: isRecording ? '#ef4444' : undefined, color: isRecording ? 'white' : undefined, animation: isRecording ? 'pulse-record 1.5s infinite' : 'none' }}>
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                {isRecording ? t('q_stop_recording', "Arrêter") : t('q_voice_answer', "Répondre à la voix")}
              </button>
            </div>
            {error && <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)' }}><AlertTriangle size={18} /> {error}</div>}
            <textarea value={userAnswer || ""} onChange={(e) => onAnswerChange(qKey, e.target.value)} placeholder={t('q_answer_placeholder', "Commencez à parler ou tapez votre réponse ici...")} rows={4} style={{ width: '100%', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', outline: 'none', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setActive(false)} className="btn-ghost" style={{ fontSize: '0.85rem' }}>{t('btn_cancel', 'Annuler')}</button>
              <button onClick={() => onSubmit(qKey, question)} disabled={!(userAnswer || "").trim()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <Send size={16} /> {`${t('q_analyze_answer', 'Analyser ma réponse')} (${quotas ?? 0} restants)`}
              </button>
            </div>
          </div>
        </AsyncBoundary>
      )}

      {isDone && showFeedbackDetails && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
            <ScoreGauge score={feedback.score / 10} label={t('q_impact_score', "Impact de la réponse")} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{t('q_ai_diagnostic', 'Diagnostic IA')}</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>{feedback.score >= 80 ? t('q_diag_excellent') : feedback.score >= 50 ? t('q_diag_good') : t('q_diag_poor')}</p>
            </div>
            <button onClick={() => setShowFeedbackDetails(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} title="Fermer"><EyeOff size={16} /> {t('q_hide', 'Masquer')}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}><h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> {t('q_strengths')}</h4><ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{(feedback.strengths || []).map((s: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}</ul></div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}><h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> {t('q_weaknesses')}</h4><ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>{(feedback.weaknesses || []).map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{w}</li>)}</ul></div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6' }}><h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> {t('q_optimized_answer')}</h4><p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_answer}"</p></div>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}><button onClick={() => onRetry(qKey)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.75rem 2rem' }}><RefreshCw size={16} /> {t('q_restart_exercise')}</button></div>
        </div>
      )}

      {isRevealed && !isActive && !feedback && (
        <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.9rem', color: 'var(--success, #16a34a)', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}><CheckCircle2 size={16} /><span>{t('q_suggested_answer')}</span></div>
            <button onClick={() => setRevealed(false)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}><EyeOff size={14} /> {t('q_hide')}</button>
          </div>
          <textarea defaultValue={suggestedAnswer} onChange={(e) => onUpdate && onUpdate("suggested_answer", e.target.value)} style={{ width: "100%", background: "transparent", border: "none", resize: "vertical", color: "inherit", fontFamily: "inherit", fontSize: "inherit", lineHeight: "1.5", minHeight: "80px", outline: "none" }} placeholder={t('q_write_answer_here')} />
        </div>
      )}

      {advice && isRevealed && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', animation: 'fadeIn 0.3s ease-out' }}>
          <Lightbulb size={16} style={{ flexShrink: 0, color: '#eab308' }} />
          <span>{formatMarkdownReact(advice)}</span>
        </div>
      )}
    </div>
  );
};