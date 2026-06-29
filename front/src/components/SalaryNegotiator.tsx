import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, MessageSquare, Send, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Lightbulb, Mic, MicOff } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { useDashboard } from './DashboardContext';
import { useTranslation } from 'react-i18next';
import { RechargeModal } from './RechargeModal';
import { AsyncBoundary } from './AsyncBoundary';

export default function SalaryNegotiator() {
  const dashboardContext = useDashboard();
  const { t } = useTranslation();

  if (!dashboardContext) return null;
  const { cvData, salaryResult, updateFormData, quotas, fetchQuotas } = dashboardContext;
  const { t } = useTranslation();
  
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  
  const [history, setHistory] = useState<any[]>(cvData?.negotiationHistory || []);

  const expectations = cvData?.salary_expectations;

  // --- GESTION DE LA RECONNAISSANCE VOCALE (Speech-to-Text) ---
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
  
  if (!expectations) return null; // Ne s'affiche que si le candidat a rempli ses prétentions

  // Le recruteur utilise l'estimation basse du marché de l'IA pour créer la tension
  const currencySymbol = salaryResult?.currency === 'USD' ? '$' : '€';
  const marketLowNum = salaryResult?.salary_range?.low;
  const marketHighNum = salaryResult?.salary_range?.high;

  // Formatage propre pour s'assurer que 60000 devienne bien 60k
  const formatDisplayK = (num: any) => {
    if (!num) return "";
    let n = Number(num);
    if (isNaN(n)) return `${num}${currencySymbol}`;
    if (n > 1000) n = Math.round(n / 1000);
    return `${n}k${currencySymbol}`;
  };

  const marketLow = marketLowNum ? formatDisplayK(marketLowNum) : "légèrement inférieur à ce que vous demandez";
  const marketHigh = marketHighNum ? formatDisplayK(marketHighNum) : "";
  const recruiterPrompt = `Votre profil est très intéressant, mais vos prétentions salariales (${expectations}) sont au-dessus de notre grille. Notre budget maximum pour ce poste est de ${marketLow}. Qu'en pensez-vous ?`;

  // Calcul dynamique de la position des prétentions sur le graphique (en %)
  let expectationPos = 70; // Position par défaut
  if (expectations && marketLowNum && marketHighNum) {
    let expMatch = expectations.match(/\d+([.,]\d+)?/);
    let expNum = expMatch ? parseFloat(expMatch[0].replace(',', '.')) : NaN;
    
    let lowNum = Number(marketLowNum);
    let highNum = Number(marketHighNum);

    // Normalisation en "k" si les valeurs sont des milliers (ex: 60000 -> 60)
    if (!isNaN(expNum) && expNum > 1000) expNum = expNum / 1000;
    if (!isNaN(lowNum) && lowNum > 1000) lowNum = lowNum / 1000;
    if (!isNaN(highNum) && highNum > 1000) highNum = highNum / 1000;

    if (!isNaN(expNum) && !isNaN(lowNum) && !isNaN(highNum) && highNum > lowNum) {
      if (expNum <= lowNum) {
        expectationPos = 10 + (expNum / lowNum) * 20; // Entre 10% et 30% (Zone Budget Max)
      } else if (expNum > lowNum && expNum <= highNum) {
        const ratio = (expNum - lowNum) / (highNum - lowNum);
        expectationPos = 30 + (ratio * 60); // Entre 30% et 90% (Au milieu du marché)
      } else {
        const ratio = Math.min((expNum - highNum) / (highNum * 0.5), 1); 
        expectationPos = 90 + (ratio * 8); // Entre 90% et 98% (Hors budget / Trop haut)
      }
    }
  }

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) return;
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
          recruiter_prompt: recruiterPrompt,
          user_answer: userAnswer
        })
      });

      if (!res.ok) {
        if (res.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur de communication.";
        try { const errObj = await res.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      setFeedback(data.feedback);
      
      // Sauvegarde dans l'historique local (sera persisté par le parent)
      const newHistory = [{ date: new Date().toISOString(), userAnswer, feedback: data.feedback }, ...history];
      setHistory(newHistory);
      if (updateFormData) {
        updateFormData('negotiationHistory', newHistory);
      }
      if (fetchQuotas) fetchQuotas();
    } catch (err: any) {
      setError(err.message || "L'évaluation a échoué. Veuillez réessayer.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginTop: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <style>{`
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', margin: 0, fontSize: '1.2rem' }}>
          <DollarSign size={24} /> Entraînement : Négociation Salariale
        </h3>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
        L'argent ne doit pas être un sujet tabou. Défendez vos prétentions salariales face à l'objection du recruteur.
      </p>

      {/* --- GRAPHIQUE DES SALAIRES --- */}
      {marketLowNum && marketHighNum && (
        <div style={{ marginBottom: '2rem', padding: '2.5rem 1.5rem 3.5rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
          <h4 style={{ margin: '0 0 2.5rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Le rapport de force</h4>
          
          <div style={{ position: 'relative', height: '12px', background: 'var(--bg-card)', borderRadius: '6px', margin: '0 2rem' }}>
            {/* Grille de l'entreprise (simulée jusqu'au Low du marché pour la tension) */}
            <div style={{ position: 'absolute', left: '0%', width: '30%', height: '100%', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px 0 0 6px' }}></div>
            <div style={{ position: 'absolute', left: '30%', height: '100%', width: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', left: '30%', top: '20px', transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap', textAlign: 'center' }}>
              Budget Max<br/>{marketLow}
            </div>

            {/* Marché réel */}
            <div style={{ position: 'absolute', left: '30%', right: '10%', height: '100%', borderTop: '2px dashed #10b981', borderBottom: '2px dashed #10b981', opacity: 0.5 }}></div>
            <div style={{ position: 'absolute', right: '10%', height: '100%', width: '4px', background: '#10b981', borderRadius: '2px', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', right: '10%', top: '20px', transform: 'translateX(-50%)', fontSize: '0.85rem', fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap', textAlign: 'center' }}>
              Marché Haut<br/>{marketHigh}
            </div>

            {/* Vos Prétentions */}
            <div style={{ position: 'absolute', left: `${expectationPos}%`, top: '-15px', height: '42px', width: '4px', background: '#ef4444', borderRadius: '2px', zIndex: 3, boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)', transition: 'left 0.5s ease-out' }}></div>
            <div style={{ position: 'absolute', left: `${expectationPos}%`, top: '-35px', transform: 'translateX(-50%)', fontSize: '0.9rem', fontWeight: 800, color: '#ef4444', whiteSpace: 'nowrap', background: 'var(--bg-card)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', border: '1px solid #ef4444', transition: 'left 0.5s ease-out' }}>
              Vos Prétentions ({expectations})
            </div>
          </div>
        </div>
      )}

      {/* Objection du Recruteur */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid var(--primary)', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Le Recruteur :</div>
        <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontStyle: 'italic', fontWeight: 500 }}>
          "{recruiterPrompt}"
        </p>
      </div>

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
              placeholder="Ex: Je comprends vos contraintes. Cependant, compte tenu de mon expérience sur..."
              rows={4}
              style={{ width: '100%', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button 
                onClick={toggleRecording} 
                className={`btn-${isRecording ? 'primary' : 'secondary'}`} 
                style={{ background: isRecording ? '#ef4444' : undefined, borderColor: isRecording ? '#ef4444' : undefined, color: isRecording ? 'white' : undefined, animation: isRecording ? 'pulse-record 1.5s infinite' : 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={handleEvaluate} disabled={!userAnswer.trim()} className="btn-primary" style={{ background: !userAnswer.trim() ? '' : '#10b981', borderColor: !userAnswer.trim() ? '' : '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={18} />
                {`Tenter de négocier (${quotas?.negotiation ?? 0} restants)`}
              </button>
            </div>
          </div>
        </AsyncBoundary>
      ) : (
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
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> À éviter</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>{feedback.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            </div>
          </div>

          <div style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: '0.75rem', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> La réponse du Coach</h4>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: '1.6' }}>"{feedback.improved_answer}"</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <button onClick={() => { setFeedback(null); setUserAnswer(""); }} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={16} /> Retenter ma chance
            </button>
          </div>
        </div>
      )}
      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
}