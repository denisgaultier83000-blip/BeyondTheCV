import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Play, RotateCcw, ArrowLeft, Shield, Users, Briefcase, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import PitchOralTrainer from './PitchOralTrainer';

// --- TELEPROMPTER COMPONENT (Internal to PitchEditor) ---
const Teleprompter = ({ fullPitchText, setIsTeleprompterOpen, isDark, t }: { fullPitchText: string, setIsTeleprompterOpen: any, isDark: boolean, t: any }) => {
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
        {fullPitchText.split('\n\n').map((p: string, i: number) => (
          <p key={i} style={{ maxWidth: '800px', width: '100%', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem', color: textColor, textAlign: 'center' }}>{p}</p>
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

interface PitchEditorProps {
    pitchResult: any;
    cvData: any;
    updateFormData?: (key: string, value: any) => void;
    globalStatus: string;
}

export const PitchEditor: React.FC<PitchEditorProps> = ({ pitchResult, cvData, updateFormData, globalStatus }) => {
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));
  const [pitchMatrix, setPitchMatrix] = useState<any>(null);
  const [activePitch, setActivePitch] = useState('recruiter_pitch');
  const [editablePitch, setEditablePitch] = useState({ accroche: "", preuve: "", valeur: "", projection: "" });

  const splitTextIntoFields = (text: string) => {
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return {
      accroche: paragraphs[0] || '',
      preuve: paragraphs[1] || '',
      valeur: paragraphs[2] || '',
      projection: paragraphs.slice(3).join('\n\n') || '',
    };
  };

  const populateFieldsFromMatrix = (matrix: any, pitchType: string) => {
    const fullText = matrix?.[pitchType]?.oral || matrix?.[pitchType]?.written || '';
    const newFields = splitTextIntoFields(fullText);
    setEditablePitch(newFields);
    if (updateFormData) updateFormData('editablePitch', newFields);
  };

  useEffect(() => {
    if (pitchResult && !pitchMatrix) {
      setPitchMatrix(pitchResult);
    }
    const savedPitch = cvData?.editablePitch;
    if (savedPitch && Object.values(savedPitch).some(v => !!v)) {
      setEditablePitch(savedPitch);
    } else if (pitchMatrix) {
      populateFieldsFromMatrix(pitchMatrix, activePitch);
    }
  }, [pitchResult, pitchMatrix, activePitch, cvData?.editablePitch]);

  const handleFieldChange = (field: keyof typeof editablePitch, value: string) => {
    const newEditablePitch = { ...editablePitch, [field]: value };
    setEditablePitch(newEditablePitch);
    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  const handleTabClick = (pitchType: string) => {
    setActivePitch(pitchType);
  };

  const handleResetPitch = () => {
    if (!window.confirm(t('confirm_reset_pitch', "Voulez-vous vraiment annuler vos modifications et restaurer le pitch original généré par l'IA ?"))) return;
    if (pitchResult) {
      populateFieldsFromMatrix(pitchResult, activePitch);
    }
  };

  const shortPitchFormats = ['networking_pitch'];
  const isShortFormat = shortPitchFormats.includes(activePitch);
  const fullPitchText = [editablePitch.accroche, editablePitch.preuve, editablePitch.valeur, editablePitch.projection].filter(Boolean).join('\n\n');

  return (
    <>
      {isTeleprompterOpen && <Teleprompter fullPitchText={fullPitchText} isDark={isDark} setIsTeleprompterOpen={setIsTeleprompterOpen} t={t} />}
      <DashboardCard
        title={t('deliv_pitch', "Pitch de 3 minutes")}
        icon={<Mic size={24} />}
        loading={globalStatus === 'PROCESSING' && !pitchResult}
        loadingText={t('pitch_loading', "Génération de votre pitch...")}
        error={!pitchResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED')}
        errorText={t('pitch_error', "Le pitch n'a pas pu être généré.")}
        featureId="pitch_3_min"
        headerAction={pitchResult && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleResetPitch} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Restaurer le pitch généré par l'IA">
              <RotateCcw size={16} /> {t('btn_reset', 'Réinitialiser')}
            </button>
            <button className="btn-primary" onClick={() => setIsTeleprompterOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <Play size={16} /> {t('teleprompter_mode', 'Téléprompteur')}
            </button>
          </div>
        )}
      >
        {pitchResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="pitch-selector-container">
              <div className="pitch-selector-group">
                <h6 className="pitch-selector-title">Format</h6>
                <div className="pitch-selector-tabs"><button onClick={() => handleTabClick('recruiter_pitch')} className={activePitch === 'recruiter_pitch' ? 'active' : ''}><Clock size={16}/> Stratégique</button></div>
              </div>
              <div className="pitch-selector-group">
                <h6 className="pitch-selector-title">Par Audience</h6>
                <div className="pitch-selector-tabs">
                  <button onClick={() => handleTabClick('recruiter_pitch')} className={activePitch === 'recruiter_pitch' ? 'active' : ''}><Briefcase size={16}/> Recruteur</button>
                  <button onClick={() => handleTabClick('executive_pitch')} className={activePitch === 'executive_pitch' ? 'active' : ''}><Building size={16}/> Dirigeant</button>
                  <button onClick={() => handleTabClick('hr_pitch')} className={activePitch === 'hr_pitch' ? 'active' : ''}><Users size={16}/> RH</button>
                  <button onClick={() => handleTabClick('networking_pitch')} className={activePitch === 'networking_pitch' ? 'active' : ''}><Users size={16}/> Réseau</button>
                  <button onClick={() => handleTabClick('anti_flaw_pitch')} className={activePitch === 'anti_flaw_pitch' ? 'active' : ''}><Shield size={16}/> Anti-Failles</button>
                </div>
              </div>
            </div>
            {isShortFormat ? (
              <div className="pitch-single-field" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <textarea className="pitch-textarea" value={fullPitchText} onChange={e => { const newFields = splitTextIntoFields(e.target.value); setEditablePitch(newEditablePitch => ({...newEditablePitch, ...newFields})); if (updateFormData) { updateFormData('editablePitch', newFields); } }} rows={10} />
              </div>
            ) : (
              <div className="pitch-grid" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div className="pitch-card"><h4>{t('pitch_hook', 'Accroche')}</h4><textarea className="pitch-textarea" value={editablePitch.accroche} onChange={e => handleFieldChange('accroche', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_proof', 'Preuve & Impact')}</h4><textarea className="pitch-textarea" value={editablePitch.preuve} onChange={e => handleFieldChange('preuve', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_value', 'Valeur Ajoutée')}</h4><textarea className="pitch-textarea" value={editablePitch.valeur} onChange={e => handleFieldChange('valeur', e.target.value)} /></div>
                <div className="pitch-card"><h4>{t('pitch_projection', 'Projection')}</h4><textarea className="pitch-textarea" value={editablePitch.projection} onChange={e => handleFieldChange('projection', e.target.value)} /></div>
              </div>
            )}
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
              {t('teleprompter_pitch_hint', "Le téléprompteur utilisera le contenu de la version orale que vous avez sélectionnée et modifiée ci-dessus.")}
            </p>
            <PitchOralTrainer />
          </div>
        )}
      </DashboardCard>
    </>
  );
};