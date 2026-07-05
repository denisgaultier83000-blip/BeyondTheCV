import React from 'react';
import { Search, MessageSquare, Target, ShieldAlert, Building, ArrowRight, User, HelpCircle, Key, List, Lightbulb } from 'lucide-react';
import { formatMarkdown } from '../utils/markdown';
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

  // [FIX] Normalisation des données pour gérer les anciens formats en cache.
  // Si `red_flags` est un tableau de strings, on le transforme en tableau d'objets.
  if (payload.red_flags && Array.isArray(payload.red_flags) && payload.red_flags.length > 0 && typeof payload.red_flags[0] === 'string') {
    payload.red_flags = payload.red_flags.map((flag: string) => ({
      signal: flag,
      risk: "Analyse détaillée non disponible pour cette version.",
      question_to_verify: "Quelle question pourrais-je poser pour clarifier ce point ?",
      confidence: 'low'
    }));
  }

  // Idem pour reality_check
  if (payload.reality_check && Array.isArray(payload.reality_check) && payload.reality_check.length > 0 && typeof payload.reality_check[0] === 'string') {
     payload.reality_check = payload.reality_check.map((item: string) => ({
      jargon: item.split(':')[0] || "Jargon non spécifié",
      translation: item.split(':')[1] || "Analyse non disponible.",
      candidate_action: "Vérifier ce point en entretien."
    }));
  }

  return payload;
};

export const JobDecoder: React.FC<JobDecoderProps> = ({ data, loading, error }) => {
  const decoderData = extractDecoderData(data);

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
      title="Décodeur d'Annonce"
      icon={<Search size={24} />}
      loading={loading}
      loadingText="Décodage de l'annonce en cours..."
      error={error || (!loading && !decoderData)}
      errorText="Une erreur est survenue lors du décodage de l'annonce. Vérifiez la description de poste."
      featureId="job_decoder"
    >
      {decoderData && (() => {

        return (
          <div className="job-decoder-container">
            <p className="job-decoder-intro">
              Traduction du jargon RH en réalité opérationnelle pour déjouer les pièges de l'offre.
            </p>
           {decoderData.job_summary && <p className="job-summary">{decoderData.job_summary}</p>}

            <div className="job-decoder-grid">
              {decoderData.manager_fear && (
                <Section title="La Peur du Manager" icon={<User size={18} />} className="manager-fear-section">
                  <InfoCard title="Hypothèse" className="hypothesis-card">
                    <p>"{decoderData.manager_fear.hypothesis}"</p>
                  </InfoCard>
                  <InfoCard title="Comment Rassurer" className="reassurance-card">
                    <p>{decoderData.manager_fear.how_to_reassure}</p>
                  </InfoCard>
                </Section>
              )}

              {decoderData.red_flags?.length > 0 && (
                <Section title="Signaux d'Alerte (Red Flags)" icon={<ShieldAlert size={18} />} className="red-flags-section">
                  {decoderData.red_flags.map((item: any, idx: number) => (
                    <div key={idx} className="red-flag-item">
                      <div className="red-flag-header">
                        <p>"{item.signal}"</p>
                        <ConfidenceBadge level={item.confidence} />
                      </div>
                      <div className="red-flag-body">
                        <div className="red-flag-risk"><strong>Risque :</strong> {item.risk}</div>
                        <div className="red-flag-question"><strong>Question à poser :</strong> "{item.question_to_verify}"</div>
                      </div>                    </div>
                  ))}
               </Section>
              )}

              {decoderData.candidate_positioning && (
                <Section title="Votre Positionnement Stratégique" icon={<Target size={18} />} className="positioning-section">
                  <InfoCard title="Posture Recommandée">
                    <p>{decoderData.candidate_positioning.recommended_posture}</p>
                  </InfoCard>
                  <InfoCard title="Messages Clés à faire passer">
                    <BulletList items={decoderData.candidate_positioning.messages_to_send} />
                  </InfoCard>
                  <InfoCard title="Erreurs à éviter">
                    <BulletList items={decoderData.candidate_positioning.mistakes_to_avoid} type="danger" />
                  </InfoCard>
                </Section>
              )}

              {decoderData.implicit_expectations?.length > 0 && (
                <Section title="Attentes Implicites" icon={<Lightbulb size={18} />}>
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
                <Section title="Traduction du Jargon RH" icon={<MessageSquare size={18} />}>
                  {decoderData.reality_check.map((item: any, idx: number) => (
                    <div key={idx} className="reality-check-item">
                      <div className="jargon">"{item.jargon}"</div>
                      <div className="translation">
                        <ArrowRight size={14} />
                        <span>{item.translation}</span>
                      </div>
                      <div className="action"><strong>Action :</strong> {item.candidate_action}</div>
                    </div>
                  ))}
                </Section>
              )}

              {decoderData.questions_to_ask?.length > 0 && (
                <Section title="Questions Intelligentes à Poser" icon={<HelpCircle size={18} />}>
                  <BulletList items={decoderData.questions_to_ask} />
                </Section>
              )}

              {decoderData.explicit_requirements?.length > 0 && (
                <Section title="Exigences Explicites du Poste" icon={<List size={18} />}>
                  <BulletList items={decoderData.explicit_requirements} />
                </Section>
              )}

              {decoderData.ats_keywords?.length > 0 && (
                <Section title="Mots-clés pour l'ATS" icon={<Key size={18} />}>
                  <div className="ats-keywords-list">
                    {decoderData.ats_keywords.map((kw: string) => <span key={kw} className="ats-keyword">{kw}</span>)}
                  </div>
                </Section>
              )}

              {decoderData.culture_fit && (
                <Section title="Culture d'Entreprise Déduite" icon={<Building size={18} />}>
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