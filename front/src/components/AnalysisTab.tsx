import React from 'react';
import { Building, Globe, RefreshCw } from 'lucide-react';
import { CompanyAnalysisCard } from './CompanyAnalysisCard';
import { MarketAnalysisCard } from './MarketAnalysisCard';

export const AnalysisTab = ({ researchResult, salaryResult, onRefresh, isRefreshing }: { researchResult: any, salaryResult: any, onRefresh?: () => void, isRefreshing?: boolean }) => {

  return (
    <div className="analysis-tab-container">
      <div className="cv-header">
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
          <Building size={20} color="var(--primary)" /> Analyse Entreprise & Marché
        </h3>
        <button 
          className="btn-action btn-secondary-action" 
          style={{ maxWidth: '250px', padding: '0.5rem 1rem', marginLeft: 'auto' }}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} /> 
          {isRefreshing ? "Actualisation..." : "Mettre à jour les données"}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div id="company_section">
          <CompanyAnalysisCard data={researchResult} loading={!researchResult || isRefreshing} error={researchResult?.error} /> 
        </div>
        <div id="market_section">
          <MarketAnalysisCard data={researchResult} salaryData={salaryResult} loading={(!researchResult || !salaryResult) || isRefreshing} error={researchResult?.error || salaryResult?.error} />
        </div>
      </div>
    </div>
  );
};