import { Building, Newspaper, ExternalLink, Globe2, Target, Users, TrendingUp, BookOpen, Brain, Activity, AlertTriangle } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatStrategicAnalysisReact } from '../utils/formatUtils';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const { t } = useTranslation();
  const companyName = data?.company || t('default_target_company', "Entreprise Ciblée");
  const report = data?.company_report || data?.synthesis || {};
  
  const isValid = (val: any) => {
    if (!val || typeof val !== 'string' || val.trim() === "") return false;
    // Normalisation pour ignorer les accents (ex: "Non specifié" vs "Non spécifié")
    const normalized = val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !normalized.includes("non specifie") && !normalized.includes("non renseigne") && !normalized.includes("inconnu");
  };
  
  const rawDna = report.identity_dna || report.overview;
  const dna = isValid(rawDna) ? rawDna : "Les données web sont temporairement indisponibles (Timeout de recherche).";
  const figures = report.key_figures;
  const finance = report.financial_health;
  const leadership = report.leadership;
  const culture = report.culture_environment;
  const team = report.team_structure;
  const usp = report.usp || report.key_challenges;
  const psychological_prep = report.psychological_prep;
  const cross_referenced_signals = report.cross_referenced_signals;
  const risksAndOpportunities = report.risks_and_opportunities;
  
  // [FIX EXPERT] On s'assure d'avoir un tableau, même si l'IA hallucine une string.
  const rawStrategicChallenges = report.strategic_challenges || data?.synthesis?.company_report?.strategic_challenges || [];
  const strategicChallenges = Array.isArray(rawStrategicChallenges) ? rawStrategicChallenges : (typeof rawStrategicChallenges === 'string' ? [rawStrategicChallenges] : []);
  
  // Préparation des données pour le graphique des défis
  const chartData = strategicChallenges.map((defi) => ({
    subject: defi,
    value: 1, // Valeur constante pour former un polygone régulier
  }));

  const sources = data?.sources || []; // Exploitation des sources Web fournies par le backend
  
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
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={18}/> Défis Stratégiques Actuels
                  </h4>
                  {/* [EXPERT DEBUG] The recharts error "width(-1) and height(-1)" occurs when the parent container's
                      dimensions are not yet resolved. Setting a minHeight ensures the container always has a valid
                      size for the chart to render into, even within complex flex or grid layouts.
                  */}
                  <div style={{ height: '300px', minHeight: '300px', width: '100%', marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="var(--border-color)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                        {/* L'axe des rayons est masqué car la valeur n'est pas significative ici */}
                        {/* <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} /> */}
                        <Radar name="Défis" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
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
          {(isValid(usp) || isValid(cross_referenced_signals) || risksAndOpportunities) && (
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
              {/* [NOUVEAU] Affichage des Risques & Opportunités */}
              {risksAndOpportunities && (risksAndOpportunities.risks?.length > 0 || risksAndOpportunities.opportunities?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', gridColumn: '1 / -1' }}>
                  {risksAndOpportunities.risks?.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Risques Identifiés</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#991b1d', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {risksAndOpportunities.risks.map((risk: string, idx: number) => <li key={idx}>{risk}</li>)}
                      </ul>
                    </div>
                  )}
                  {risksAndOpportunities.opportunities?.length > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> Opportunités Clés</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#065f46', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {risksAndOpportunities.opportunities.map((opp: string, idx: number) => <li key={idx}>{opp}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
           </div>
          )}

          {/* Section 4 : Actualités */}
          {newsLinks.length > 0 && (
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Newspaper size={20} color="var(--primary)" /> 4. Revue de Presse & Signaux Faibles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {newsLinks.map((news: any, i: number) => {
                  const urlStr = news.url || '#';
                  const isDummyUrl = urlStr === '#';
                  const fullUrl = isDummyUrl ? '#' : (urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
                  return (
                    <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.35rem 0.75rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {!isDummyUrl && <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(fullUrl)}&sz=16`} alt="" style={{ width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0 }} />}
                            {news.source}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {news.date && <span style={{ color: 'var(--text-muted)' }}>{news.date}</span>}
                            {news.interview_relevance !== undefined && (
                              <span style={{ background: news.interview_relevance >= 8 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: news.interview_relevance >= 8 ? '#10b981' : '#f59e0b', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                Score: {news.interview_relevance}/10
                              </span>
                            )}
                          </span>
                        </div>
                        {isDummyUrl ? (
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.4, color: 'var(--text-main)' }}>
                            {news.title}
                          </div>
                        ) : (
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.4, transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-main)'}>
                              {news.title}
                            </div>
                          </a>
                        )}
                      </div>
                      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                        {isValid(news.hidden_meaning) && (
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lecture Cachée</div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{news.hidden_meaning}</p>
                          </div>
                        )}
                        {isValid(news.strategic_analysis) && (
                          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} color="var(--primary)" /> Angle d'Entretien</div>
                            <div style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{formatStrategicAnalysisReact(news.strategic_analysis)}</div>
                          </div>
                        )}
                        {!isDummyUrl && (
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, textDecoration: 'none' }}>
                            Source Originale <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
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
