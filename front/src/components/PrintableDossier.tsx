import React, { useEffect, useState } from 'react';
import { useDashboard } from './DashboardContext';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

export const PrintableDossier = ({ selection = {} }: { selection?: any }) => {
  const { 
    cvData, pilotData, researchResult, gapResult, flawCoachingResult, 
    pitchResult, questionsResult, customScenariosResult, actionPlanResult,
    careerRadarResult, careerGpsResult, jobDecoderResult, hiddenMarketResult
  } = useDashboard();
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);

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

  // Normalisation robuste des données pour éviter les crashs si l'IA a halluciné
  const companyReport = researchResult?.company_report || {};
  const marketReport = researchResult?.market_report || {};
  const gapData = gapResult?.gap_analysis || gapResult || {};
  const flawsRaw = flawCoachingResult?.coaching || flawCoachingResult?.flaws || flawCoachingResult;
  const flaws = Array.isArray(flawsRaw) ? flawsRaw : (Array.isArray(flawCoachingResult) ? flawCoachingResult : []);

  // --- EXTRACTIONS IDENTIQUES À INTERVIEWTAB ---
  const getQuestionsArray = (data: any): any[] => {
    if (!data) return [];
    let actualData = data.result !== undefined ? data.result : data;
    let depth = 0;
    while (typeof actualData === 'string' && depth < 7) {
        try {
            const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            actualData = JSON.parse(match ? match[1] : actualData);
            depth++;
        } catch(e) { break; }
    }
    if (Array.isArray(actualData)) return actualData;
    const payload = actualData.interview_questions_result || actualData.interview_questions || actualData;
    if (Array.isArray(payload)) return payload;
    if (payload?.questions && Array.isArray(payload.questions)) return payload.questions;
    const extractDeep = (obj: any): any[] => {
        if (!obj || typeof obj !== 'object') return [];
        let found: any[] = [];
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0].question) {
                found = found.concat(val);
            } else if (typeof val === 'object' && val !== null) {
                found = found.concat(extractDeep(val));
            }
        }
        return found;
    };
    const deep = extractDeep(payload);
    if (deep.length > 0) return deep;
    return (Object.values(payload).find(v => Array.isArray(v)) as any[]) || [];
  };

  const getScenariosAsQuestions = (data: any): any[] => {
    if (!data) return [];
    let actualData = data.result !== undefined ? data.result : data;
    let depth = 0;
    while (typeof actualData === 'string' && depth < 7) {
        try {
            const match = actualData.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            actualData = JSON.parse(match ? match[1] : actualData);
            depth++;
        } catch(e) { break; }
    }
    const scenarios: any[] = [];
    const extractDeep = (obj: any, cat: string = "Mise en situation") => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) obj.forEach(item => extractDeep(item, cat));
        else {
            if (obj.scenario || obj.question || obj.situation || obj.text || obj.contexte || obj.description || obj.defi) {
                scenarios.push({
                    category: "SCÉNARIO : " + cat.toUpperCase(),
                    question: obj.scenario || obj.question || obj.situation || obj.text || obj.contexte || obj.description || obj.defi,
                    suggested_answer: obj.expected_behavior || obj.suggested_answer || obj.answer || obj.solution || "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer votre réponse.",
                    advice: obj.advice || obj.context || obj.rationale || obj.strategy || obj.feedback || "Cette mise en situation évalue vos réflexes professionnels.",
                    user_answer: obj.user_answer,
                    evaluation: obj.feedback || obj.evaluation
                });
            } else Object.values(obj).forEach(v => extractDeep(v, obj.category || obj.theme || obj.title || cat));
        }
    };
    extractDeep(actualData);
    return scenarios;
  };

  const questionsArray = getQuestionsArray(questionsResult);
  const scenariosArray = getScenariosAsQuestions(customScenariosResult);
  const pitch = pitchResult?.pitch || pitchResult;
  let todoList = actionPlanResult?.action_plan || actionPlanResult?.tasks || actionPlanResult?.phases || actionPlanResult;
  
  // Nettoyage et formatage du plan d'action s'il a été retourné sous forme d'objet dictionnaire
  if (todoList && typeof todoList === 'object' && !Array.isArray(todoList)) {
    const arr: any[] = [];
    Object.entries(todoList).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        arr.push({ phase: k, actions: v });
      } else if (typeof v === 'string') {
        arr.push({ phase: k, actions: [v] });
      } else if (typeof v === 'object' && v !== null) {
        arr.push({ phase: k, actions: [JSON.stringify(v)] });
      }
    });
    if (arr.length > 0) todoList = arr;
  }

  const renderImprovedAnswer = (answer: any) => {
    if (!answer) return "N/A";
    try {
      const parsed = typeof answer === 'string' ? JSON.parse(answer) : answer;
      if (Array.isArray(parsed)) {
        return <ul style={{ margin: 0, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>{parsed.map((ex: any, i: number) => <li key={i}><strong>{ex.title}</strong>: {ex.description}</li>)}</ul>;
      }
    } catch (e) {}
    return answer;
  };

  // Fonction robuste pour afficher n'importe quel objet JSON proprement 
  // (Utile pour le GPS, Radar, etc., si le backend change la structure)
  const renderGeneric = (data: any): React.ReactNode => {
    if (data === null || data === undefined) return "N/A";
    if (typeof data !== 'object') return String(data);
    if (Array.isArray(data)) {
      return (
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          {data.map((item, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{renderGeneric(item)}</li>)}
        </ul>
      );
    }
    return (
      <div style={{ marginLeft: '0.5rem', marginTop: '0.25rem' }}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} style={{ marginBottom: '0.25rem' }}>
            <strong style={{ textTransform: 'capitalize', color: '#334155' }}>{k.replace(/_/g, ' ')} :</strong> {renderGeneric(v)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="printable-dossier" style={{ color: 'black', background: 'white', padding: '2rem', fontFamily: 'Arial, sans-serif', boxSizing: 'border-box', maxWidth: '100%' }}>
      <style>{`
        .printable-dossier { display: none; }
        @media print {
          @page { margin: 2cm 1.5cm 2cm 1.5cm; }
          body * { visibility: hidden !important; }
          .printable-dossier { display: block !important; }
          .printable-dossier, .printable-dossier * { visibility: visible !important; }
          .printable-dossier { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          h1, h2, h3, h4 { color: #0f172a; margin-top: 0; }
          .print-section { margin-bottom: 2rem; max-width: 100%; box-sizing: border-box; }
          .print-box { border: 1px solid #cbd5e1; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; background: #f8fafc; box-sizing: border-box; width: 100%; word-wrap: break-word; overflow-wrap: break-word; }
          p, div, span, li, h3, h4 { max-width: 100%; }
          
          /* Logo sur la première page uniquement */
          .print-logo-container {
            position: absolute;
            top: 0;
            right: 0;
            height: 35px;
            z-index: 1000;
            display: block !important;
          }
          
          /* Pied de page fixe avec bordure */
          .print-footer-container {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex !important;
            justify-content: space-between;
            font-size: 0.85rem;
            color: #64748b;
            border-top: 1px solid #cbd5e1;
            padding-top: 0.5rem;
            z-index: 1000;
          }

          /* Filigrane Confidentiel (Bonus) */
          .print-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 8rem;
            font-weight: 800;
            color: #cbd5e1;
            opacity: 0.15;
            z-index: -1;
            display: block !important;
            pointer-events: none;
          }
        }
      `}</style>

      {/* Logo répété en haut à droite de chaque page */}
      <div className="print-logo-container" style={{ display: 'none' }}>
        <img src="/logo_reduit_BTCV.png" alt="BeyondTheCV" style={{ height: '100%', width: 'auto', opacity: 0.8 }} />
      </div>

      {/* Filigrane Confidentiel */}
      <div className="print-watermark" style={{ display: 'none' }}>
        CONFIDENTIEL
      </div>

      {/* Pied de page avec le nom du Candidat */}
      <div className="print-footer-container" style={{ display: 'none' }}>
        <span>Dossier Candidat : {cvData?.first_name} {cvData?.last_name}</span>
        <span>Généré par BeyondTheCV</span>
      </div>

      {/* 1. Page de Garde & Stratégie */}
      <div className="print-section text-center" style={{ textAlign: 'center', marginBottom: '4rem', paddingTop: '4rem' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: '#0f172a' }}>Dossier de Préparation</h1>
        <h2 style={{ fontSize: '1.8rem', color: '#475569' }}>Candidat : {cvData?.first_name} {cvData?.last_name}</h2>
        <h3 style={{ fontSize: '1.5rem', color: '#64748b' }}>Cible : {cvData?.target_job} {cvData?.target_company ? `chez ${cvData.target_company}` : ''}</h3>
        <p style={{ marginTop: '4rem', fontSize: '1.4rem' }}>Score d'Adéquation global : <strong>{pilotData?.matchScore || 0}/100</strong></p>
      </div>

      {/* Pitch */}
      {selection.pitch !== false && pitch && (
        <div className="print-section avoid-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🎤 Pitch de Présentation (3 min)</h2>
          <div className="print-box">
            <h4 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Accroche</h4>
            <p style={{ margin: '0 0 1rem 0' }}>{pitch.accroche}</p>
            <h4 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Preuve & Impact</h4>
            <p style={{ margin: '0 0 1rem 0' }}>{pitch.preuve}</p>
            <h4 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Valeur Ajoutée</h4>
            <p style={{ margin: '0 0 1rem 0' }}>{pitch.valeur}</p>
            <h4 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Projection</h4>
            <p style={{ margin: 0 }}>{pitch.projection}</p>
          </div>
        </div>
      )}

      {/* 1. Stratégie */}
      {selection.gap !== false && (
        <div className="print-section avoid-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🎯 Stratégie de Candidature</h2>
          <div className="print-box">
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1.1rem' }}>{pilotData?.recommendedStrategy || "Stratégie non générée."}</p>
          </div>
        </div>
      )}

      {/* GPS de Carrière */}
      {selection.gps !== false && careerGpsResult && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🧭 GPS de Carrière</h2>
          <div className="print-box avoid-break">
            {(() => {
              const gpsData = careerGpsResult.career_gps_result || careerGpsResult;
              const route = gpsData.route || gpsData;
              if (!route || !route.steps) return renderGeneric(gpsData);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
                    <span><strong>Temps estimé :</strong> {route.estimated_time || "N/A"}</span>
                    <span><strong>Probabilité :</strong> {route.probability || "N/A"}%</span>
                  </div>
                  <h4 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>Étapes Clés</h4>
                  <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.2rem' }}>
                    {(route.steps || []).map((step: any, i: number) => (
                      <li key={i} style={{ marginBottom: '0.5rem' }}>
                        {step.icon && <span style={{ marginRight: '0.5rem' }}>{step.icon}</span>}
                        <strong>{(step.name || "").replace(/\*\*/g, '')}</strong>
                        {step.impact && <span style={{ color: '#64748b', fontSize: '0.9rem' }}> (Impact : {step.impact})</span>}
                      </li>
                    ))}
                  </ul>
                  {route.obstacles && route.obstacles.length > 0 && (
                    <>
                      <h4 style={{ color: '#dc2626', margin: '0 0 0.5rem 0' }}>Obstacles & Risques</h4>
                      <ul style={{ margin: '0', paddingLeft: '1.2rem', color: '#dc2626' }}>
                        {route.obstacles.map((obs: any, i: number) => (
                          <li key={i} style={{ marginBottom: '0.5rem' }}>
                            {obs.icon && <span style={{ marginRight: '0.5rem' }}>{obs.icon}</span>}
                            {(obs.text || (typeof obs === 'string' ? obs : '')).replace(/\*\*/g, '')}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Radar de Carrière */}
      {selection.radar !== false && careerRadarResult && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>📡 Radar de Carrière (Trajectoires)</h2>
          {careerRadarResult.trajectories ? careerRadarResult.trajectories.map((traj: any, idx: number) => (
            <div key={idx} className="print-box avoid-break">
              <h3 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>{traj.title || traj.role || traj.name} - {traj.match_percent}%</h3>
              <p style={{ margin: '0 0 0.25rem 0' }}><strong>Temps estimé :</strong> {traj.time_to_reach}</p>
              <p style={{ margin: '0 0 0.25rem 0' }}><strong>Potentiel Salarial :</strong> {traj.salary_potential}</p>
              <p style={{ margin: '0 0 0.25rem 0' }}><strong>Pourquoi :</strong> {traj.rationale || traj.why}</p>
              <p style={{ margin: 0 }}><strong>Écarts (Gap) :</strong> {traj.gap || traj.missing}</p>
            </div>
          )) : (
            <div className="print-box avoid-break">
              {renderGeneric(careerRadarResult)}
            </div>
          )}
        </div>
      )}

      {/* Décodeur d'Annonce */}
      {selection.decoder !== false && jobDecoderResult && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🕵️ Décodeur d'Annonce</h2>
          <div className="print-box avoid-break">
            {jobDecoderResult.reality_check ? (
              <>
                <h3 style={{ color: '#0f172a', fontSize: '1.1rem' }}>Jargon décodé</h3>
                <ul>
                  {(jobDecoderResult.reality_check || []).map((item: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}><strong>{item.jargon} :</strong> {item.translation}</li>
                  ))}
                </ul>
                {jobDecoderResult.real_expectations && (
                  <>
                    <h3 style={{ color: '#0f172a', fontSize: '1.1rem', marginTop: '1rem' }}>Vraies attentes</h3>
                    <ul>
                      {(jobDecoderResult.real_expectations || []).map((item: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {jobDecoderResult.red_flags && jobDecoderResult.red_flags.length > 0 && (
                  <>
                    <h3 style={{ color: '#dc2626', fontSize: '1.1rem', marginTop: '1rem' }}>Signaux d'alerte</h3>
                    <ul>
                      {jobDecoderResult.red_flags.map((item: string, idx: number) => (
                        <li key={idx} style={{ color: '#dc2626', marginBottom: '0.25rem' }}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : renderGeneric(jobDecoderResult)}
          </div>
        </div>
      )}

      {/* 2. Dossier Entreprise & Marché */}
      {selection.research !== false && (
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
      )}

      {/* Marché Caché */}
      {selection.hidden_market !== false && hiddenMarketResult && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🕸️ Stratégie Marché Caché</h2>
          <div className="print-box avoid-break">
            {hiddenMarketResult.target_profiles ? (
              <>
                <h3 style={{ color: '#0f172a', fontSize: '1.1rem' }}>Profils à cibler</h3>
                <ul>
                  {(hiddenMarketResult.target_profiles || []).map((item: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}><strong>{item.role} :</strong> {item.reason}</li>
                  ))}
                </ul>
                {hiddenMarketResult.outreach_message && (
                  <>
                    <h3 style={{ color: '#0f172a', fontSize: '1.1rem', marginTop: '1rem' }}>Message d'approche suggéré</h3>
                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}><strong>Objet :</strong> {hiddenMarketResult.outreach_message?.subject}</p>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{hiddenMarketResult.outreach_message?.body}</p>
                    </div>
                  </>
                )}
                {hiddenMarketResult.networking_tips && (
                  <>
                    <h3 style={{ color: '#0f172a', fontSize: '1.1rem', marginTop: '1rem' }}>Astuces Réseau</h3>
                    <ul>
                      {hiddenMarketResult.networking_tips.map((item: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : renderGeneric(hiddenMarketResult)}
          </div>
        </div>
      )}

      {/* Questions d'entretien */}
      {selection.questions !== false && questionsArray.length > 0 && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>💬 Questions d'Entretien</h2>
          {questionsArray.map((q: any, idx: number) => (
            <div key={idx} className="print-box avoid-break">
              <h3 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Q : {q.question || q.text}</h3>
              {q.user_answer ? (
                <>
                  <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Votre réponse :</strong> {q.user_answer}</p>
                  {q.evaluation && (
                    <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#166534', fontWeight: 'bold' }}>Feedback IA (Score: {(q.evaluation.score/10).toFixed(1)}/10)</p>
                      <div style={{ margin: 0, color: '#166534' }}>{renderImprovedAnswer(q.evaluation.improved_answer || q.evaluation.feedback)}</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '6px', marginTop: '0.75rem', border: '1px dashed #cbd5e1' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>Non répondu lors de l'entraînement.</p>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    <strong style={{ color: '#3b82f6' }}>💡 Conseil du coach :</strong> {(q.suggested_answer || q.answer || q.advice || "À vous de jouer !").replace(/^(Suggestion|Conseil)\s*:\s*/i, '')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mises en situation */}
      {selection.mes !== false && scenariosArray.length > 0 && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>🎭 Mises en Situation</h2>
          {scenariosArray.map((q: any, idx: number) => (
            <div key={idx} className="print-box avoid-break">
              <h3 style={{ color: '#0f172a', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Cas : {q.question || q.text}</h3>
              {q.user_answer ? (
                <>
                  <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Votre action :</strong> {q.user_answer}</p>
                  {q.evaluation && (
                    <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#166534', fontWeight: 'bold' }}>Feedback IA (Score: {(q.evaluation.score/10).toFixed(1)}/10)</p>
                      <div style={{ margin: 0, color: '#166534' }}>{renderImprovedAnswer(q.evaluation.improved_answer || q.evaluation.feedback)}</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '6px', marginTop: '0.75rem', border: '1px dashed #cbd5e1' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>Non répondu lors de l'entraînement.</p>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    <strong style={{ color: '#3b82f6' }}>💡 Conseil du coach :</strong> {(q.advice || q.suggested_answer || "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer votre réponse.").replace(/^(Suggestion|Conseil)\s*:\s*/i, '')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Réponses aux Défauts */}
      {selection.flaws !== false && flaws.length > 0 && (
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
      )}

      {/* 4. Historique des questions */}
      {(selection.todo !== false) && (
        <div className="print-section page-break">
          <h2 style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.5rem' }}>✅ Plan d'Action (To-Do List)</h2>
          <div className="print-box">
            {Array.isArray(todoList) ? todoList.map((step: any, i: number) => {
              // Nouveau cas : L'IA renvoie directement un tableau de tâches simples (task/advice)
              if (step.task && step.advice) {
                return (
                  <div key={i} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#2563eb', margin: '0 0 0.5rem 0' }}>{step.task}</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      <li style={{ marginBottom: '0.25rem', color: '#475569', lineHeight: '1.5' }}>{step.advice}</li>
                    </ul>
                  </div>
                );
              }

              // Ancien cas : L'IA renvoie des phases complexes
              const title = typeof step === 'string' ? `Étape ${i+1}` : (step.phase || step.title || step.step || step.name || `Étape ${i+1}`);
              let actions = [];
              if (typeof step === 'string') {
                actions = [step];
              } else {
                const rawActions = step.actions || step.tasks || step.items || step.description || step.details;
                if (Array.isArray(rawActions)) actions = rawActions;
                else if (rawActions) actions = [rawActions];
                else if (step.task) actions = [step];
              }
              return (
              <div key={i} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#2563eb', margin: '0 0 0.5rem 0', textTransform: 'capitalize' }}>{title.replace(/_/g, ' ')}</h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {actions.map((act: any, j: number) => (
                    <li key={j} style={{ marginBottom: '0.25rem', color: '#475569', lineHeight: '1.5' }}>
                      {typeof act === 'string' ? act : (act.task ? `${act.task}${act.advice ? ` : ${act.advice}` : ''}` : JSON.stringify(act))}
                    </li>
                  ))}
                </ul>
              </div>
            )}) : (
              <p>Plan d'action non disponible.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};