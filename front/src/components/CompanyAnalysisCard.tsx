import React from 'react';
import { Building, Newspaper, ExternalLink, Globe2, Target, MessageCircle, HelpCircle } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const companyName = data?.company || "Entreprise Ciblée";
  const report = data?.company_report || data?.synthesis || {};
  
  const overview = report.overview || report.identity_dna || "L'analyse IA de l'entreprise est en cours...";
  const challenges = report.key_challenges || [report.usp || report.challenges || "Données stratégiques en attente."];
  
  const segments = report.business_segments || [];
  const dynamics = report.current_dynamics || [];
  const clients = report.client_types || [];
  const geographic = report.geographic_presence || [];
  
  const expectations = report.recruiter_expectations || [];
  const positioning = report.positioning_strategy || "";
  const catchphrases = report.catchphrases || [];
  const smartQuestions = report.smart_questions || [];
  
  const newsLinks = report.news_links || [];

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1 : Identité & Contexte Business */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe2 size={20} color="var(--primary)" /> 1. Carte d'Identité Business
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Lecture Rapide</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{overview}</p>
              </div>
              {segments.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Segments d'Activité</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {segments.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {(clients.length > 0 || geographic.length > 0) && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Clients & Géographie</h4>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {clients.length > 0 && <><strong style={{ color: 'var(--text-main)' }}>Clients:</strong> {clients.join(', ')}<br/></>}
                    {geographic.length > 0 && <><strong style={{ color: 'var(--text-main)' }}>Présence:</strong> {geographic.join(', ')}</>}
                  </div>
                </div>
              )}
              {dynamics.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Dynamique Actuelle</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {dynamics.map((d: string, i: number) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 : Stratégie d'Entretien */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="#10b981" /> 2. Stratégie d'Entretien
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Ce que le recruteur va chercher</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {expectations.length > 0 ? expectations.map((e: string, i: number) => <li key={i}>{e}</li>) : <li>Non spécifié</li>}
                </ul>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Comment se positionner</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{positioning || "Non spécifié"}</p>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)', gridColumn: '1 / -1' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>Enjeux Clés & Défis</h4>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {challenges.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3 : Boîte à outils (Phrases & Questions) */}
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={20} color="#8b5cf6" /> 3. Boîte à Outils
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)' }}>Exemples de phrases efficaces</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {catchphrases.length > 0 ? catchphrases.map((phrase: string, i: number) => (
                    <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-card)', borderLeft: '3px solid #8b5cf6', borderRadius: '0 0.5rem 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                      "{phrase}"
                    </div>
                  )) : <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Non spécifié</p>}
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={16} /> Questions intelligentes à poser
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {smartQuestions.length > 0 ? smartQuestions.map((q: string, i: number) => (
                    <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-card)', borderLeft: '3px solid #f43f5e', borderRadius: '0 0.5rem 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {q}
                    </div>
                  )) : <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Non spécifié</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 : Actualités */}
          {newsLinks.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Newspaper size={20} color="var(--primary)" /> 4. Revue de Presse
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {newsLinks.map((news: any, i: number) => (
                  <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-card)', borderRadius: '0.5rem', textDecoration: 'none', border: '1px solid var(--border-color)', transition: 'all 0.2s', color: 'var(--text-main)' }} onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{news.source}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{news.date}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: '1rem' }}>{news.title}</div>
                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Lire l'article <ExternalLink size={14} /></div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </DashboardCard>
  );
}
