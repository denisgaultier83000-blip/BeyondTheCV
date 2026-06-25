import { useState, useRef, useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Printer, ArrowLeft, Lightbulb } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useDashboard } from './DashboardContext';
import { RechargeModal } from './RechargeModal';
import { QuestionItem } from './QuestionItem';

interface QuestionnaireProps {
  questions: any[];
  onBack?: () => void;
  onPrint?: (questions: any[]) => void;
  onUpdate?: (index: number, field: string, value: any) => void;
  loading?: boolean;
  hideHeader?: boolean;
  storageKeyPrefix?: string; // "interview" ou "training"
  evalEndpoint?: string; // Route API spécifique si besoin
  onEvaluateSuccess?: () => void;
}

// [EXPERT REFACTOR] Centralisation de la logique d'état avec un reducer pour plus de robustesse.
type QuestionnaireState = {
  userAnswers: Record<string, string>;
  feedbacks: Record<string, any>;
  errors: Record<string, string>;
  isSubmitting: string | null;
};

type QuestionnaireAction =
  | { type: 'SET_ANSWER'; payload: { qKey: string; answer: string } }
  | { type: 'SUBMIT_START'; payload: { qKey: string } }
  | { type: 'SUBMIT_SUCCESS'; payload: { qKey: string; feedback: any; answer: string } }
  | { type: 'SUBMIT_ERROR'; payload: { qKey: string; error: string } }
  | { type: 'RETRY'; payload: { qKey: string } }
  | { type: 'RESTORE_STATE'; payload: { userAnswers: Record<string, string>; feedbacks: Record<string, any> } };

const questionnaireReducer = (state: QuestionnaireState, action: QuestionnaireAction): QuestionnaireState => {
  switch (action.type) {
    case 'SET_ANSWER':
      return { ...state, userAnswers: { ...state.userAnswers, [action.payload.qKey]: action.payload.answer } };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: action.payload.qKey, errors: { ...state.errors, [action.payload.qKey]: '' } };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: null,
        feedbacks: { ...state.feedbacks, [action.payload.qKey]: action.payload.feedback },
        userAnswers: { ...state.userAnswers, [action.payload.qKey]: action.payload.answer },
      };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: null, errors: { ...state.errors, [action.payload.qKey]: action.payload.error } };
    case 'RETRY': {
      const { qKey } = action.payload;
      const { [qKey]: _a, ...newUserAnswers } = state.userAnswers;
      const { [qKey]: _f, ...newFeedbacks } = state.feedbacks;
      const { [qKey]: _e, ...newErrors } = state.errors;
      return { ...state, userAnswers: newUserAnswers, feedbacks: newFeedbacks, errors: newErrors };
    }
    case 'RESTORE_STATE':
      return { ...state, userAnswers: action.payload.userAnswers, feedbacks: action.payload.feedbacks };
    default:
      return state;
  }
};


