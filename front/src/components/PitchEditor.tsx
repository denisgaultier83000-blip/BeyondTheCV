import React, { useState, useEffect, useReducer } from 'react';
import { Mic, Play, Pause, RotateCcw, ArrowLeft, Shield, Users, Briefcase, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import PitchOralTrainer from './PitchOralTrainer';
import { Teleprompter } from './Teleprompter';

interface PitchEditorProps { // Props du composant
    pitchResult: any;
    cvData: any;
    updateFormData?: (key: string, value: any) => void;
    globalStatus: string;
}

export const PitchEditor: React.FC<PitchEditorProps> = ({ pitchResult, cvData, updateFormData, globalStatus }) => {
  // --- HOOKS & ÉTAT SIMPLE ---
  const { t } = useTranslation();
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isDark] = useState(() => document.body.classList.contains('dark-mode'));

  // --- GESTION D'ÉTAT AVEC useReducer ---
  // [EXPERT REFACTOR] Centralisation de la logique d'état complexe pour une meilleure prévisibilité.
  
  // 1. Définition de la structure de l'état
  interface PitchState {
    pitchMatrix: any | null;
    activePitch: string;
    editablePitch: { accroche: string; preuve: string; valeur: string; projection: string; };
  }

  // 2. Définition des actions possibles
  type PitchAction =
    | { type: 'set_pitch_matrix'; payload: any }
    | { type: 'set_active_pitch'; payload: { pitchType: string; matrix: any; } }
    | { type: 'set_editable_pitch'; payload: { field: keyof PitchState['editablePitch']; value: string } }
    | { type: 'set_all_fields'; payload: PitchState['editablePitch'] }
    | { type: 'reset_pitch'; payload: { matrix: any; pitchType: string; } };

  // Fonction utilitaire pour parser le texte en 4 champs
  const splitTextIntoFields = (text: string | undefined) => {
    if (!text) return { accroche: "", preuve: "", valeur: "", projection: "" };
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return { accroche: paragraphs[0] || '', preuve: paragraphs[1] || '', valeur: paragraphs[2] || '', projection: paragraphs.slice(3).join('\n\n') || '' };
  };

  // 3. Le reducer : le cœur de la logique d'état
  const pitchReducer = (state: PitchState, action: PitchAction): PitchState => {
    switch (action.type) {
      case 'set_pitch_matrix':
        return { ...state, pitchMatrix: action.payload };
      case 'set_active_pitch': {
        const { pitchType, matrix } = action.payload;
        const fullText = matrix?.[pitchType]?.oral || matrix?.[pitchType]?.written;
        return { ...state, activePitch: pitchType, editablePitch: splitTextIntoFields(fullText) };
      }
      case 'set_editable_pitch':
        return { ...state, editablePitch: { ...state.editablePitch, [action.payload.field]: action.payload.value } };
      case 'set_all_fields':
        return { ...state, editablePitch: action.payload };
      case 'reset_pitch': {
        const { matrix, pitchType } = action.payload;
        const fullText = matrix?.[pitchType]?.oral || matrix?.[pitchType]?.written;
        return { ...state, editablePitch: splitTextIntoFields(fullText) };
      }
      default:
        return state;
    }
  };

  // 4. Initialisation du reducer
  const initialState: PitchState = { pitchMatrix: null, activePitch: 'recruiter_pitch', editablePitch: { accroche: "", preuve: "", valeur: "", projection: "" } };
  const [state, dispatch] = useReducer(pitchReducer, initialState);
  const { pitchMatrix, activePitch, editablePitch } = state;

  // --- GESTION DES EFFETS DE BORD (Props, Sauvegarde) ---
  useEffect(() => {
    if (pitchResult) dispatch({ type: 'set_pitch_matrix', payload: pitchResult });
  }, [pitchResult]);

  useEffect(() => {
    const savedPitch = cvData?.editablePitch;
    if (savedPitch && Object.values(savedPitch).some(v => !!v)) {
      dispatch({ type: 'set_all_fields', payload: savedPitch });
    } else if (pitchMatrix) { // Si pas de sauvegarde, on peuple depuis la matrice
      dispatch({ type: 'set_active_pitch', payload: { pitchType: activePitch, matrix: pitchMatrix } });
    }
  }, [pitchMatrix, cvData?.editablePitch]); // Déclenché uniquement quand les données sources changent

  // Sauvegarde automatique des modifications dans le contexte parent
  useEffect(() => {
    if (updateFormData) updateFormData('editablePitch', editablePitch);
  }, [editablePitch, updateFormData]);

  // --- PROPRIÉTÉS DÉRIVÉES ---
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
            <button onClick={() => {
              if (window.confirm(t('confirm_reset_pitch', "Voulez-vous vraiment annuler vos modifications et restaurer le pitch original généré par l'IA ?")))
                dispatch({ type: 'reset_pitch', payload: { matrix: pitchMatrix, pitchType: activePitch } });
            }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Restaurer le pitch généré par l'IA">
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
                <div className="pitch-selector-tabs"><button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'recruiter_pitch', matrix: pitchMatrix } })} className={activePitch === 'recruiter_pitch' ? 'active' : ''}><Clock size={16}/> Stratégique</button></div>
              </div>
              <div className="pitch-selector-group">
                <h6 className="pitch-selector-title">Par Audience</h6>
                <div className="pitch-selector-tabs">
                  <button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'recruiter_pitch', matrix: pitchMatrix } })} className={activePitch === 'recruiter_pitch' ? 'active' : ''}><Briefcase size={16}/> Recruteur</button>
                  <button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'executive_pitch', matrix: pitchMatrix } })} className={activePitch === 'executive_pitch' ? 'active' : ''}><Building size={16}/> Dirigeant</button>
                  <button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'hr_pitch', matrix: pitchMatrix } })} className={activePitch === 'hr_pitch' ? 'active' : ''}><Users size={16}/> RH</button>
                  <button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'networking_pitch', matrix: pitchMatrix } })} className={activePitch === 'networking_pitch' ? 'active' : ''}><Users size={16}/> Réseau</button>
                  <button onClick={() => dispatch({ type: 'set_active_pitch', payload: { pitchType: 'anti_flaw_pitch', matrix: pitchMatrix } })} className={activePitch === 'anti_flaw_pitch' ? 'active' : ''}><Shield size={16}/> Anti-Failles</button>
                </div>
              </div>
            </div>
            {isShortFormat ? (
              <div className="pitch-single-field" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <textarea className="pitch-textarea" value={fullPitchText} onChange={e => dispatch({ type: 'set_all_fields', payload: splitTextIntoFields(e.target.value) })} rows={10} />
              </div>
            ) : (
              <div className="pitch-grid" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <div className="pitch-card"><h4>{t('pitch_hook', 'Accroche')}</h4><textarea className="pitch-textarea" value={editablePitch.accroche} onChange={e => dispatch({ type: 'set_editable_pitch', payload: { field: 'accroche', value: e.target.value } })} /></div>
                <div className="pitch-card"><h4>{t('pitch_proof', 'Preuve & Impact')}</h4><textarea className="pitch-textarea" value={editablePitch.preuve} onChange={e => dispatch({ type: 'set_editable_pitch', payload: { field: 'preuve', value: e.target.value } })} /></div>
                <div className="pitch-card"><h4>{t('pitch_value', 'Valeur Ajoutée')}</h4><textarea className="pitch-textarea" value={editablePitch.valeur} onChange={e => dispatch({ type: 'set_editable_pitch', payload: { field: 'valeur', value: e.target.value } })} /></div>
                <div className="pitch-card"><h4>{t('pitch_projection', 'Projection')}</h4><textarea className="pitch-textarea" value={editablePitch.projection} onChange={e => dispatch({ type: 'set_editable_pitch', payload: { field: 'projection', value: e.target.value } })} /></div>
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