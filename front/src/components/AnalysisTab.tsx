import React, { useState } from 'react';
import { Building, Globe, RefreshCw } from 'lucide-react';
import { CompanyAnalysisCard } from './CompanyAnalysisCard';
import { MarketAnalysisCard } from './MarketAnalysisCard';

export const AnalysisTab = ({ researchResult, salaryResult, onRefresh, isRefreshing }: { researchResult: any, salaryResult: any, onRefresh?: () => void, isRefreshing?: boolean }) => {
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
        <button 
          className="btn-action btn-secondary-action" 
          style={{ maxWidth: '250px', padding: '0.5rem 1rem' }}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} /> 
          {isRefreshing ? "Actualisation..." : "Mettre à jour les données"}
        </button>
      </div>
      <div>
        {subTab === 'company' 
          ? <CompanyAnalysisCard data={researchResult} loading={!researchResult || isRefreshing} error={researchResult?.error} /> 
          : <MarketAnalysisCard data={researchResult} salaryData={salaryResult} loading={(!researchResult || !salaryResult) || isRefreshing} error={researchResult?.error || salaryResult?.error} />}
      </div>
    </div>
  );
};