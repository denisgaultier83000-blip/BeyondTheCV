import { useState, useEffect, useRef, useReducer } from 'react';
import { useDashboard } from './DashboardContext';
import { FileText, Download, Loader2, RefreshCw, Target, CheckCircle2, Plus } from 'lucide-react';
import { KeywordCoachModal } from './KeywordCoachModal';
import { API_BASE_URL } from '../config';
import PdfPreviewer from './PdfPreviewer';
import { useTranslation } from 'react-i18next';


// [EXPERT REFACTOR] Centralisation de la logique d'état avec un reducer.
interface CVTabState {
  previewBody: any | null;
  refreshTrigger: number;
  previewUrl: string | null;
  loadingPreview: boolean;
  addedKeywords: string[];
  coachingKeyword: string | null;
  extraContent: string[];
}

type CVTabAction =
  | { type: 'SET_PREVIEW_BODY'; payload: any }
  | { type: 'SET_PREVIEW_URL'; payload: string | null }
  | { type: 'SET_LOADING_PREVIEW'; payload: boolean }
  | { type: 'TRIGGER_REFRESH' }
  | { type: 'ADD_KEYWORD'; payload: string }
  | { type: 'SET_COACHING_KEYWORD'; payload: string | null }
  | { type: 'ADD_EXTRA_CONTENT'; payload: string };

const cvTabReducer = (state: CVTabState, action: CVTabAction): CVTabState => {
  switch (action.type) {
    case 'SET_PREVIEW_BODY': return { ...state, previewBody: action.payload };
    case 'SET_PREVIEW_URL': return { ...state, previewUrl: action.payload };
    case 'SET_LOADING_PREVIEW': return { ...state, loadingPreview: action.payload };
    case 'TRIGGER_REFRESH': return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    case 'ADD_KEYWORD': return { ...state, addedKeywords: [...state.addedKeywords, action.payload] };
    case 'SET_COACHING_KEYWORD': return { ...state, coachingKeyword: action.payload };
    case 'ADD_EXTRA_CONTENT': return { ...state, extraContent: [...state.extraContent, action.payload] };
    default: return state;
  }
};