export default function Questionnaire({ questions, onBack, onPrint, onUpdate, loading, hideHeader, storageKeyPrefix = "interview", evalEndpoint, onEvaluateSuccess }: QuestionnaireProps) {
  const { t } = useTranslation();
  const dashboard = useDashboard();
  const cvData = dashboard?.cvData;
  const { quotas, fetchQuotas } = dashboard;
  const updateFormData = dashboard?.updateFormData;
  const userAnswersKey = `${storageKeyPrefix}UserAnswers`;
  const feedbacksKey = `${storageKeyPrefix}Feedbacks`;

  const initialState: QuestionnaireState = {
    userAnswers: cvData?.[userAnswersKey] || {},
    feedbacks: cvData?.[feedbacksKey] || {},
    errors: {},
    isSubmitting: null,
  };

  const [state, dispatch] = useReducer(questionnaireReducer, initialState);
  const { userAnswers, feedbacks, errors, isSubmitting } = state;

  const [showRechargeModal, setShowRechargeModal] = useState(false);

  const userAnswersRef = useRef(state.userAnswers);
  useEffect(() => {
      userAnswersRef.current = state.userAnswers;
  });


  const getKey = (q: any, idx: number): string => {
    if (q.id) return String(q.id);
    const text = q.question || q.scenario || q.situation || q.text || q.contexte || q.description || q.defi || "";
    if (text) return text.substring(0, 40).replace(/[^a-z0-9]/gi, '').toLowerCase();
    return idx.toString();
  };

  useEffect(() => {
    const restoredAnswers: Record<string, string> = { ...cvData?.[userAnswersKey] };
    const restoredFeedbacks: Record<string, any> = { ...cvData?.[feedbacksKey] };
    let hasUpdates = false;
    
    if (questions && Array.isArray(questions)) {
      questions.forEach((q, idx) => {
        const qKey = getKey(q, idx);
        if (q.user_answer && !restoredAnswers[qKey]) {
          restoredAnswers[qKey] = q.user_answer;
          hasUpdates = true;
        }
        if (q.evaluation && !restoredFeedbacks[qKey]) {
          restoredFeedbacks[qKey] = q.evaluation;
          hasUpdates = true;
        }
      });
    }

    if (hasUpdates || Object.keys(restoredAnswers).length > 0 || Object.keys(restoredFeedbacks).length > 0) {
      dispatch({ type: 'RESTORE_STATE', payload: { userAnswers: restoredAnswers, feedbacks: restoredFeedbacks } });
    }
  }, [questions, cvData?.[userAnswersKey], cvData?.[feedbacksKey], userAnswersKey, feedbacksKey]);

  const handleRetry = (qKey: string) => {
    const { [qKey]: _f, ...newF } = feedbacks;
    const { [qKey]: _a, ...newA } = userAnswers;
    dispatch({ type: 'RETRY', payload: { qKey } });
    if (updateFormData) { 
      updateFormData(feedbacksKey, newF); updateFormData(userAnswersKey, newA); 
    }
  };

  const handleSubmit = async (qKey: string, q: any) => {
    const answer = userAnswers[qKey];
    if (!answer) return;
    
    dispatch({ type: 'SUBMIT_START', payload: { qKey } });
    
    if ((quotas?.qa ?? 0) <= 0) {
      setShowRechargeModal(true);
      dispatch({ type: 'SUBMIT_ERROR', payload: { qKey, error: "Crédits épuisés" } }); // Annule l'état de soumission
      return;
    }

    const questionText = q.question || q.text || "Question non spécifiée";
    const suggestedAnswer = q.suggested_answer || q.answer || q.reponse_suggeree || q.reponse || "";
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}${evalEndpoint || '/api/cv/evaluate-interview-answer'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            question: questionText, 
            category: q.category, 
            suggested_framework: suggestedAnswer,
            user_answer: answer,
            theme: q.category,
            question_type: q.type,
            question_text: questionText,
            interview_format: cvData?.interview_format,
            stress_level: cvData?.stress_level
        }),
      });
      
      if (!response.ok) {
        if (response.status === 402) setShowRechargeModal(true);
        let errMsg = "Erreur de communication avec le serveur.";
        try { const errObj = await response.json(); errMsg = errObj.detail || errMsg; } catch(e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      dispatch({ type: 'SUBMIT_SUCCESS', payload: { qKey, feedback: data.feedback, answer } });
      
      if (updateFormData) {
          updateFormData(feedbacksKey, { ...feedbacks, [qKey]: data.feedback });
          updateFormData(userAnswersKey, { ...userAnswers, [qKey]: answer }); // La réponse est déjà dans le state via le reducer
      }
      
      if (onEvaluateSuccess) onEvaluateSuccess();
      if (fetchQuotas) fetchQuotas(); // [NOUVEAU] Rafraîchissement des quotas
    } catch (error: any) {
      dispatch({ type: 'SUBMIT_ERROR', payload: { qKey, error: error.message || "Une erreur de communication avec l'IA est survenue. Veuillez réessayer." } });
    }
  };

  return (
    <div className={hideHeader ? "" : "step-content"} style={{ maxWidth: '1200px', margin: '0 auto', padding: hideHeader ? '0' : '20px' }}>
      {!hideHeader && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            {onBack ? (
              <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={16} /> {t('back_productions') || 'Retour'}
              </button>
            ) : <div />}
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
              <MessageSquare size={28} color="var(--primary)" />
              {t('card_interview_title') || 'Questionnaire d\'Entretien'}
            </h2>
            {onPrint ? (
              <button onClick={() => onPrint(questions)} className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} /> {loading ? t('generating') : (t('print') || 'Imprimer')}
              </button>
            ) : <div />}
          </div>
          
          <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Lightbulb size={20} color="#eab308" style={{ flexShrink: 0 }} />
            <span><strong>Indicateur de difficulté :</strong> De ★ (Question abordable) à ★★★★★ (Mise en situation complexe ou question piège). Et la dernière question vous permet de vous entraîner à l'inversion de rôle !</span>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .staggered-card { animation: slideUpFade 0.5s ease-out forwards; opacity: 0; }
      `}</style>

      {/* Affichage pleine largeur (1fr) pour plus de lisibilité avec animation en cascade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {(!questions || questions.length === 0) ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
            Aucune question n'a été trouvée ou le format généré par l'IA est incorrect.
          </div>
        ) : (
          questions.map((q, idx) => {
            const qKey = getKey(q, idx);
            return (
              <QuestionItem
                key={qKey}
                question={q}
                qKey={qKey}
                userAnswer={userAnswers[qKey] || ''}
                feedback={feedbacks[qKey]}
                error={errors[qKey]}
                isSubmitting={isSubmitting === qKey}
                quotas={quotas?.qa ?? 0}
                onAnswerChange={(key, value) => dispatch({ type: 'SET_ANSWER', payload: { qKey: key, answer: value } })}
                onSubmit={handleSubmit}
                onRetry={handleRetry}
                onUpdate={(field, value) => onUpdate && onUpdate(idx, field, value)}
              />
            );
          })
        )}
      </div>
      <RechargeModal isOpen={showRechargeModal} onClose={() => setShowRechargeModal(false)} />
    </div>
  );
}