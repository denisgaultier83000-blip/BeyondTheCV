import React from 'react';
import { Building, Newspaper, ExternalLink, Globe2, Target, Users, TrendingUp, BookOpen } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const companyName = data?.company || "Entreprise Ciblée";
  const report = data?.company_report || data?.synthesis || {};
  
  const dna = report.identity_dna || report.overview || "L'analyse IA de l'entreprise est en cours...";
  const figures = report.key_figures;
  const finance = report.financial_health;
  const leadership = report.leadership;
  const culture = report.culture_environment;
  const team = report.team_structure;
  const usp = report.usp || report.key_challenges;
  const sources = data?.sources || []; // Exploitation des sources Web fournies par le backend
  
  const isValid = (val: any) => val && typeof val === 'string' && val.trim() !== "" && !val.toLowerCase().includes("non spécifié");
  
  // [FIX] Fallback Presse en dur : Si l'IA échoue, on génère un lien automatique de recherche
  let newsLinks = report.news_links || [];
  if (!Array.isArray(newsLinks) || newsLinks.length === 0) {
      newsLinks = [{
          title: `Rechercher les actualités récentes de ${companyName}`,
          url: `https://news.google.com/search?q=${encodeURIComponent(companyName)}`,
          source: "Google News",
          date: "Recherche dynamique"
      }];
  }

  return (
    <DashboardCard
      title={`Dossier d'Intelligence : ${companyName}`}
      icon={<Building size={24} />}
      loading={loading}
      loadingText="Analyse approfondie et stratégique en cours..."
      error={error}
      errorText="Impossible de charger les données de l'entreprise."
      featureId="company_report"
      feedbackQuestion="Ce dossier de préparation vous donne-t-il un avantage ?"
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
            </div>
          </div>

          {/* Section 2 : Organisation & Culture */}
          {(isValid(leadership) || isValid(culture) || isValid(team)) && (
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
            </div>
           </div>
          )}

          {/* Section 3 : Enjeux & Stratégie */}
          {isValid(usp) && (
           <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#10b981" /> 3. Enjeux & Proposition de Valeur
            </h3>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18}/> Défis & Stratégie</h4>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>{usp}</p>
            </div>
           </div>
          )}

          {/* Section 4 : Actualités */}
          {newsLinks.length > 0 && (
            <div style={{ width: '100%' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Newspaper size={20} color="var(--primary)" /> 4. Revue de Presse
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', width: '100%' }}>
                {newsLinks.map((news: any, i: number) => (
                  <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '0.5rem', textDecoration: 'none', border: '1px solid var(--border-color)', transition: 'all 0.2s', color: 'var(--text-main)', height: '100%' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{news.source}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{news.date}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: '1rem' }}>{news.title}</div>
                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>Lire l'article <ExternalLink size={14} /></div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Section 5 : Bibliographie / Sources */}
          {sources.length > 0 && (
            <div style={{ width: '100%', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                <BookOpen size={16} /> Sources utilisées pour cette analyse
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
