import React from 'react';
import { useDashboard } from './DashboardContext';
import { MessageSquare, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardCard } from './DashboardCard';
import Questionnaire from './Questionnaire';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import SalaryNegotiator from './SalaryNegotiator';
import { getQuestionsArray, getScenariosAsQuestions } from '../utils/parsing';
import { PitchEditor } from './PitchEditor';

export const InterviewTab = () => {
  const { pitchResult, questionsResult, customScenariosResult, globalStatus, cvData, updateFormData } = useDashboard();
  const { t } = useTranslation();

  const handlePurgeCache = async () => {
    if (window.confirm(t('confirm_purge', "Voulez-vous effacer vos anciennes réponses et forcer l'IA à regénérer un nouveau set de questions au prochain chargement ?"))) {
      try {
        await authenticatedFetch(`${API_BASE_URL}/api/cv/cache?content_type=interview_questions`, { method: 'DELETE' });
        await authenticatedFetch(`${API_BASE_URL}/api/cv/cache?content_type=extra_scenarios`, { method: 'DELETE' });
        alert(t('purge_success', "Cache purgé. Veuillez rafraîchir la page (F5) pour générer de nouvelles questions vierges."));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const questionsArray = getQuestionsArray(questionsResult);
  
  const standardQuestions = questionsArray.filter(q => q.category !== "Questions à poser au recruteur" && q.category !== "Questions to Ask Recruiter");
  const smartQuestions = questionsArray.filter(q => q.category === "Questions à poser au recruteur" || q.category === "Questions to Ask Recruiter");
  
  const scenariosArray = getScenariosAsQuestions(customScenariosResult);
  const mergedQuestions = [...questionsArray, ...scenariosArray];

  return (
    <>
      <div className="interview-tab-container">
        
        <div id="pitch_section">
          <PitchEditor 
            pitchResult={pitchResult} 
            cvData={cvData} 
            updateFormData={updateFormData} 
            globalStatus={globalStatus} 
          />
        </div>

        <div id="questionnaire_section">
        <DashboardCard
          title={t('deliv_questions', "Questions & Mises en situation")}
          icon={<MessageSquare size={24} />}
          loading={globalStatus === 'PROCESSING' && !questionsResult}
          loadingText={t('questions_loading', "Génération des questions...")}
          error={!!questionsResult?.error || (!questionsResult && (globalStatus === 'COMPLETED' || globalStatus === 'FAILED'))}
          errorText={questionsResult?.error ? `Erreur IA : ${typeof questionsResult.error === 'boolean' ? "Limite de contexte atteinte (données trop lourdes)." : questionsResult.error}` : t('questions_error', "Le questionnaire n'a pas pu être généré.")}
          featureId="interview_questions"
          headerAction={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handlePurgeCache} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} title="Effacer l'historique d'entraînement du profil">
                <RotateCcw size={16} /> Purger le cache
              </button>
            </div>
          }
        >
          {questionsResult && (
            <>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontStyle: "italic", background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                * Légende : ★ (1-Facile) à ★★★★★ (5-Très Difficile)
              </div>
              {mergedQuestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {standardQuestions.length > 0 && (
                        <Questionnaire questions={standardQuestions} hideHeader={true} />
                  )}
                  {scenariosArray.length > 0 && (
                    <div id="mes_anchor"><Questionnaire questions={scenariosArray} hideHeader={true} /></div>
                  )}
                      {smartQuestions.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <h3 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                            <Lightbulb size={22} color="var(--primary)" /> Vos questions de fin d'entretien
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {smartQuestions.map((q, idx) => (
                              <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '1rem', textTransform: 'uppercase' }}>
                                  {q.axis || "Stratégie"}
                                </span>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: '1.25rem 0' }}>
                                  {q.question}
                                </h4>
                                <div style={{ background: 'var(--bg-card)', borderLeft: '4px solid #f59e0b', borderRadius: '0 0.5rem 0.5rem 0', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', border: '1px solid var(--border-color)', borderLeftWidth: '4px' }}>
                                  <span style={{ fontSize: '1.25rem' }}>💡</span>
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pourquoi la poser ?</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{q.intention || q.advice || q.suggested_answer}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Les questions sont en cours d'analyse ou n'ont pas pu être formatées correctement.
                </div>
              )}
            </>
          )}
        </DashboardCard>
        </div>

        <div id="negotiation_section">
          <SalaryNegotiator />
        </div>

      </div>
    </>
  );
};