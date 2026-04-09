import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { Mic, MessageSquare, X, Play, Pause, RotateCcw, ChevronDown, BrainCircuit, Lightbulb, ArrowLeft } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { SituationSimulator } from './SituationSimulator';

// Ce sous-composant peut être extrait dans son propre fichier s'il grandit
const QAList = ({ questions }: { questions: any }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // [FIX CRITIQUE] Sécurisation de l'extraction : si l'IA a renvoyé un objet { questions: [...] } on extrait le tableau
  const safeQuestions = Array.isArray(questions) ? questions : (questions?.questions || []);

  return (
    <div className="qa-list">
      {safeQuestions.map((item: any, index: number) => (
        <div key={index} className="qa-item" style={{ animationDelay: `${index * 100}ms` }}>
          <div className="qa-header" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
            <div className="qa-icon"><BrainCircuit size={20} /></div>
            <div className="qa-question-content">
              <div className="qa-category">{item.category}</div>
              <p className="qa-question">{item.question}</p>
            </div>
            <ChevronDown className={`qa-chevron ${openIndex === index ? 'open' : ''}`} />
          </div>
          {openIndex === index && (
            <div className="qa-body">
              <div className="qa-answer-box">
                <h4 className="qa-answer-title"><MessageSquare size={16} /> Réponse Suggérée</h4>
                <textarea className="qa-answer-textarea" defaultValue={item.suggested_answer} />
              </div>
              <div className="qa-advice">
                <Lightbulb size={28} style={{ flexShrink: 0 }} />
                <span><strong>Conseil du Coach :</strong> {item.advice}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const InterviewTab = () => {
  const { pitchResult, questionsResult, globalStatus } = useDashboard();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // [FIX] Local state pour rendre le pitch éditable et réactif
  const [editablePitch, setEditablePitch] = useState({
    accroche: "", preuve: "", valeur: "", projection: ""
  });

  useEffect(() => {
    if (pitchResult) {
      const p = pitchResult?.pitch || pitchResult || {};
      setEditablePitch({
        accroche: p.accroche || "",
        preuve: p.preuve || "",
        valeur: p.valeur || "",
        projection: p.projection || ""
      });
    }
  }, [pitchResult]);

  const handlePitchChange = (field: string, value: string) => {
    setEditablePitch(prev => ({ ...prev, [field]: value }));
  };

  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTeleprompterOpen = () => {
    setTimer(0);
    setIsTimerRunning(false);
    setIsTeleprompterOpen(true);
  };
  
  const handleTeleprompterClose = () => {
    setIsTimerRunning(false);
    setIsTeleprompterOpen(false);
  };

  const toggleTimer = () => setIsTimerRunning(prev => !prev);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimer(0);
  };

  // [FIX] Utilisation de createPortal pour échapper aux contraintes CSS parentes et corriger le scrolling
  const Teleprompter = () => createPortal(
    <div className="teleprompter-overlay" style={{ zIndex: 999999 }}>
      {/* [FIX] Bouton Retour explicite et toujours visible */}
      <button onClick={handleTeleprompterClose} className="teleprompter-close" style={{ top: '2rem', left: '2rem', right: 'auto', width: 'auto', padding: '0 1.5rem', borderRadius: '2rem', gap: '0.5rem', fontWeight: 'bold' }}>
        <ArrowLeft size={20} /> Retour
      </button>
      <div className="teleprompter-text-container" style={{ paddingBottom: '8rem' }}>
        {fullPitchText.split('\n\n').map((p, i) => (
          <p key={i} className="teleprompter-paragraph">{p}</p>
        ))}
      </div>
      {/* [FIX] Ajout du positionnement en inline pour écraser le CSS de DashboardView et garantir la visibilité */}
      <div className="teleprompter-controls" style={{ position: 'fixed', bottom: '2rem', display: 'flex', gap: '1rem', zIndex: 100000 }}>
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1.5rem', borderRadius: '2rem', fontSize: '2rem', color: 'white', fontFamily: 'monospace' }}>
          {formatTime(timer)}
        </div>
        <button onClick={toggleTimer} className="btn-glass" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isTimerRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={resetTimer} className="btn-glass" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RotateCcw size={24} />
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {isTeleprompterOpen && <Teleprompter />}
      <div className="interview-tab-container">
        <DashboardCard
          title="Pitch de 3 minutes"
          icon={<Mic size={24} />}
          loading={globalStatus === 'PROCESSING' && !pitchResult}
          loadingText="Génération de votre pitch..."
          error={!pitchResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED')}
          errorText="Le pitch n'a pas pu être généré."
          featureId="pitch_3_min"
          headerAction={pitchResult && (
            <button className="btn-primary" onClick={handleTeleprompterOpen}>
              <Play size={16} style={{ marginRight: '0.5rem' }} /> Mode Téléprompteur
            </button>
          )}
        >
          {pitchResult && (
            <div className="pitch-grid">
              <div className="pitch-card"><h4>Accroche</h4><textarea className="pitch-textarea" value={editablePitch.accroche} onChange={e => handlePitchChange('accroche', e.target.value)} /></div>
              <div className="pitch-card"><h4>Preuve & Impact</h4><textarea className="pitch-textarea" value={editablePitch.preuve} onChange={e => handlePitchChange('preuve', e.target.value)} /></div>
              <div className="pitch-card"><h4>Valeur Ajoutée</h4><textarea className="pitch-textarea" value={editablePitch.valeur} onChange={e => handlePitchChange('valeur', e.target.value)} /></div>
              <div className="pitch-card"><h4>Projection</h4><textarea className="pitch-textarea" value={editablePitch.projection} onChange={e => handlePitchChange('projection', e.target.value)} /></div>
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Questionnaire d'Entretien"
          icon={<MessageSquare size={24} />}
          loading={globalStatus === 'PROCESSING' && !questionsResult}
          loadingText="Génération des questions..."
          error={!questionsResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED')}
          errorText="Le questionnaire n'a pas pu être généré."
          featureId="interview_questions"
        >
          {questionsResult && <QAList questions={questionsResult} />}
        </DashboardCard>

        {/* MODULE MISE EN SITUATION */}
        <DashboardCard
          title="Simulations de Cas (Mises en situation)"
          icon={<BrainCircuit size={24} />}
          featureId="situation_simulator"
        >
          <SituationSimulator />
        </DashboardCard>
      </div>
      {/* [FIX] Ajout des styles de la scrollbar directement ici pour garantir la visibilité */}
      <style>{`
        .teleprompter-text-container { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) rgba(255,255,255,0.05); } /* For Firefox */
        .teleprompter-text-container::-webkit-scrollbar { width: 8px !important; display: block !important; } /* For Chrome/Safari */
        .teleprompter-text-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .teleprompter-text-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .teleprompter-text-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </>
  );
};