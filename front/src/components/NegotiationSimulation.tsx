
import React, { useState, useEffect, useRef } from 'react';
import { Send, RefreshCw, Mic, MicOff, Star, AlertTriangle, CheckCircle2, Lightbulb, User, Users, Flame, ShieldAlert, Sparkles, Building, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { useDashboard } from '../hooks/DashboardContext';
import { useTranslation } from 'react-i18next';
import { RechargeModal } from './RechargeModal';
import { AsyncBoundary } from './AsyncBoundary';

const NegotiationSimulation = ({ preparationData }) => {
  const { cvData, quotas, fetchQuotas } = useDashboard();
  const { t } = useTranslation();

  const [variation, setVariation] = useState('standard');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenario, setScenario] = useState<{ budget: number; recruiter_prompt: string } | null>(null);

  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // --- GESTION DU SPEECH-TO-TEXT ---
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
      alert(t('sim_mic_unsupported', "La reconnaissance vocale n'est pas supportée par votre navigateur."));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
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
      if (finalTranscript) baselineAnswer += (baselineAnswer ? ' ' : '') + finalTranscript;
      setUserAnswer(baselineAnswer + interimTranscript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  // --- CHARGEMENT DU SCÉNARIO ---
  const fetchScenario = async (targetVariation: string) => {
    if (!cvData) return;
    try {
      setScenarioLoading(true);
      setError(null);
      const res = await authenticatedFetch(`${API_BASE_URL}/negotiation/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_profile: { job_title: cvData.job_title, experience_years: cvData.experience_years, skills: cvData.skills },
          variation: targetVariation
        })
      });

      if (!res.ok) throw new Error('Failed to load scenario');
      const data = await res.json();
      setScenario(data);
      setVariation(targetVariation);
      setFeedback(null);
      setUserAnswer('');
    } catch (err: any) {
      setError(err.message || 'Error loading scenario');
    } finally {
      setScenarioLoading(false);
    }
  };

  useEffect(() => {
    fetchScenario('standard');
  }, [cvData]);

  const handleEvaluate = async () => {
    if (!userAnswer.trim() || !scenario) return;
    setIsEvaluating(true);
    setError(null);

    if ((quotas?.negotiation ?? 0) <= 0) {
      setShowRechargeModal(true);
      setIsEvaluating(false);
      return;
    }

    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/simulate-negotiation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_profile: cvData,
          recruiter_prompt: scenario.recruiter_prompt,
          user_answer: userAnswer
        })
      });

      if (!res.ok) {
        if (res.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur de communication.";
        try { const errObj = await res.json(); errMsg = errObj.detail || errMsg; } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setFeedback(data.feedback);
      if (fetchQuotas) fetchQuotas();
    } catch (err: any) {
      setError(err.message || "L'évaluation a échoué. Veuillez réessayer.");
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!scenario) return null;

  return (
    <div className="negotiation-section simulation-section">
      <h4>3. Simulation & Débrief</h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        Défendez vos prétentions salariales face à l'objection du recruteur. Utilisez vos cartes arguments et restez ferme sur votre valeur.
      </p>

      {/* RAPPEL POSITION */}
      {preparationData && cvData?.salary_expectations && (
        <div style={{ background: 'rgba(var(--primary-rgb), 0.02)', border: '1px dashed var(--border-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span><strong>Budget du poste :</strong> {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(scenario.budget)}</span>
          <span><strong>Vos prétentions :</strong> {cvData.salary_expectations}</span>
        </div>
      )}

      {/* OBJECTION RECRUTEUR */}
      {scenarioLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="recruiter-bubble" style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid var(--primary)', marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <User size={14} /> Le Recruteur :
          </div>
          <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontStyle: 'italic', fontWeight: 500 }}>
            "{scenario.recruiter_prompt}"
          </p>
        </div>
      )}

      {/* TEXTAREA & INPUTS */}
      {!feedback ? (
        <AsyncBoundary
          loading={isEvaluating}
          error={error || undefined}
          loadingText="Analyse de votre contre-proposition..."
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
            <textarea 
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Ex: Je comprends vos contraintes de budget. Cependant, compte tenu des 12 ans d'expérience que j'apporte..."
              rows={4}
              style={{ width: '100%', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                onClick={toggleRecording} 
                className={`btn-${isRecording ? 'primary' : 'secondary'}`} 
                style={{ background: isRecording ? '#ef4444' : undefined, borderColor: isRecording ? '#ef4444' : undefined, color: isRecording ? 'white' : undefined, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={handleEvaluate} disabled={!userAnswer.trim() || scenarioLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} />
                {`Tenter de négocier (${quotas?.negotiation ?? 0} restants)`}
              </button>
            </div>
          </div>
        </AsyncBoundary>
      ) : (
        /* DÉBRIEFING */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
            <ScoreGauge score={feedback.score / 10} label="Force de persuasion" />
            <div style={{ flex: 1 }}>
               <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                 {feedback.score >= 80 ? "Excellente défense ! Vous avez maintenu votre valeur sans braquer le recruteur." : feedback.score >= 50 ? "Pas mal, mais vous laissez trop d'argent sur la table ou manquez d'arguments de valeur." : "Attention, votre réponse risque de clore la négociation prématurément."}
               </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> Ce qui fonctionne</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> À éviter</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {feedback.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> La réponse du Coach</h4>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_answer}"</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button onClick={() => { setFeedback(null); setUserAnswer(""); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} /> Retenter ce scénario
            </button>
          </div>
        </div>
      )}

      {/* VARIATIONS */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Variantes : Rejouer avec un autre profil
        </h5>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button 
            disabled={scenarioLoading} 
            onClick={() => fetchScenario('difficult')} 
            className={`btn-outline ${variation === 'difficult' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Flame size={14} style={{ color: '#ef4444' }} /> Recruteur Difficile
          </button>
          <button 
            disabled={scenarioLoading} 
            onClick={() => fetchScenario('dg')} 
            className={`btn-outline ${variation === 'dg' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Sparkles size={14} style={{ color: '#f59e0b' }} /> Un DG
          </button>
          <button 
            disabled={scenarioLoading} 
            onClick={() => fetchScenario('startup')} 
            className={`btn-outline ${variation === 'startup' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Flame size={14} style={{ color: '#10b981' }} /> Startup
          </button>
          <button 
            disabled={scenarioLoading} 
            onClick={() => fetchScenario('grand_groupe')} 
            className={`btn-outline ${variation === 'grand_groupe' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
          >
            <Building size={14} style={{ color: '#3b82f6' }} /> Grand Groupe
          </button>
        </div>
      </div>

      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
};

export default NegotiationSimulation;
