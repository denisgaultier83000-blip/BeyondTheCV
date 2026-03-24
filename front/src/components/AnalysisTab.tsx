import React, { useState } from 'react';
import { Building, Globe, RefreshCw, Shield, User, Newspaper, LineChart, Wallet, Star } from 'lucide-react';
import { FeedbackWidget } from './FeedbackWidget';

export const AnalysisTab = ({ researchResult, salaryResult }: { researchResult: any, salaryResult: any }) => {
  const [subTab, setSubTab] = useState<'company' | 'market'>('company');

  return (
    <div className="analysis-tab-container">
      <div className="cv-header">
        <div className="cv-type-selector">
          <button className={`cv-type-btn ${subTab === 'company' ? 'active' : ''}`} onClick={() => setSubTab('company')}>
            <Building size={16} /> Rapport Entreprise
          </button>
          <button className={`cv-type-btn ${subTab === 'market' ? 'active' : ''}`} onClick={() => setSubTab('market')}>
            <Globe size={16} /> Rapport Marché
          </button>
        </div>
        <button className="btn-action btn-secondary-action" style={{ maxWidth: '250px', padding: '0.5rem 1rem' }}>
          <RefreshCw size={16} /> Mettre à jour les données
        </button>
      </div>
      <div>
        {subTab === 'company' ? <CompanyReportSection data={researchResult} /> : <MarketReportSection data={researchResult} salaryData={salaryResult} />}
      </div>
    </div>
  );
};

const CompanyReportSection = ({ data }: { data: any }) => {
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
    <div className="analysis-grid">
      <div className="analysis-card"><h3 className="analysis-card-title"><Building size={20} color="#3b82f6" /> Identité & ADN : {companyName}</h3><div className="analysis-card-content"><p>{overview}</p></div></div>
      <div className="analysis-card"><h3 className="analysis-card-title"><User size={20} color="#10b981" /> Culture & Environnement</h3><div className="analysis-card-content"><p>{culture}</p></div></div>
      <div className="analysis-card"><h3 className="analysis-card-title"><Shield size={20} color="#8b5cf6" /> Enjeux & Défis</h3><div className="analysis-card-content"><p>{challenges}</p></div></div>
      <div className="analysis-card"><h3 className="analysis-card-title"><Newspaper size={20} color="#f59e0b" /> Structure & Actualités</h3>
        <div className="analysis-card-content">
          {adviceList.map((tip: string, i: number) => <div key={i} className="news-item"><div className="news-item-title">Point #{i + 1}</div><div style={{ fontSize: '0.85rem' }}>{tip}</div></div>)}
        </div>
      </div>

      <div className="analysis-card full-width">
        <h3 className="analysis-card-title"><Newspaper size={20} color="#3b82f6" /> Liens d'Actualités & Revue de Presse</h3>
        <div className="analysis-card-content">
          {newsLinks.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              {newsLinks.map((news: any, i: number) => (
                <a key={i} href={news.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', textDecoration: 'none', border: '1px solid var(--border-color)', transition: 'all 0.2s', color: 'var(--text-main)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{news.source}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{news.date}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.4 }}>{news.title}</div>
                  <div style={{ marginTop: 'auto', paddingTop: '1rem', fontSize: '0.85rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Lire l'article &rarr;</div>
                </a>
              ))}
            </div>
          ) : <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun lien d'actualité gratuit récent.</div>}
        </div>
      </div>

      <div className="analysis-card full-width" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none', marginTop: '-0.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <FeedbackWidget feature="company_report" question="L'analyse de cette entreprise est-elle exacte et utile ?" />
        </div>
      </div>
    </div>
  );
};

const MarketReportSection = ({ data, salaryData }: { data: any, salaryData: any }) => {
  const low = salaryData?.salary_range?.low ? `${salaryData.salary_range.low}k€` : "55k€";
  const mid = salaryData?.salary_range?.mid ? `${salaryData.salary_range.mid}k€` : "62k€";
  const high = salaryData?.salary_range?.high ? `${salaryData.salary_range.high}k€` : "70k€+";
  const comment = salaryData?.commentary || "Le marqueur noir indique la médiane du marché.";
  const trends = data?.market_report?.trends || "Les indicateurs de marché sont en cours de collecte...";
  const tensionScore = data?.market_report?.tension_score ? data.market_report.tension_score / 10 : 8.5;
  const tensionIndex = data?.market_report?.tension_index || "Forte demande";

  return (
    <div className="analysis-grid">
      <div className="analysis-card full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '2rem' }}>
        <div style={{ flex: 1 }}><h3 className="analysis-card-title" style={{ marginBottom: '1rem' }}><LineChart size={20} color="#3b82f6" /> Dynamique de Recrutement</h3><p className="analysis-card-content">{data?.market_report?.recruitment_dynamics || trends}</p></div>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', minWidth: '200px' }}>
          <div style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Indice de Tension</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6', margin: '0.5rem 0' }}>{tensionScore}<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>/10</span></div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{tensionIndex}</div>
        </div>
      </div>

      <div className="analysis-card">
        <h3 className="analysis-card-title"><Wallet size={20} color="#10b981" /> Baromètre des Salaires</h3>
        <div className="analysis-card-content">
          <div style={{ position: 'relative', height: '8px', background: 'var(--border-color)', borderRadius: '4px', margin: '2rem 1rem 1rem' }}>
            <div style={{ position: 'absolute', left: '20%', right: '15%', height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
            <div style={{ position: 'absolute', left: '20%', top: '-25px', transform: 'translateX(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{low}</div>
            <div style={{ position: 'absolute', left: '50%', top: '15px', transform: 'translateX(-50%)', fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>{mid}</div>
            <div style={{ position: 'absolute', left: '85%', top: '-25px', transform: 'translateX(-50%)', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{high}</div>
          </div>
          <p style={{ marginTop: '2.5rem', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>{comment}</p>
        </div>
      </div>
    </div>
  );
};