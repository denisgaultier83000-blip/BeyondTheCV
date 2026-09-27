import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MessageSquare, Target, ShieldAlert, Building, ArrowRight, User, HelpCircle, Key, List, Lightbulb, FileText } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import DOMPurify from 'dompurify';
import { DashboardCard } from './DashboardCard';
import { BulletList } from './BulletList';

interface JobDecoderProps {
  data?: any;
  loading?: boolean;
  error?: boolean;
}

// --- [NOUVEAU] Sous-composants pour la clarté ---
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
  <div className={`decoder-section ${className || ''}`}>
    <h4 className="decoder-section-title">
      {icon} {title}
    </h4>
    <div className="decoder-section-content">{children}</div>
  </div>
);

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`info-card ${className || ''}`}>
    <h5 className="info-card-title">{title}</h5>
    {children}
  </div>
);

const extractDecoderData = (data: any) => {
  if (!data) return null;
  // [MODIFICATION] Gère la nouvelle structure `decoder` en priorité, tout en gardant la compatibilité.
  let payload = data.decoder || data.result || data.job_decoder_result || data.job_decoder || data;
  
  // Si le payload est une chaîne JSON, on la parse.
  if (typeof payload === 'string') {
    try {
      const match = payload.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      payload = JSON.parse(match ? match[1] : payload);
    } catch (e) { return null; }
  }

  if (!payload) return null;

  // [FIX] Normalisation des données pour gérer les anciens formats en cache. Si `red_flags` est un tableau de strings, on le transforme en tableau d'objets.
  if (payload.red_flags && Array.isArray(payload.red_flags) && payload.red_flags.length > 0 && typeof payload.red_flags[0] === 'string') {
    payload.red_flags = payload.red_flags.map((flag: string) => {
      const parts = flag.split('=');
      return {
        signal: parts[0]?.trim() || flag,
        risk: parts[1]?.trim() || "Analyse en cours...",
        question_to_verify: "...",
        confidence: 'low'
      };
    });
  }

  if (payload.reality_check && Array.isArray(payload.reality_check) && payload.reality_check.length > 0 && typeof payload.reality_check[0] === 'string') {
     payload.reality_check = payload.reality_check.map((item: string) => {
        const parts = item.split(/:(.*)/s);
        return {
          jargon: parts[0]?.trim() || "Jargon non spécifié",
          translation: parts[1]?.trim() || "Analyse non disponible.",
          candidate_action: "Vérifier ce point en entretien."
        };
    });
  }

  return payload;
};

