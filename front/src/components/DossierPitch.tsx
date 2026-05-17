import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Mic, Play, Pause, RotateCcw, BrainCircuit, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';

export const DossierPitch: React.FC = () => {
  const { applicationData } = useOutletContext<any>();
  const { cvData, pitchResult } = applicationData?.data || {};
  
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));

  const [pitchAnalysis, setPitchAnalysis] = useState<any>(null);
  const [isEvaluatingPitch, setIsEvaluatingPitch] = useState(false);
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
      setPitchAnalysis(p?.analysis || null);
    }
  }, [pitchResult]);

  const handlePitchChange = (field: keyof typeof editablePitch, value: string) => {
    setEditablePitch(prev => ({ ...prev, [field]: value }));
  };

  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  const Teleprompter = () => {
    const [timer, setTimer] = useState(180);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          <ArrowLeft size={20} /> {t('btn_back', 'Retour')}
        </button>
        <div id="teleprompter-scroll-container" style={{ flex: 1, overflowY: 'auto', padding: '8rem 2rem 15rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', scrollbarWidth: 'thin' }}>
          {fullPitchText.split('\n\n').map((p, i) => (
            <p key={i} style={{ maxWidth: '800px', width: '100%', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem', color: textColor, textAlign: 'center' }}>{p}</p>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem', background: bgColor, padding: '1rem 2rem', borderRadius: '1rem', boxShadow: isDark ? '0 -10px 40px rgba(255,255,255,0.05)' : '0 -10px 40px rgba(0,0,0,0.1)', zIndex: 100000, border: `1px solid ${controlBg}` }}>
          <div style={{ background: controlBg, padding: '0.5rem 1.5rem', borderRadius: '2rem', fontSize: '2rem', color: textColor, fontFamily: 'monospace', fontWeight: 'bold' }}>{formatTime(timer)}</div>
          <button onClick={toggleTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isTimerRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}</button>
          <button onClick={resetTimer} style={{ width: '60px', height: '60px', borderRadius: '50%', background: controlBg, color: textColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCcw size={24} /></button>
        </div>
      </div>,
      document.body
    );
  };

  const handleEvaluatePitch = async () => {
    setIsEvaluatingPitch(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/evaluate-pitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...editablePitch, 
          target_job: cvData?.target_job || cvData?.target_role_primary || 'Candidat',
          target_language: cvData?.target_language || 'fr'
        })
      });
      const data = await res.json();
      if (data.analysis) setPitchAnalysis(data.analysis);
    } catch (e) { console.error(e); } 
    finally { setIsEvaluatingPitch(false); }
  };

  if (!pitchResult) return <div className="p-10 text-center text-slate-500">Le pitch n'est pas encore disponible.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {isTeleprompterOpen && <Teleprompter />}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Module Communication</p>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Mic size={28} className="text-blue-600" /> Pitch Introductif</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setIsTeleprompterOpen(true)}>
          <Play size={16} /> {t('teleprompter_mode', 'Mode Téléprompteur')}
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-800 mb-3">{t('pitch_hook', 'Accroche')}</h4><textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[120px] outline-none focus:border-blue-500 transition-colors" value={editablePitch.accroche} onChange={e => handlePitchChange('accroche', e.target.value)} /></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-800 mb-3">{t('pitch_proof', 'Preuve & Impact')}</h4><textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[120px] outline-none focus:border-blue-500 transition-colors" value={editablePitch.preuve} onChange={e => handlePitchChange('preuve', e.target.value)} /></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-800 mb-3">{t('pitch_value', 'Valeur Ajoutée')}</h4><textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[120px] outline-none focus:border-blue-500 transition-colors" value={editablePitch.valeur} onChange={e => handlePitchChange('valeur', e.target.value)} /></div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-800 mb-3">{t('pitch_projection', 'Projection')}</h4><textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 min-h-[120px] outline-none focus:border-blue-500 transition-colors" value={editablePitch.projection} onChange={e => handlePitchChange('projection', e.target.value)} /></div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h4 className="m-0 text-slate-800 flex items-center gap-2 font-bold"><BrainCircuit size={20} className="text-blue-600" /> Évaluation de votre Pitch</h4>
            <button onClick={handleEvaluatePitch} disabled={isEvaluatingPitch} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
              {isEvaluatingPitch ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} {isEvaluatingPitch ? "Analyse en cours..." : "Analyser mon Pitch"}
            </button>
          </div>
          {pitchAnalysis && (
            <ScoreGauge score={Number(pitchAnalysis.global_score) || 0} label={t('pitch_impact_score', "Score d'Impact du Pitch")} critique={pitchAnalysis.critique} metrics={[{ label: "Structure", value: pitchAnalysis.structure || "N/A" }, { label: "Clarté", value: pitchAnalysis.clarity || "N/A" }, { label: "Conviction", value: pitchAnalysis.conviction || "N/A" }]} />
          )}
        </div>
      </div>
    </div>
  );
};