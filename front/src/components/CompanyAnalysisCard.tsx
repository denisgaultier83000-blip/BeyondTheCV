import React from 'react';
import { Building, User, Shield, Newspaper, ExternalLink } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface CompanyAnalysisCardProps {
  data: any;
  loading?: boolean;
  error?: boolean;
}

export function CompanyAnalysisCard({ data, loading, error }: CompanyAnalysisCardProps) {
  const companyName = data?.company || "Entreprise Ciblée";
  const overview = data?.company_report?.identity_dna || data?.synthesis?.overview || "L'analyse IA de l'entreprise est en cours...";
  const culture = data?.company_report?.culture_environment || data?.synthesis?.culture || "Données culturelles en attente.";
  const challenges = data?.company_report?.usp || data?.synthesis?.challenges || "Données stratégiques en attente.";
  const newsLinks = data?.company_report?.news_links || [];
  
  let adviceList = data?.synthesis?.advice || [];
  if (adviceList.length === 0 && data?.company_report) {
      if (data.company_report.hot_news) adviceList.push(data.company_report.hot_news);
      if (data.company_report.team_structure) adviceList.push(data.company_report.team_structure);
  }
  if (adviceList.length === 0) adviceList.push("Soyez vous-même et mettez en avant vos forces.");

  return (
    <DashboardCard
      title={`Analyse Entreprise : ${companyName}`}
      icon={<Building size={24} />}
      loading={loading}
      loadingText="Analyse approfondie de l'entreprise en cours..."
      error={error}
      errorText="Impossible de charger les données de l'entreprise."
      featureId="company_report"
      feedbackQuestion="Cette analyse d'entreprise vous est-elle utile ?"
    >
      {data && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          
          {/* Grille 2 colonnes : Enjeux à Gauche, Structure à Droite */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            
            {/* 1. Identité */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.05rem' }}>
                <Building size={18} /> Identité & ADN
              </h4>
              <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>{overview}</p>
            </div>

            {/* 2. Culture */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '1.05rem' }}>
                <User size={18} /> Culture & Environnement
              </h4>
              <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>{culture}</p>
            </div>

            {/* 3. Enjeux & Défis (À GAUCHE) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#8b5cf6', fontSize: '1.05rem' }}>
                <Shield size={18} /> Enjeux & Défis
              </h4>
              <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>{challenges}</p>
            </div>

            {/* 4. Structure & Actualités (À DROITE) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '1.05rem' }}>
                <Newspaper size={18} /> Structure & Actualités
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {adviceList.map((tip: string, i: number) => (
                  <div key={i} style={{ padding: '0.75rem', background: 'var(--bg-card)', borderLeft: '3px solid #f59e0b', borderRadius: '0 0.5rem 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Articles de presse (Affiché uniquement si présent) */}
          {newsLinks.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.05rem' }}>
                <Newspaper size={18} /> Liens d'Actualités & Revue de Presse
              </h4>
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