export const JobDecoder: React.FC<JobDecoderProps> = ({ data, loading, error }) => {
  const { t } = useTranslation();
  const decoderData = extractDecoderData(data);
  const decodedText = typeof decoderData?.decoded === 'string' ? decoderData.decoded.trim() : '';
  const hasStructuredContent = !!(
    decoderData?.job_summary ||
    decoderData?.manager_fear ||
    (Array.isArray(decoderData?.red_flags) && decoderData.red_flags.length > 0) ||
    decoderData?.candidate_positioning ||
    (Array.isArray(decoderData?.implicit_expectations) && decoderData.implicit_expectations.length > 0) ||
    (Array.isArray(decoderData?.reality_check) && decoderData.reality_check.length > 0) ||
    (Array.isArray(decoderData?.questions_to_ask) && decoderData.questions_to_ask.length > 0) ||
    (Array.isArray(decoderData?.explicit_requirements) && decoderData.explicit_requirements.length > 0) ||
    (Array.isArray(decoderData?.ats_keywords) && decoderData.ats_keywords.length > 0) ||
    decoderData?.culture_fit
  );

  const ConfidenceBadge: React.FC<{ level?: 'low' | 'medium' | 'high' }> = ({ level }) => {
    if (!level) return null;
    const styles = {
      low: { background: 'rgba(100, 116, 139, 0.1)', color: '#475569' },
      medium: { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' },
      high: { background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' },
    };
    return <span className="confidence-badge" style={styles[level]}>{level}</span>;
  };

  return (
    <DashboardCard
      title={t('job_decoder_title')}
      icon={<Search size={24} />}
      loading={loading}
      loadingText={t('job_decoder_loading')}
      error={error || (!loading && !decoderData)}
      errorText={t('job_decoder_error')}
      featureId="job_decoder"
      feedbackQuestion={t('job_decoder_feedback')}
    >
      {decoderData && (() => {

        return (
          <div className="job-decoder-container">
            <p className="job-decoder-intro">
              {t('job_decoder_intro')}
            </p>
           {!hasStructuredContent && decodedText && (
              <Section title={t('job_summary_title')} icon={<FileText size={18} />}>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{decodedText}</p>
              </Section>
           )}
           {!hasStructuredContent && !decodedText && (
              <Section title={t('partial_analysis_title')} icon={<HelpCircle size={18} />}>
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  {t('partial_analysis_desc')}
                </p>
              </Section>
           )}
           {decoderData.job_summary && <p className="job-summary">{decoderData.job_summary}</p>}

            <div className="job-decoder-grid">
              {decoderData.manager_fear && (
                <Section title={t('manager_fear_title')} icon={<User size={18} />} className="manager-fear-section">
                  <InfoCard title={t('hypothesis_title')} className="hypothesis-card">
                    <p>"{decoderData.manager_fear.hypothesis}"</p>
                  </InfoCard>
                  <InfoCard title={t('how_to_reassure_title')} className="reassurance-card">
                    <p>{decoderData.manager_fear.how_to_reassure}</p>
                  </InfoCard>
                </Section>
              )}

              {decoderData.red_flags?.length > 0 && (
                <Section title={t('red_flags_title')} icon={<ShieldAlert size={18} />} className="red-flags-section">
                  {decoderData.red_flags.map((item: any, idx: number) => (
                    <div key={idx} className="red-flag-item">
                      <div className="red-flag-header">
                        <p>"{item.signal}"</p>
                        <ConfidenceBadge level={item.confidence} />
                      </div>
                      <div className="red-flag-body">
                        <div className="red-flag-risk"><strong>{t('risk_label')}</strong> {item.risk}</div>
                        {item.question_to_verify && item.question_to_verify !== "..." && (
                          <div className="red-flag-question"><strong>{t('question_to_ask_label')}</strong> "{item.question_to_verify}"</div>
                        )}
                      </div>                    </div>
                  ))}
               </Section>
              )}

              {decoderData.candidate_positioning && (
                <Section title={t('positioning_title')} icon={<Target size={18} />} className="positioning-section">
                  <InfoCard title={t('recommended_posture_title')}>
                    <p>{decoderData.candidate_positioning.recommended_posture}</p>
                  </InfoCard>
                  <InfoCard title={t('messages_to_send_title')}>
                    <BulletList items={decoderData.candidate_positioning.messages_to_send} />
                  </InfoCard>
                  <InfoCard title={t('mistakes_to_avoid_title')}>
                    <BulletList items={decoderData.candidate_positioning.mistakes_to_avoid} type="danger" />
                  </InfoCard>
                </Section>
              )}

              {decoderData.implicit_expectations?.length > 0 && (
                <Section title={t('implicit_expectations_title')} icon={<Lightbulb size={18} />}>
                  {decoderData.implicit_expectations.map((item: any, idx: number) => (
                    <div key={idx} className="expectation-item">
                      <div className="expectation-header">
                        <p>"{item.signal}"</p>
                        <ConfidenceBadge level={item.confidence} />
                      </div>
                      <div className="expectation-body">
                        <ArrowRight size={14} />
                        <span>{item.interpretation}</span>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {decoderData.reality_check?.length > 0 && (
                <Section title={t('reality_check_title')} icon={<MessageSquare size={18} />}>
                  {decoderData.reality_check.map((item: any, idx: number) => (
                    <div key={idx} className="reality-check-item">
                      <div className="jargon">"{item.jargon}"</div>
                      <div className="translation">
                        <ArrowRight size={14} />
                        <span>{item.translation}</span>
                      </div>
                      {item.candidate_action && (
                        <div className="action"><strong>{t('action_label')}</strong> {item.candidate_action}</div>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {decoderData.questions_to_ask?.length > 0 && (
                <Section title={t('smart_questions_title')} icon={<HelpCircle size={18} />}>
                  <BulletList items={decoderData.questions_to_ask} />
                </Section>
              )}

              {decoderData.explicit_requirements?.length > 0 && (
                <Section title={t('explicit_requirements_title')} icon={<List size={18} />}>
                  <BulletList items={decoderData.explicit_requirements} />
                </Section>
              )}

              {decoderData.ats_keywords?.length > 0 && (
                <Section title={t('ats_keywords_title')} icon={<Key size={18} />}>
                  <div className="ats-keywords-list">
                    {decoderData.ats_keywords.map((kw: string) => <span key={kw} className="ats-keyword">{kw}</span>)}
                  </div>
                </Section>
              )}

              {decoderData.culture_fit && (
                <Section title={t('culture_fit_title')} icon={<Building size={18} />}>
                  <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatMarkdown(decoderData.culture_fit).__html) }} />
                </Section>
              )}
            </div>
          </div>
        );
      })()}
      <style>{`
        .job-decoder-container { background: var(--bg-card); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); margin-top: 0.5rem; }
        .job-decoder-intro { color: var(--text-muted); font-size: 0.9rem; margin-top: -0.5rem; margin-bottom: 1.5rem; }
        .job-summary { font-size: 1.05rem; font-weight: 500; background: var(--bg-secondary); padding: 1rem; border-radius: 0.75rem; border-left: 4px solid var(--primary); margin-bottom: 2rem; }
        .job-decoder-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; }
        .decoder-section { background: var(--bg-secondary); padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem; }
        .decoder-section-title { display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); margin: 0 0 0.5rem 0; font-size: 1.1rem; font-weight: 700; }
        .info-card { background: var(--bg-card); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
        .info-card-title { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin: 0 0 0.5rem 0; font-weight: 600; }
        .info-card p { margin: 0; font-size: 0.95rem; }
        .manager-fear-section .reassurance-card { background: rgba(34, 197, 94, 0.05); border-color: rgba(34, 197, 94, 0.2); }
        .manager-fear-section .reassurance-card p { color: var(--success-dark); }
        .red-flag-item { background: var(--bg-card); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
        .red-flag-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; font-weight: 600; }
        .red-flag-header p { margin: 0; }
        .red-flag-body { font-size: 0.9rem; margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .red-flag-risk { color: var(--danger-text); }
        .red-flag-question { color: var(--text-muted); }
        .confidence-badge { font-size: 0.7rem; padding: 0.1rem 0.5rem; border-radius: 1rem; text-transform: uppercase; font-weight: 700; }
        .expectation-item { background: var(--bg-card); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
        .expectation-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; font-weight: 600; font-style: italic; }
        .expectation-header p { margin: 0; }
        .expectation-body { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.95rem; }
        .reality-check-item { background: var(--bg-card); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--border-color); }
        .jargon { font-weight: 600; font-style: italic; }
        .translation { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; }
        .action { font-size: 0.85rem; color: var(--primary); font-weight: 600; }
        .ats-keywords-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .ats-keyword { background: var(--bg-card); color: var(--primary); padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem; border: 1px solid var(--primary); }
      `}</style>
    </DashboardCard>
  );
};