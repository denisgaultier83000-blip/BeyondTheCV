import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Send, 
  RefreshCw 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from './DashboardContext';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';

// --- TYPES ---
interface PitchFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  analysis: {
    hook: string;
    structure: string;
    delivery: string;
  };
  improved_pitch: string;
}

export function PitchTrainer() {
  const { t } = useTranslation();
  const { cvData } = useDashboard();
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<PitchFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- GESTION DU MICROPHONE (MediaRecorder) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Création du fichier audio final (webm standard sur le web)
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Libération de la webcam/micro
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
      setFeedback(null);
    } catch (err) {
      console.error("Erreur d'accès au micro :", err);
      setError(t('sim_mic_error', "Impossible d'accéder au microphone. Vérifiez les permissions de votre navigateur."));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setFeedback(null);
    setError(null);
  };

  // --- ENVOI AU BACKEND (Audio + Profil) ---
  const analyzePitch = async () => {
    if (!audioBlob) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'pitch.webm');
      // On envoie le poste ciblé ou les données utiles pour l'IA
      formData.append('cvData', JSON.stringify(cvData));

      // Appel à la future route d'évaluation audio
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/evaluate-pitch-audio`, {
        method: 'POST',
        // Important: Ne PAS définir le Content-Type manuellement avec FormData
        body: formData 
      });

      if (!response.ok) {
        let errMsg = "Erreur lors de l'analyse du pitch.";
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (err: any) {
      console.error("Erreur d'analyse :", err);
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Mic size={24} color="var(--primary)" />
          {t('pitch_training_title', 'Entraînement au Pitch (Oral)')}
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          {t('pitch_training_desc', 'Simulez le redoutable « Parlez-moi de vous ». Enregistrez votre Elevator Pitch et recevez une analyse critique sur votre impact vocal et votre structure.')}
        </p>
      </div>

      {/* Zone d'enregistrement */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        
        {error && (
          <div style={{ width: '100%', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {!audioUrl ? (
          // État 1 : Enregistrement
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem', 
              background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isRecording ? 'pulse-record 1.5s infinite' : 'none',
              transition: 'all 0.3s'
            }}>
              {isRecording ? (
                <Square size={40} color="#ef4444" fill="#ef4444" />
              ) : (
                <Mic size={40} color="var(--primary)" />
              )}
            </div>
            
            <button 
              onClick={isRecording ? stopRecording : startRecording} 
              className={`btn-${isRecording ? 'danger' : 'primary'}`}
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
            >
              {isRecording ? <Square size={18} /> : <Mic size={18} />}
              {isRecording ? "Arrêter l'enregistrement" : t('btn_record_pitch', 'Enregistrer mon Pitch')}
            </button>
            {isRecording && <p style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 500 }} className="blink">Enregistrement en cours...</p>}
          </div>
        ) : (
          // État 2 : Relecture & Envoi
          <div style={{ width: '100%', textAlign: 'center', animation: 'slideUp 0.3s ease-out' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Votre enregistrement est prêt !</h4>
            <audio src={audioUrl} controls style={{ width: '100%', maxWidth: '400px', marginBottom: '1.5rem' }} />
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button onClick={resetRecording} className="btn-ghost" disabled={isAnalyzing}>
                <RefreshCw size={18} /> Recommencer
              </button>
              <button onClick={analyzePitch} disabled={isAnalyzing} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isAnalyzing ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                {isAnalyzing ? "Analyse IA en cours..." : "Analyser mon Pitch"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- RÉSULTATS (FEEDBACK IA) --- */}
      {feedback && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideUp 0.5s ease-out' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {t('pitch_eval_title', 'Analyse de votre Pitch')}
          </h3>
          
          {/* Score principal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <ScoreGauge score={feedback.score / 100} label="Score d'Impact" />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Verdict</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {feedback.score >= 75 ? "Excellent pitch, percutant et professionnel. Vous captez l'attention." : 
                 feedback.score >= 50 ? "La base est là, mais vous pouvez gagner en impact en allant plus droit au but." :
                 "Votre présentation manque de structure. Évitez de réciter votre CV et concentrez-vous sur votre valeur ajoutée."}
              </p>
            </div>
          </div>

          {/* Forces & Faiblesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Points Forts</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {feedback.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}
              </ul>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Points à améliorer</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {feedback.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{w}</li>)}
              </ul>
            </div>
          </div>

          {/* Analyse Détaillée */}
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} color="var(--primary)" /> Analyse Détaillée</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>L'Accroche (Les 15 premières secondes)</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.hook}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Structure & Preuves</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.structure}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Impact Vocal (Forme)</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{feedback.analysis.delivery}</p>
              </div>
            </div>
          </div>

          {/* Pitch Idéal proposé */}
          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> La version "Executive" (Réécrite)</h4>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.6', fontStyle: 'italic' }}>
              "{feedback.improved_pitch}"
            </p>
          </div>

        </div>
      )}

      <style>{`
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .blink { animation: blinker 1.5s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}