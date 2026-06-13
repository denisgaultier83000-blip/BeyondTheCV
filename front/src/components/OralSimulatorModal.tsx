import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Play, Activity, AlertTriangle, CheckCircle2, Target, Award, X, RotateCcw, Flame } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { RechargeModal } from './RechargeModal';

interface OralSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetJob: string;
  targetCompany?: string;
  jobDescription?: string;
  targetLanguage?: string;
  onScoreUpdate?: (score: number) => void;
  trainingTitle?: string;
  trainingFocus?: string;
}

export default function OralSimulatorModal({ isOpen, onClose, targetJob, targetCompany, jobDescription, targetLanguage = 'fr', onScoreUpdate, trainingTitle, trainingFocus }: OralSimulatorModalProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'result' | 'error'>('idle');
  const [feedback, setFeedback] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalStopRef = useRef(false);

  // Nettoyage complet à la fermeture ou démontage
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('sim_mic_unsupported', "La reconnaissance vocale n'est pas supportée par votre navigateur actuel. (Essayez Google Chrome)"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = targetLanguage === 'en' ? 'en-US' : 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    let currentTranscript = transcript;

    recognition.onstart = () => {
      intentionalStopRef.current = false;
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      
      if (final) {
        currentTranscript += (currentTranscript && !currentTranscript.endsWith(' ') ? ' ' : '') + final;
        setTranscript(currentTranscript + interim);
      } else {
        setTranscript(currentTranscript + (currentTranscript && !currentTranscript.endsWith(' ') ? ' ' : '') + interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      stopRecording(true);
    };

    recognition.onend = () => {
      if (!intentionalStopRef.current) {
        try { recognition.start(); } catch(e) { stopRecording(true); }
      } else {
        stopRecording(true);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      stopRecording(true);
    }
  };

  const stopRecording = (isInternal = false) => {
    intentionalStopRef.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEvaluate = async () => {
    if (!transcript.trim()) return;
    setStatus('analyzing');
    setErrorMsg(null);
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/evaluate-vocal-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          duration_seconds: duration || 1, // Évite la division par zéro
          target_job: targetJob,
          target_company: targetCompany,
          job_description: jobDescription,
          target_language: targetLanguage
        })
      });

      if (!response.ok) {
        if (response.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur de communication avec le serveur.";
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }
      
      const data = await response.json();
      setFeedback(data);
      setStatus('result');
      if (onScoreUpdate && data.score) {
        onScoreUpdate(data.score);
      }
      window.dispatchEvent(new Event('refresh-balance'));
    } catch (e: any) {
      setErrorMsg(e.message || "Une erreur est survenue lors de l'analyse vocale.");
      setStatus('idle');
    }
  };

  const reset = () => {
    setTranscript("");
    setDuration(0);
    setStatus('idle');
    setFeedback(null);
    setErrorMsg(null);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '850px', maxHeight: '90vh', borderRadius: '1.25rem', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Mic size={28} color="var(--primary)" /> Simulateur d'Impact Vocal
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', textAlign: 'center', maxWidth: '600px', margin: 0 }}>
                L'IA va analyser votre rythme, repérer vos tics de langage et évaluer l'impact de votre discours. Prêt à vous entraîner ?
              </p>

              {trainingTitle && trainingFocus && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid var(--primary)', width: '100%', textAlign: 'left', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1.05rem' }}>{trainingTitle}</h4>
                  <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5' }}><strong>🎯 Consigne / Question :</strong> {trainingFocus}</p>
                </div>
              )}
              
              <textarea 
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t('oral_sim_placeholder', "La retranscription de votre voix s'affichera ici. Vous pouvez corriger le texte manuellement avant de lancer l'analyse...")}
                disabled={isRecording}
                style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', fontSize: '1.1rem', lineHeight: '1.6', minHeight: '150px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', justifyContent: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px' }}>
                  <div style={{ fontSize: '2rem', fontFamily: 'monospace', fontWeight: 700, color: isRecording ? '#ef4444' : 'var(--text-main)' }}>
                    {formatTime(duration)}
                  </div>
                  {isRecording && (
                    <div style={{ position: 'absolute', right: '-25px', display: 'flex', alignItems: 'center', gap: '3px', height: '24px' }}>
                      {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
                        <div
                          key={i}
                          style={{ width: '4px', height: '100%', backgroundColor: '#ef4444', borderRadius: '2px', animation: `soundWave 1s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: 'center' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={toggleRecording} style={{ background: isRecording ? '#ef4444' : 'var(--primary)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '3rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isRecording ? '0 0 0 8px rgba(239, 68, 68, 0.2)' : 'none' }}>
                  {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                  {isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
                </button>
              </div>

              {errorMsg && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{errorMsg}</div>}

              {transcript.length > 20 && !isRecording && (
                <button onClick={handleEvaluate} className="btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>Analyser ma prestation</button>
              )}
            </div>
          )}

          {status === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', color: 'var(--primary)', gap: '1.5rem' }}>
              <Loader2 size={48} className="spin" />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Analyse vocale en cours...</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Extraction du débit, des tics et de la structure du discours.</p>
            </div>
          )}

          {status === 'result' && feedback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ScoreGauge score={feedback.score} label="Score d'Impact" />
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Débit Vocal (WPM)</div>
                    <div style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 800 }}>{feedback.metrics?.wpm} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>mots/min</span></div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.metrics?.pace_status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Tics de langage détectés</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {feedback.metrics?.filler_words_detected?.length > 0 ? feedback.metrics.filler_words_detected.map((w: string, i: number) => (
                        <span key={i} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{w}</span>
                      )) : <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>Aucun tic détecté ✨</span>}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Mots dévalorisants / Interdits</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {feedback.metrics?.negative_words_detected?.length > 0 ? feedback.metrics.negative_words_detected.map((w: string, i: number) => (
                        <span key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{w}</span>
                      )) : <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>Aucun mot négatif ✨</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} /> Diagnostic du Coach</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}><strong>🗣️ Rythme :</strong> {feedback.feedback?.pace_and_silences}</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}><strong>🏗️ Structure :</strong> {feedback.feedback?.structure_and_clarity}</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}><strong>⏱️ Impact & Longueur :</strong> {feedback.feedback?.impact_and_length}</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6 }}><strong>🎯 Ciblage (Offre) :</strong> {feedback.feedback?.relevance_to_target}</p>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.6, gridColumn: '1 / -1' }}><strong>📊 Exemples (STAR) :</strong> {feedback.feedback?.examples_precision}</p>
                </div>
                <h5 style={{ margin: '1rem 0 0.5rem 0', color: 'var(--text-main)', fontSize: '0.95rem' }}>🎯 Actions rapides :</h5>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{feedback.feedback?.actionable_advice?.map((a: string, i: number) => <li key={i} style={{ marginBottom: '0.25rem' }}>{a}</li>)}</ul>
              </div>
              
              <button onClick={reset} className="btn-secondary" style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RotateCcw size={16} /> Recommencer un essai</button>
            </div>
          )}
        </div>
      </div>
      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
}