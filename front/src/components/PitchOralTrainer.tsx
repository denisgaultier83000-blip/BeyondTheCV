import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, AlertTriangle, CheckCircle2, Target, Lightbulb, RefreshCw, Play } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { useDashboard } from '../hooks/DashboardContext';
import { useTranslation } from 'react-i18next';
import { RechargeModal } from './RechargeModal';
import { AsyncBoundary } from './AsyncBoundary';

export default function PitchOralTrainer() {
  const { cvData, quotas, fetchQuotas } = useDashboard();
  const { t } = useTranslation();
  
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('sim_mic_unsupported', "La reconnaissance vocale n'est pas supportée par votre navigateur actuel."));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = cvData?.target_language === 'en' ? 'en-US' : 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let baselineAnswer = userAnswer;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) baselineAnswer += (baselineAnswer && !baselineAnswer.endsWith(' ') ? ' ' : '') + finalTranscript;
      setUserAnswer(baselineAnswer + interimTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);
    setError(null);

    if ((quotas?.pitch ?? 0) <= 0) {
      setShowRechargeModal(true);
      setIsEvaluating(false);
      return;
    }

    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/evaluate-oral-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_job: cvData?.target_job || cvData?.target_role_primary || "Candidat",
          transcript: userAnswer
        })
      });

      if (!res.ok) {
        if (res.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur de communication.";
        try { const errObj = await res.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setFeedback(data.feedback || data);
      if (fetchQuotas) fetchQuotas();
    } catch (err: any) {
      setError(err.message || "L'évaluation a échoué. Veuillez réessayer.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8b5cf6', margin: 0, fontSize: '1.2rem' }}>
          <Play size={24} /> Entraînement : Pitch à l'Oral
        </h3>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        Prenez la parole ! Enregistrez votre pitch pour vérifier qu'il ne sonne pas comme une récitation et qu'il capte bien l'attention.
      </p>

      {!feedback ? (
        <AsyncBoundary loading={isEvaluating} error={error || undefined} loadingText="Analyse de votre pitch en cours..." style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
            <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} placeholder="Commencez à parler ou dictez votre pitch ici..." rows={5} style={{ width: '100%', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={toggleRecording} className={`btn-${isRecording ? 'primary' : 'secondary'}`} style={{ background: isRecording ? '#ef4444' : undefined, borderColor: isRecording ? '#ef4444' : undefined, color: isRecording ? 'white' : undefined, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />} {isRecording ? "Arrêter" : "Dicter mon pitch"}
              </button>
              <button onClick={handleEvaluate} disabled={!userAnswer.trim()} className="btn-primary" style={{ background: !userAnswer.trim() ? '' : '#8b5cf6', borderColor: !userAnswer.trim() ? '' : '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} /> {`Évaluer mon oral (${quotas?.pitch ?? 0} restants)`}
              </button>
            </div>
          </div>
        </AsyncBoundary>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <ScoreGauge score={feedback.score / 10} label="Impact du Pitch" />
            <div style={{ flex: 1 }}>
               <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                 {feedback.score >= 75 ? "Excellent pitch, naturel et percutant." : feedback.score >= 50 ? "Bonne base, mais il faut gagner en fluidité ou en structure." : "Votre pitch manque d'impact, évitez de réciter votre CV."}
               </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}><h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> Points Forts</h4><ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{feedback.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}><h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> À améliorer</h4><ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{feedback.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
          </div>
          {feedback.analysis && (
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={16} color="var(--primary)" /> Analyse Structurelle</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div><strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Accroche :</strong> <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.hook}</span></div>
                <div><strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Structure :</strong> <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.structure}</span></div>
                <div><strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Impact Vocal :</strong> <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.delivery}</span></div>
              </div>
            </div>
          )}
          <div style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid #8b5cf6' }}><h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> La version "Executive"</h4><p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_pitch}"</p></div>
          <div style={{ textAlign: 'right' }}><button onClick={() => { setFeedback(null); setUserAnswer(""); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw size={16} /> Refaire un essai</button></div>
        </div>
      )}
      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
}