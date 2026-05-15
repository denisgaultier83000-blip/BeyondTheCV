import React from 'react';
import { Building, Newspaper, ExternalLink, Globe2, Target, Users, TrendingUp, BookOpen, Brain, Activity } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useTranslation } from 'react-i18next';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const { t } = useTranslation();
  const companyName = data?.company || t('default_target_company', "Entreprise Ciblée");
  const report = data?.company_report || data?.synthesis || {};
  
  const dna = report.identity_dna || report.overview || t('company_dna_loading', "L'analyse IA de l'entreprise est en cours...");
  const figures = report.key_figures;
  const finance = report.financial_health;
  const leadership = report.leadership;
  const culture = report.culture_environment;
  const team = report.team_structure;
  const usp = report.usp || report.key_challenges;
  const psychological_prep = report.psychological_prep;
  const cross_referenced_signals = report.cross_referenced_signals;
  const strategicChallenges = report.strategic_challenges || data?.synthesis?.company_report?.strategic_challenges || [];
  const sources = data?.sources || []; // Exploitation des sources Web fournies par le backend
  
  const isValid = (val: any) => val && typeof val === 'string' && val.trim() !== "" && !val.toLowerCase().includes("non spécifié") && !val.toLowerCase().includes("non renseigné");
  
  let newsLinks = report.news_links || [];

  return (
    <DashboardCard
      title={`${t('strategic_dossier', 'Dossier Stratégique')} : ${companyName}`}
      icon={<Building size={24} />}
      loading={loading}
      loadingText={t('company_loading_text', "Analyse approfondie et stratégique en cours...")}
      error={error}
      errorText={t('company_error_text', "Impossible de charger les données de l'entreprise.")}
      featureId="company_report"
      feedbackQuestion={t('company_feedback_q', "Ce dossier de préparation vous donne-t-il un avantage ?")}
    >
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
          
          {/* Section 1 : Identité & Business */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe2 size={20} color="var(--primary)" /> 1. Carte d'Identité & Business
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>ADN & Positionnement</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{dna}</p>
              </div>
              {isValid(figures) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Chiffres Clés</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{figures}</p>
                </div>
              )}
              {isValid(finance) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Santé Financière</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{finance}</p>
                </div>
              )}
              
              {/* NOUVEAU: Défis Stratégiques Actuels */}
              {strategicChallenges && strategicChallenges.length > 0 && (
                <div style={{ background: '#fef2f2', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #fee2e2', gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={18}/> Défis Stratégiques
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#7f1d1d', fontSize: '0.95rem' }}>
                    {strategicChallenges.map((defi: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '0.35rem', lineHeight: '1.4' }}>{defi}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 : Organisation & Culture */}
          {(isValid(leadership) || isValid(culture) || isValid(team) || isValid(psychological_prep)) && (
           <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="#8b5cf6" /> 2. Organisation & Culture
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {isValid(culture) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Culture d'Entreprise</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{culture}</p>
                </div>
              )}
              {isValid(team) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Structure des Équipes</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{team}</p>
                </div>
              )}
              {isValid(leadership) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Leadership & Direction</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{leadership}</p>
                </div>
              )}
              {isValid(psychological_prep) && (
                <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.2)', gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Brain size={18}/> Préparation Psychologique</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>{psychological_prep}</p>
                </div>
              )}
            </div>
           </div>
          )}

          {/* Section 3 : Enjeux & Stratégie */}
          {(isValid(usp) || isValid(cross_referenced_signals)) && (
           <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#10b981" /> 3. Enjeux & Proposition de Valeur
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {isValid(usp) && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18}/> Défis & Stratégie (La peur du dirigeant)</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>{usp}</p>
                </div>
              )}
              {isValid(cross_referenced_signals) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18}/> Signaux Croisés (Presse vs Réalité Terrain)</h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{cross_referenced_signals}</p>
                </div>
              )}
            </div>
           </div>
          )}

          {/* Section 4 : Actualités */}
          {newsLinks.length > 0 && (
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Newspaper size={20} color="var(--primary)" /> 4. Revue de Presse & Signaux Faibles
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%' }}>
                {newsLinks.map((news: any, i: number) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{news.source}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{news.date}</span>
                          {news.interview_relevance !== undefined && (
                            <span style={{ background: news.interview_relevance >= 8 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: news.interview_relevance >= 8 ? '#10b981' : '#f59e0b', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                              Score: {news.interview_relevance}/10
                            </span>
                          )}
                        </span>
                      </div>
                      <a href={news.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.4, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>
                          {news.title}
                        </div>
                      </a>
                    </div>
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                      {isValid(news.hidden_meaning) && (
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lecture Cachée</div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{news.hidden_meaning}</p>
                        </div>
                      )}
                      {isValid(news.strategic_analysis) && (
                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Entretien</div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{news.strategic_analysis}</p>
                        </div>
                      )}
                      <a href={news.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, textDecoration: 'none' }}>
                        Source Originale <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5 : Bibliographie / Sources */}
          {sources.length > 0 && (
            <div style={{ width: '100%', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <BookOpen size={16} /> Sources analysées
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sources.map((source: string, idx: number) => (
                  <li key={idx} style={{ wordBreak: 'break-word' }}>{source}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </DashboardCard>
  );
}
