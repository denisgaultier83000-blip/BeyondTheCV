import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from './DashboardContext';
import { Mic, MessageSquare, Play, Pause, RotateCcw, BrainCircuit, ArrowLeft } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { SituationSimulator } from './SituationSimulator';
import Questionnaire from './Questionnaire';

export const InterviewTab = () => {
  const { pitchResult, questionsResult, globalStatus } = useDashboard();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));

  const [editablePitch, setEditablePitch] = useState<{accroche: string, preuve: string, valeur: string, projection: string}>({
    accroche: "", preuve: "", valeur: "", projection: ""
  });

  useEffect(() => {
    if (pitchResult) {
      const p = pitchResult?.pitch || pitchResult;
      setEditablePitch({
        accroche: p?.accroche || "",
        preuve: p?.preuve || "",
        valeur: p?.valeur || "",
        projection: p?.projection || ""
      });
    }
  }, [pitchResult]);

  const handlePitchChange = (field: keyof typeof editablePitch, value: string) => {
    setEditablePitch(prev => ({ ...prev, [field]: value }));
  };

  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  // --- LOGIQUE TÉLÉPROMPTEUR DÉPLACÉE ICI ---
  const Teleprompter = () => {
    const [timer, setTimer] = useState(180);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      if (isTimerRunning) {
        timerRef.current = setInterval(() => setTimer(prev => (prev > 0 ? prev - 1 : 0)), 1000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerRunning]);

    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsTimerRunning(prev => !prev);
    const resetTimer = () => {
      setIsTimerRunning(false);
      setTimer(180);
      const container = document.getElementById('teleprompter-scroll-container');
      if (container) container.scrollTop = 0;
    };

    const bgColor = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const controlBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    return createPortal(
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bgColor, zIndex: 999999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button onClick={() => setIsTeleprompterOpen(false)} style={{ position: 'absolute', top: '2rem', left: '2rem', background: controlBg, color: textColor, border: 'none', padding: '0.75rem 1.5rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}>
          <ArrowLeft size={20} /> Retour
        </button>
        
        <div id="teleprompter-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '8rem 2rem 15rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollbarWidth: 'thin' }}>
          {fullPitchText.split('\n\n').map((p, i) => (
            <p key={i} style={{ maxWidth: '800px', width: '100%', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem', color: textColor, textAlign: 'center' }}>{p}</p>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', background: bgColor, padding: '1rem 2rem', borderRadius: '1rem', boxShadow: isDark ? '0 -10px 40px rgba(255,255,255,0.05)' : '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 100000, border: `1px solid ${controlBg}` }}>
          <div style={{ background: controlBg, padding: '0.5rem 1.5rem', borderRadius: '2rem', fontSize: '2rem', color: textColor, fontFamily: 'monospace', fontWeight: 'bold' }}>
            {formatTime(timer)}
          </div>
          <button onClick={toggleTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isTimerRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
          </button>
          <button onClick={resetTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={24} />
          </button>
        </div>
      </div>,
      document.body
    );
  };

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
            <button className="btn-primary" onClick={() => setIsTeleprompterOpen(true)}>
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
          {questionsResult && <Questionnaire questions={Array.isArray(questionsResult) ? questionsResult : (questionsResult.questions || [])} hideHeader={true} />}
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
    </>
  );
};