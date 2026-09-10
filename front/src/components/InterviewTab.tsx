import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDashboard } from '../hooks/DashboardContext';
import { Mic, Play, Pause, RotateCcw, ArrowLeft, Lightbulb, Shield, Users, Briefcase, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import AutoResizeTextarea from './AutoResizeTextarea';
import { Button, SegmentedControl } from './common';

// --- LOGIQUE TÉLÉPROMPTEUR DÉPLACÉE ICI (À LA RACINE) ---
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

export const InterviewTab = () => {
  const { pitchResult, questionsResult, customScenariosResult, globalStatus, cvData, updateFormData } = useDashboard();
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false); // État pour le téléprompteur
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));
  const [activePitchKey, setActivePitchKey] = useState('three_minutes'); // [FIX] Le pitch par défaut est maintenant celui de 3 minutes
  const [activePitchGroup, setActivePitchGroup] = useState('core_pitches');
  const [editablePitch, setEditablePitch] = useState({
    written: "",
    oral: "",
    accroche: "", preuve: "", valeur: "", projection: ""
  });

  useEffect(() => {
    console.log('--- Pitch Result (Final Debug) ---');
    console.log(JSON.stringify(pitchResult, null, 2));
    if (pitchResult) {
      const savedEditablePitch = cvData?.editablePitch;
      if (savedEditablePitch && Object.values(savedEditablePitch).some(v => v)) {
        setEditablePitch(savedEditablePitch); // Restaure les modifications de l'utilisateur
      } else {
        // [FIX] On charge le pitch de 3 minutes par défaut au premier chargement
        populateFieldsFromMatrix(pitchResult, 'three_minutes', 'core_pitches');
      }
    }
  }, [pitchResult]);

  // Peuple les 4 champs à partir de la matrice de l'IA
  const populateFieldsFromMatrix = (matrix: any, pitchKey: string, pitchGroup: string) => {
    const pitchData = matrix?.[pitchGroup]?.[pitchKey];
    if (!pitchData) return;

    // La nouvelle structure est plus simple : on a toujours `oral` et `written`.
    // On utilise le texte oral pour le découper en 4 champs éditables.
    const fullText = pitchData.oral || pitchData.written || '';

    const newEditablePitch = {
      written: pitchData.written || '',
      oral: pitchData.oral || '',
      full_text: fullText // [NOUVEAU] On stocke le texte complet pour l'édition
    };

    setEditablePitch(newEditablePitch);

    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  // Gère le changement dans un des 4 champs
  const handlePitchChange = (newText: string) => {
    const newEditablePitch = { ...editablePitch, full_text: newText };
    setEditablePitch(newEditablePitch);
    if (updateFormData) {
      updateFormData('editablePitch', newEditablePitch);
    }
  };

  const currentPitchData = pitchResult?.[activePitchGroup]?.[activePitchKey];
  const coachingAngle = currentPitchData?.angle || currentPitchData?.goal || pitchResult?.coaching_notes?.strongest_angle || null;


  // Le texte du téléprompteur est maintenant directement le champ éditable
  const fullPitchText = editablePitch.full_text || "";

  const handleResetPitch = () => {
    if (!window.confirm(t('confirm_reset_pitch', "Voulez-vous vraiment annuler vos modifications et restaurer le pitch original généré par l'IA ?"))) return;
    if (pitchResult) {
      populateFieldsFromMatrix(pitchResult, activePitchKey, activePitchGroup);
    }
  };

  const handleTabClick = (pitchKey: string, pitchGroup: string) => {
    setActivePitchKey(pitchKey);
    setActivePitchGroup(pitchGroup);
    populateFieldsFromMatrix(pitchResult, pitchKey, pitchGroup);
  };

  return (
    <>
      {isTeleprompterOpen && <Teleprompter fullPitchText={fullPitchText} isDark={isDark} setIsTeleprompterOpen={setIsTeleprompterOpen} t={t} />}
      <div className="interview-tab-container">
        
        <div id="pitch_section">
        <DashboardCard
          title={t('deliv_pitch', "Matrice de Pitchs")}
          icon={<Mic size={24} />}
          loading={globalStatus === 'PROCESSING' && !pitchResult}
          loadingText={t('pitch_loading', "Génération de votre pitch...")}
          error={pitchResult?.error || (!pitchResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED'))}
          errorText={pitchResult?.message ? `Erreur IA : ${pitchResult.message}` : t('pitch_error', "Le pitch n'a pas pu être généré.")}
          featureId="pitch_3_min"
          headerAction={pitchResult && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={16} />}
                onClick={handleResetPitch}
                title="Restaurer le pitch généré par l'IA"
              >
                {t('btn_reset', 'Réinitialiser')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Play size={16} />}
                onClick={() => setIsTeleprompterOpen(true)}
              >
                {t('teleprompter_mode', 'Téléprompteur')}
              </Button>
            </div>
          )}
        >
          {pitchResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* --- INTERFACE À ONGLETS DE SÉLECTION (CHIPS/SEGMENTED CONTROLS À GAUCHE) --- */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'flex-start' }}>
                <SegmentedControl
                  label="Format"
                  value={['thirty_seconds', 'three_minutes'].includes(activePitchKey) ? activePitchKey : ''}
                  onChange={(val) => handleTabClick(val, 'core_pitches')}
                  options={[
                    { value: 'thirty_seconds', label: '30 s', icon: <Clock size={14} /> },
                    { value: 'three_minutes', label: '3 min', icon: <Clock size={14} /> }
                  ]}
                />
                <SegmentedControl
                  label="Audience"
                  value={['role_fit_pitch', 'business_impact_pitch', 'culture_fit_pitch', 'objection_handling_pitch'].includes(activePitchKey) ? activePitchKey : ''}
                  onChange={(val) => handleTabClick(val, 'audience_adaptations')}
                  options={[
                    { value: 'role_fit_pitch', label: 'Manager', icon: <Briefcase size={14} /> },
                    { value: 'business_impact_pitch', label: 'Dirigeant', icon: <Building size={14} /> },
                    { value: 'culture_fit_pitch', label: 'RH', icon: <Users size={14} /> },
                    { value: 'objection_handling_pitch', label: 'Anti-Failles', icon: <Shield size={14} /> }
                  ]}
                />
              </div>

              {/* --- NOUVEAU BLOC DE COACHING --- */}
              {coachingAngle && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', animation: 'fadeIn 0.4s ease-out' }}>
                  <Lightbulb size={18} />
                  <div>
                    <strong>Angle stratégique :</strong>
                    <p>{coachingAngle}</p>
                  </div>
                </div>
              )}

              {/* --- BLOC DU CHAMP ÉDITABLE UNIQUE --- */}
              <div className="pitch-single-field" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <AutoResizeTextarea
                  className="pitch-textarea"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
                  value={fullPitchText}
                  onChange={e => handlePitchChange(e.target.value)}
                  minHeight={140}
                  maxHeight={460}
                />
              </div>
            </div>
          )}
        </DashboardCard>
        </div>
      </div>
    </>
  );
};