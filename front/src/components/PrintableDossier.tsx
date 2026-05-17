import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { Printer, ArrowLeft } from 'lucide-react';

export const PrintableDossier = () => {
  const { applicationData } = useOutletContext<any>();
  const [searchParams] = useSearchParams();
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);

  const { cvData, researchResult, gapResult, flawCoachingResult } = applicationData?.data || {};
  
  // Fallbacks si la donnée "pilotData" n'est pas persistée telle quelle
  const matchScore = gapResult?.gap_analysis?.match_score || gapResult?.match_score || gapResult?.score_adequation || 0;
  const recommendedStrategy = gapResult?.gap_analysis?.recommended_strategy || "Consultez l'analyse détaillée des écarts pour construire votre stratégie.";

  // On fetch l'historique silencieusement en arrière-plan
  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const [resInt, resTrain] = await Promise.all([
          authenticatedFetch(`${API_BASE_URL}/api/cv/interview/history`),
          authenticatedFetch(`${API_BASE_URL}/api/cv/training/history`)
        ]);
        if (resInt.ok) {
          const data = await resInt.json();
          setInterviewHistory(data.history || []);
        }
        if (resTrain.ok) {
          const data = await resTrain.json();
          setTrainingHistory(data.history || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchHistories();
  }, []);

  // Auto-print si le paramètre ?print=true est présent dans l'URL
  useEffect(() => {
    if (searchParams.get('print') === 'true') {
      const timer = setTimeout(() => window.print(), 800); // Léger délai pour le rendu des polices/images
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Normalisation robuste des données pour éviter les crashs si l'IA a halluciné
  const companyReport = researchResult?.company_report || {};
  const marketReport = researchResult?.market_report || {};
  const gapData = gapResult?.gap_analysis || gapResult || {};
  const flaws = Array.isArray(flawCoachingResult) ? flawCoachingResult : (flawCoachingResult?.flaws || []);

  const renderItem = (item: any) => typeof item === 'string' ? item : item?.skill || item?.name || item?.description || JSON.stringify(item);

  return (
    <div className="bg-white text-black min-h-screen p-8 max-w-5xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media print {
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          h1, h2, h3, h4 { color: #0f172a; margin-top: 0; }
          .print-section { margin-bottom: 2rem; }
          .print-box { border: 1px solid #cbd5e1; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; background: #f8fafc; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Actions (Cachées à l'impression grâce à .no-print) */}
      <div className="no-print flex justify-between items-center mb-8 border-b pb-4">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition-colors">
          <ArrowLeft size={18} /> Retour au dossier
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">
          <Printer size={18} /> Lancer l'impression PDF
        </button>
      </div>

      {/* 1. Page de Garde & Stratégie */}
      <div className="print-section text-center" style={{ textAlign: 'center', marginBottom: '4rem', paddingTop: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#0f172a' }}>Dossier de Préparation</h1>
        <h2 style={{ fontSize: '1.8rem', color: '#475569' }}>Candidat : {cvData?.first_name} {cvData?.last_name}</h2>
        <h3 style={{ fontSize: '1.5rem', color: '#64748b' }}>Cible : {cvData?.target_job} {cvData?.target_company ? `chez ${cvData.target_company}` : ''}</h3>
        <p style={{ marginTop: '4rem', fontSize: '1.4rem' }}>Score d'Adéquation global : <strong>{matchScore}/100</strong></p>
      </div>

      <div className="print-section avoid-break">
        <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🎯 Stratégie de Candidature</h2>
        <div className="print-box">
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1.1rem' }}>{recommendedStrategy}</p>
        </div>
      </div>

      {/* 2. Dossier Entreprise & Marché */}
      <div className="print-section avoid-break page-break">
        <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🏢 Analyse Entreprise & Marché</h2>
        <div className="print-box">
          <h3 style={{ color: '#2563eb' }}>Entreprise : {researchResult?.company || cvData?.target_company || "Cible"}</h3>
          {companyReport.linkedin_url && (
            <p><strong>LinkedIn :</strong> <a href={companyReport.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>Accéder à la page de l'entreprise</a></p>
          )}
          <p><strong>ADN & Identité :</strong> {companyReport.identity_dna || "N/A"}</p>
          <p><strong>Santé Financière :</strong> {companyReport.financial_health || "N/A"}</p>
          <p><strong>Défis & USP :</strong> {companyReport.usp || "N/A"}</p>
          <p><strong>Culture :</strong> {companyReport.culture_environment || "N/A"}</p>
        </div>
        <div className="print-box">
          <h3 style={{ color: '#059669' }}>Marché</h3>
          <p><strong>Dynamique de recrutement :</strong> {marketReport.recruitment_dynamics || "N/A"}</p>
          <p><strong>Tendances :</strong> {marketReport.trends || "N/A"}</p>
          <p><strong>Salaires :</strong> {marketReport.salary_barometer || "N/A"}</p>
        </div>

        {companyReport.news_links && companyReport.news_links.length > 0 && (
          <div className="print-box avoid-break">
            <h3 style={{ color: '#e11d48', marginTop: '1rem' }}>📰 Actualités & Leviers Stratégiques</h3>
            {companyReport.news_links.map((link: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>• {link.title}</p>
                {link.strategic_analysis && <p style={{ margin: 0, fontStyle: 'italic', color: '#475569', paddingLeft: '1rem' }}>Conseil Stratégique : {link.strategic_analysis}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Réponses aux Défauts */}
      <div className="print-section page-break">
        <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🛡️ Parades aux Défauts</h2>
        {flaws.map((flaw: any, idx: number) => (
          <div key={idx} className="print-box avoid-break">
            <h3 style={{ color: '#dc2626' }}>{flaw.flaw || flaw.defaut}</h3>
            <p><strong>Risque perçu :</strong> {flaw.impact_justification}</p>
            <p><strong>Réponse courte :</strong> "{flaw.short_answer || flaw.reponse_courte}"</p>
            <p><strong>Storytelling :</strong> "{flaw.long_answer || flaw.reponse_longue}"</p>
            <p><strong>Pièges à éviter :</strong> {flaw.to_avoid || flaw.a_eviter}</p>
          </div>
        ))}
      </div>

      {/* 4. Historique des questions */}
      <div className="print-section page-break">
        <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>💬 Historique d'Entraînement</h2>
        {trainingHistory.length === 0 && interviewHistory.length === 0 ? <p>Aucun entraînement enregistré pour le moment.</p> : [...interviewHistory, ...trainingHistory].map((item, idx) => (
          <div key={idx} className="print-box avoid-break" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>Q : {item.question || item.question_text}</h4>
            <p style={{ margin: '0 0 10px 0' }}><strong>Votre réponse :</strong> {item.user_answer || item.userAnswer}</p>
            <p style={{ margin: '0 0 10px 0', color: '#166534' }}><strong>Correction IA (Score : {item.score || item.feedback?.score}/100) :</strong> {item.feedback?.improved_answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};