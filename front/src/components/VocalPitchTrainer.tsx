import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, RotateCcw, Loader2, Activity, MessageSquare, AlertTriangle, CheckCircle2, Dumbbell, Ban } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useTranslation } from 'react-i18next';
import { useDashboard } from './DashboardContext';
import { RechargeModal } from './RechargeModal';
import { AsyncBoundary } from './AsyncBoundary';

interface VocalPitchTrainerProps {
  targetJob?: string;
  targetCompany?: string;
  jobDescription?: string;
  onSuccess?: () => void;
}

export const VocalPitchTrainer = ({ targetJob = "Candidat", targetCompany, jobDescription, onSuccess }: VocalPitchTrainerProps) => {
  const { t } = useTranslation();
  const dashboardContext = useDashboard();
  if (!dashboardContext) return null;

  const { quotas, fetchQuotas } = dashboardContext;
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur (Utilisez Chrome ou Edge).");
      return;
    }

    setTranscript("");
    setSeconds(0);
    setResult(null);
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        setTranscript(prev => prev + " " + finalTranscript);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      stopRecording();
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const analyzePitch = async () => {
    setIsAnalyzing(true);
    setError(null);

    if ((quotas?.pitch ?? 0) <= 0) {
      setShowRechargeModal(true);
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/evaluate-vocal-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          duration_seconds: seconds,
          target_job: targetJob,
          target_company: targetCompany,
          job_description: jobDescription
        })
      });
      if (!response.ok) {
        if (response.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur lors de l'analyse";
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      setResult(data);
      if (onSuccess) onSuccess();
      if (fetchQuotas) fetchQuotas();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "L'analyse a échoué. L'IA a mis trop de temps à répondre.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
      <style>{`
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
          <Mic size={24} color="#8b5cf6" /> Simulateur de Pitch Vocal (Sans filet)
        </h2>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--danger-text)', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Enregistrez votre présentation personnelle spontanément. L'IA analysera votre rythme, vos tics de langage et l'impact de votre structure.
        </p>
      </div>

      {!result && !isAnalyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '1rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', fontFamily: 'monospace', color: isRecording ? '#ef4444' : 'var(--text-main)' }}>
              {formatTime(seconds)}
            </div>
            {isRecording && (
              <div style={{ position: 'absolute', right: '-40px', display: 'flex', alignItems: 'center', gap: '4px', height: '36px' }}>
                {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    style={{ width: '5px', height: '100%', backgroundColor: '#ef4444', borderRadius: '3px', animation: `soundWave 1s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: 'center' }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <textarea 
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="La retranscription s'affichera ici. Vous pouvez corriger le texte manuellement avant l'analyse..."
            style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '1rem', minHeight: '120px', resize: 'vertical', outline: 'none' }}
            disabled={isRecording}
          />

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {isRecording ? (
              <button onClick={stopRecording} className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem', animation: 'pulse-record 1.5s infinite' }}>
                <Square size={20} /> Arrêter l'enregistrement
              </button>
            ) : (
              <>
                <button onClick={startRecording} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  <Play size={20} /> {transcript ? "Nouvel enregistrement" : "Démarrer l'enregistrement"}
                </button>
                {transcript.trim().length > 0 && (
                  <button onClick={() => {
                    if (seconds < 10) { alert("L'enregistrement est trop court (minimum 10 secondes) pour une analyse pertinente."); return; }
                    analyzePitch();
                  }} className="btn-primary" style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                    <Activity size={20} /> Analyser ma prestation ({quotas?.pitch ?? 0} restants)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isAnalyzing && (
        <AsyncBoundary 
          loading={true} 
          title="Analyse vocale en cours..." 
          loadingText="Extraction de la prosodie, du débit et de la structure sémantique."
          style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
        >
          <></>
        </AsyncBoundary>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <Activity size={24} color="#3b82f6" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{result.metrics.wpm}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mots / Minute ({result.metrics.pace_status})</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <AlertTriangle size={24} color="#f59e0b" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b45309' }}>{Array.isArray(result.metrics?.filler_words_detected) && result.metrics.filler_words_detected.length > 0 ? result.metrics.filler_words_detected.join(', ') : "Aucun"}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tics de langage</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <Ban size={24} color="#ef4444" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c' }}>{Array.isArray(result.metrics?.negative_words_detected) && result.metrics.negative_words_detected.length > 0 ? result.metrics.negative_words_detected.join(', ') : "Aucun"}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mots dévalorisants</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#047857' }}>{result.score}/100</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Score d'Impact</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={18} /> Diagnostic du Coach</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>🗣️ Rythme :</strong> {result.feedback.pace_and_silences}</p>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>🏗️ Structure :</strong> {result.feedback.structure_and_clarity}</p>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>⏱️ Impact & Longueur :</strong> {result.feedback.impact_and_length}</p>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>🎯 Pertinence :</strong> {result.feedback.relevance_to_target}</p>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>📊 Exemples (STAR) :</strong> {result.feedback.examples_precision}</p>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dumbbell size={18} /> Plan d'entraînement</h3>
              {Array.isArray(result.micro_exercises) ? result.micro_exercises.map((ex: any, i: number) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#5b21b6', fontSize: '0.9rem' }}>• {ex.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingLeft: '1rem' }}>{ex.description}</div>
                </div>
              )) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', paddingLeft: '1rem' }}>{typeof result.micro_exercises === 'string' ? result.micro_exercises : "Aucun exercice proposé."}</div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button onClick={() => { setResult(null); setTranscript(""); setSeconds(0); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={16} /> Refaire un essai
            </button>
          </div>
        </div>
      )}
      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
      <style>{`@keyframes pulse-record { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`}</style>
    </div>
  );
};