export const CVTab = ({ data }: { data: any }) => {
  const { cvData, gapResult } = useDashboard();
  const { t } = useTranslation();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialState: CVTabState = { previewBody: null, refreshTrigger: 0, previewUrl: null, loadingPreview: false, addedKeywords: [], coachingKeyword: null, extraContent: [] };
  const [state, dispatch] = useReducer(cvTabReducer, initialState);
  const { previewBody, refreshTrigger, previewUrl, loadingPreview, addedKeywords, coachingKeyword, extraContent } = state;

  // Logique interactive des mots-clés
  const payload = gapResult || data || {};
  const missingKeywordsRaw = payload.missing_gaps || payload.lacunes || payload.ecarts || [];
  const missingKeywords = missingKeywordsRaw.map((g: any) => typeof g === 'string' ? g : (g.skill || JSON.stringify(g)));
  const baseScore = payload.match_score || payload.score_adequation || payload.matchScore || payload.score || 0;

  const currentScore = baseScore + (addedKeywords.length * (missingKeywords.length > 0 ? Math.ceil((100 - baseScore) / missingKeywords.length) : 0));
  const scoreColor = currentScore >= 80 ? '#10b981' : currentScore >= 50 ? '#f59e0b' : '#ef4444';

  const preparePreviewData = () => {
    // [FIX CRITIQUE] On utilise les données optimisées par l'IA si elles existent
    // On fusionne pour s'assurer d'avoir les skills à jour ajoutés manuellement
    const payloadData = { ...(cvData) };
    
    // [FIX CRITIQUE] On injecte les skills saisis ET les mots-clés acceptés via le coach
    // On s'assure que skills reste un tableau (Array) car le template LaTeX du backend itère dessus.
    let currentSkills = payloadData.skills || cvData?.skills || [];
    if (typeof currentSkills === 'string') {
        currentSkills = currentSkills.split(',').map((s: string) => s.trim());
    }
    if (addedKeywords.length > 0) {
        currentSkills = Array.from(new Set([...currentSkills, ...addedKeywords])).filter(Boolean);
    }
    payloadData.skills = currentSkills;

    // [FIX CRITIQUE] Utilisation de "?" (Optional chaining) pour ne pas planter si cvData est null au 1er rendu
    payloadData.first_name = cvData?.first_name || cvData?.personal_info?.first_name || payloadData.first_name;
    payloadData.last_name = cvData?.last_name || cvData?.personal_info?.last_name || payloadData.last_name;
    payloadData.email = cvData?.email || cvData?.personal_info?.email || payloadData.email;
    payloadData.phone = cvData?.phone || cvData?.personal_info?.phone || payloadData.phone;
    payloadData.linkedin = cvData?.linkedin || cvData?.personal_info?.linkedin || payloadData.linkedin;
    payloadData.city = cvData?.city || cvData?.personal_info?.city || payloadData.city;
    payloadData.country = cvData?.country || cvData?.personal_info?.country || payloadData.country;
    payloadData.current_role = cvData?.current_role || payloadData.current_role;

    // [FIX] Nettoyage automatique de l'URL LinkedIn pour ne garder que le pseudo
    if (payloadData.linkedin) {
        payloadData.linkedin = payloadData.linkedin.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
    }

    // [FIX] S'assurer que le prénom et le nom commencent par une majuscule pour le CV
    const capitalize = (str: string) => str ? str.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "";
    payloadData.first_name = capitalize(payloadData.first_name);
    payloadData.last_name = capitalize(payloadData.last_name);

    // [FIX CRITIQUE] Le backend a impérativement besoin de l'objet `personal_info` pour le rendu PDF.
    // Au lieu de le supprimer, on le met à jour avec les valeurs racines correctes.
    payloadData.personal_info = {
        ...(payloadData.personal_info || {}),
        first_name: payloadData.first_name,
        last_name: payloadData.last_name,
        email: payloadData.email,
        phone: payloadData.phone,
        linkedin: payloadData.linkedin,
        city: payloadData.city,
        country: payloadData.country
    };

    // [FIX EXPERT] L'IA doit LIRE et INTÉGRER les nouvelles suggestions (sans juste les coller en bas)
    if (extraContent.length > 0) {
        payloadData.free_text = (payloadData.free_text ? payloadData.free_text + "\n\n" : "") + "Intègre de manière fluide et très professionnelle ces éléments dans les expériences ou compétences :\n" + extraContent.join("\n");
    }

    if (!payloadData) {
      return;
    }

    // [FIX EXPERT] Debounce pour éviter le spam de requêtes LaTeX sur le serveur
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    
    debounceTimerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_PREVIEW_BODY', payload: {
        action: "CV",
        data: payloadData,
        skip_ai: extraContent.length === 0 && addedKeywords.length === 0,
        preview: true,
        renderer: 'latex'
      }});
      dispatch({ type: 'TRIGGER_REFRESH' });
    }, 800);
  };

  const handleApplyKeyword = (newText: string) => {
    if (coachingKeyword) {
      // Marque le mot-clé comme traité
      if (!addedKeywords.includes(coachingKeyword)) {
        dispatch({ type: 'ADD_KEYWORD', payload: coachingKeyword });
      }
        // [FIX] On sauvegarde le texte édité pour l'injecter dans le PDF
        if (newText && newText.trim()) {
          dispatch({ type: 'ADD_EXTRA_CONTENT', payload: newText.trim() });
        }
    }
  };

  useEffect(() => {
    preparePreviewData();
  // [FIX] Ajout des dépendances manquantes. React déclenchera generatePreview naturellement après mise à jour.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvData, addedKeywords, extraContent]);

  // [FIX EXPERT] Nettoyage du timer au démontage pour éviter les fuites de mémoire
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);


  return (
    <>
    {coachingKeyword && (
      <KeywordCoachModal keyword={coachingKeyword} cvData={cvData} onClose={() => dispatch({ type: 'SET_COACHING_KEYWORD', payload: null })} onApply={handleApplyKeyword} />
    )}
    <div className="cv-tab-container">
      <div className="cv-header">
        <div className="cv-type-selector">
          <button className="cv-type-btn active">
            <FileText size={16} /> {t('cv_ats_optimized', 'CV ATS')}
          </button>
          {/* D'autres boutons pourraient venir ici */}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'TRIGGER_REFRESH' })} disabled={loadingPreview || !previewBody}>
            {loadingPreview ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} {t('cv_refresh', 'Rafraîchir')}
          </button>
          <button className="btn-primary" onClick={() => { if(previewUrl) window.open(previewUrl, '_blank')}} disabled={!previewUrl}>
            <Download size={16} /> {t('cv_download', 'Télécharger')}
          </button>
        </div>
      </div>

      <div className="cv-content-split" style={{ gridTemplateColumns: '350px 1fr' }}>
        
        {/* Colonne Gauche : Score et Mots-clés interactifs */}
        <div className="cv-controls" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Target size={20} color={scoreColor} /> {t('cv_ats_score', 'Score ATS')}
            </h4>
            
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: `${currentScore}%`, height: '100%', background: scoreColor, transition: 'width 0.5s ease-out, background 0.5s ease-in-out' }}></div>
            </div>
            <div style={{ fontSize: '0.95rem', color: scoreColor, fontWeight: 700 }}>{currentScore}/100 - {currentScore >= 80 ? t('score_excellent', "Excellent") : currentScore >= 50 ? t('score_average', "Moyen") : t('score_improve', "À améliorer")}</div>
          </div>

            <div style={{ fontSize: '0.95rem', color: scoreColor, fontWeight: 700 }}>
              {currentScore}/100 - {currentScore >= 80 ? t('score_excellent', "Excellent") : currentScore >= 50 ? t('score_average', "Moyen") : t('score_improve', "À améliorer")}
            </div>
          </div>

          {missingKeywords.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h5 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--danger-text)' }}>{t('cv_missing_keywords', 'Mots-clés manquants')}</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('cv_click_keyword', 'Cliquez sur un mot-clé pour l\'ajouter à votre CV et augmenter votre score.')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {missingKeywords.map((kw: string, i: number) => {
                        const isAdded = addedKeywords.includes(kw);
                        return (
                            <button key={i} onClick={() => { if(!isAdded) dispatch({ type: 'SET_COACHING_KEYWORD', payload: kw }); }} disabled={isAdded} style={{ background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'transparent', color: isAdded ? 'var(--success)' : 'var(--danger-text)', border: `1px solid ${isAdded ? 'var(--success)' : 'var(--danger-text)'}`, padding: '0.35rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', cursor: isAdded ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s' }}>
                                {kw} {isAdded ? <CheckCircle2 size={14}/> : <Plus size={14}/>}
                            </button>
                        );
                    })}
                </div>
            </div>
          )}
        </div>

        {/* Colonne Droite : Le PDF */}
        <div className="cv-preview">
          <div className="preview-header">
            <span>{t('cv_preview_doc', 'Aperçu du Document')}</span>
          </div>
          <div className="preview-document" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '800px', padding: 0 }}>
          {previewBody ? (
            <PdfPreviewer 
              fetchUrl={`${API_BASE_URL}/api/cv/generate`}
              requestBody={previewBody}
              refreshTrigger={refreshTrigger}
              onSuccess={(url) => dispatch({ type: 'SET_PREVIEW_URL', payload: url })}
              onLoadingChange={(isLoading) => dispatch({ type: 'SET_LOADING_PREVIEW', payload: isLoading })}
            />
          ) : (
            <div className="pdf-placeholder">{t('cv_waiting_data', 'En attente des données...')}</div>
          )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};