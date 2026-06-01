import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Target, 
  Award, 
  RefreshCw,
  BrainCircuit,
  MessageSquare,
  Settings2,
  History,
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import Questionnaire from './Questionnaire';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useDashboard } from './DashboardContext';
import { VocalPitchTrainer } from './VocalPitchTrainer';

export default function TrainingTab() {
  const { cvData, updateFormData, pitchResult } = useDashboard();
  const [score, setScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [themeScores, setThemeScores] = useState<Record<string, number>>({});
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [selectedTheme, setSelectedTheme] = useState('Gestion de crise');
  const [selectedType, setSelectedType] = useState('MES');
  const [isGenerating, setIsGenerating] = useState(false);

  // UX Interactive (Aide & Suggestion)
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);

  const themes = ['Management', 'Gestion de crise', 'Négociation', 'Leadership', 'Communication'];
  const types = [{ id: 'Classique', label: 'Questions Classiques' }, { id: 'MES', label: 'Mises en Situation' }];

  // Méthode de rafraîchissement des stats globales extraite pour pouvoir être appelée par le Questionnaire
  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/stats`);
      if (res.ok) {
        const data = await res.json();
        setScore(data.global_score);
        setTotalSessions(data.total_sessions);
        setThemeScores(data.theme_scores || {});
        setThemeCounts(data.theme_counts || {});
      }
    } catch (err) {
      console.error("Erreur récupération stats", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/history`);
      if (res.ok) {
        const data = await res.json();
        setTrainingHistory(data.history || []);
      }
    } catch (err) {
      console.error("Erreur récupération historique", err);
    }
  };

  // Charger les statistiques globales au montage
  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme, question_type: selectedType, count: 1 })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const newQ = {
          id: Date.now().toString(),
          category: selectedTheme,
          type: selectedType,
          question: data.questions[0].text,
          advice: data.questions[0].advice,
          suggested_answer: data.questions[0].suggested_answer,
        };
        // Démarre la session interactive
        setActiveQuestion(newQ);
        setShowHint(false);
        setShowSuggestion(false);
        setUserAnswer('');
        setFeedback(null);
      }
    } catch (err) {
      console.error("Erreur génération question", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: activeQuestion.category, question_type: activeQuestion.type, question_text: activeQuestion.question, user_answer: userAnswer })
      });
      const data = await res.json();
      setFeedback(data.feedback);
      fetchStats();
      
      const completedQ = { ...activeQuestion, userAnswer, evaluation: data.feedback, feedback: data.feedback };
      
      // Injection silencieuse dans le cache local pour que l'historique "Questionnaire" l'affiche avec couleurs et /10
      try {
        localStorage.setItem(`training_${activeQuestion.id}`, JSON.stringify({
          answer: userAnswer,
          userAnswer: userAnswer,
          evaluation: data.feedback,
          feedback: data.feedback
        }));
      } catch(e) { console.error("Erreur cache", e); }

      const updatedHistory = [...trainingHistory, completedQ];
      setTrainingHistory(updatedHistory);
      if (updateFormData) updateFormData("trainingQuestions", updatedHistory);
    } catch (err) {
      console.error("Erreur évaluation", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper couleur
  const getScoreColor = (val: number) => {
    const score10 = val / 10;
    if (score10 >= 8) return '#10b981';
    if (score10 >= 5) return '#f59e0b';
    if (val > 0) return '#ef4444';
    return 'var(--text-muted)';
  };

  // [FIX EXPERT] On remplace la note du "Fond" par la vraie note vocale calculée par le VocalPitchTrainer
  const oralPitchScore = themeScores['Pitch Vocal'] ?? 0;
  const oralPitchSessions = themeCounts['Pitch Vocal'] ?? 0;

  // Calcul des stats spécifiques Q/A (Tout sauf le Pitch)
  const qaTotalSessions = totalSessions - oralPitchSessions;
  let qaScore = 0;
  if (qaTotalSessions > 0) {
      let totalQaScore = 0;
      Object.entries(themeScores).forEach(([theme, tScore]) => {
          if (theme !== 'Pitch Vocal') {
              totalQaScore += tScore * (themeCounts[theme] ?? 0);
          }
      });
      qaScore = Math.round(totalQaScore / qaTotalSessions);
  }

  // Fonction de sécurité pour afficher les objets JSON de l'IA (Pitch Vocal) sans faire crasher React
  const renderSafeText = (item: any) => {
    if (!item) return "";
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      if (item.pace_and_silences) return `Rythme: ${item.pace_and_silences} | Structure: ${item.structure_and_clarity}`;
      if (item.wpm) return `Débit: ${item.wpm} mots/min (${item.pace_status})`;
      try { return JSON.stringify(item); } catch { return "Données complexes"; }
    }
    return String(item);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* --- SECTION STATISTIQUES --- */}
      <DashboardCard title="Tableau de Chasse" icon={<Activity size={24} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Entretien (Q/A)</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: getScoreColor(score), margin: '0.5rem 0' }}>{score / 10} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span></div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sur {totalSessions} sessions.</div>
              </div>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Entraînement Oral (Pitch)</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: oralPitchScore > 0 ? getScoreColor(oralPitchScore) : 'var(--text-muted)', margin: '0.5rem 0' }}>
                  {oralPitchScore > 0 ? (oralPitchScore / 10).toFixed(1) : '-'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Évaluation de la prosodie et du débit.</div>
              </div>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} /> Conseil du Coach
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Identifiez vos points faibles ci-contre et ciblez vos prochaines sessions sur ces thématiques pour équilibrer votre profil.
              </p>
            </div>
          </div>

          {/* Barres de progression (Remplace le Radar) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem' }}>
            {themes.map(t => {
              const tScore = themeScores[t] ?? 0;
              const tCount = themeCounts[t] ?? 0;
              const tColor = tCount > 0 ? getScoreColor(tScore) : 'var(--text-muted)';
              return (
                <div key={t} style={{ opacity: tCount > 0 ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {t} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>({tCount} session{tCount > 1 ? 's' : ''})</span>
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: tColor }}>
                      {tCount > 0 ? tScore / 10 : '-'} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>/ 10</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${tCount > 0 ? tScore : 0}%`, height: '100%', background: tColor, transition: 'width 0.8s ease-out' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardCard>

      {/* --- NOUVEAU MODULE : ENTRAÎNEMENT AU PITCH VOCAL --- */}
      <VocalPitchTrainer targetJob={cvData?.target_job || cvData?.target_role_primary || "Candidat"} onSuccess={fetchStats} />

      {/* --- SECTION CONFIGURATION --- */}
      <DashboardCard title="Nouvelle Session d'Entraînement" icon={<Settings2 size={24} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Choix du Type (Grandes Cartes) */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.05rem' }}>1. Sélectionnez le format</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {types.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedType(t.id)}
                  style={{ 
                    padding: '1.5rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedType === t.id ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    border: `2px solid ${selectedType === t.id ? 'var(--primary)' : 'var(--border-color)'}`,
                    boxShadow: selectedType === t.id ? '0 10px 15px -3px rgba(59, 130, 246, 0.15)' : 'none'
                  }}
                >
                  <div style={{ color: selectedType === t.id ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '1rem' }}>
                    {t.id === 'MES' ? <BrainCircuit size={32} /> : <MessageSquare size={32} />}
                  </div>
                  <h5 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{t.label}</h5>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {t.id === 'MES' ? "Scénarios complexes et immersion." : "Questions pièges et parcours."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Choix du Thème */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.05rem' }}>2. Choisissez la thématique cible</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {themes.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTheme(t)}
                  style={{
                    padding: '0.75rem 1.5rem', borderRadius: '2rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedTheme === t ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: selectedTheme === t ? 'white' : 'var(--text-main)',
                    border: `1px solid ${selectedTheme === t ? 'var(--primary)' : 'var(--border-color)'}`
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton Générer */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary"
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              {isGenerating ? <RefreshCw className="spin" size={20} /> : <Target size={20} />}
              {isGenerating ? "Génération par l'IA..." : "Générer mon défi"}
            </button>
          </div>
        </div>
      </DashboardCard>

      {/* --- SESSION INTERACTIVE EN COURS --- */}
      {activeQuestion && (
        <DashboardCard title="🎯 Votre Défi" icon={<Target size={24} />}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>{activeQuestion.question}</h3>
            
            {!showHint ? (
              <button className="btn-outline" onClick={() => setShowHint(true)} style={{ marginTop: '1rem' }}>💡 Besoin d'un conseil ?</button>
            ) : (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary)' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}><strong>Objectif :</strong> {activeQuestion.advice}</p>
                {!showSuggestion ? (
                  <button className="btn-outline" onClick={() => setShowSuggestion(true)} style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Voir une suggestion</button>
                ) : (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '0.5rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}><em>Suggestion : {activeQuestion.suggested_answer || "Utilisez la méthode STAR."}</em></p>
                  </div>
                )}
              </div>
            )}
          </div>

          <textarea 
            value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Rédigez votre réponse ici..."
            style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', marginBottom: '1rem' }}
          />

          <button onClick={handleEvaluate} disabled={isEvaluating || !userAnswer.trim()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEvaluating ? <RefreshCw className="spin" size={18} /> : <MessageSquare size={18} />} {isEvaluating ? "Évaluation..." : "Soumettre & Évaluer"}
          </button>

          {feedback && (() => {
            const score10 = (feedback.score || 0) / 10;
            const scoreColor = score10 >= 8 ? '#10b981' : score10 >= 5 ? '#f59e0b' : '#ef4444';
            return (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: scoreColor, color: 'white', fontWeight: 'bold', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '1.2rem' }}>
                  {score10} / 10
                </div>
                <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Analyse de votre réponse</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><strong style={{ color: '#10b981' }}>Points forts :</strong><ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>{Array.isArray(feedback.strengths) ? feedback.strengths.map((s: any, i: number) => <li key={i}>{renderSafeText(s)}</li>) : <li>{renderSafeText(feedback.strengths)}</li>}</ul></div>
                <div><strong style={{ color: '#ef4444' }}>À améliorer :</strong><ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>{Array.isArray(feedback.weaknesses) ? feedback.weaknesses.map((w: any, i: number) => <li key={i}>{renderSafeText(w)}</li>) : <li>{renderSafeText(feedback.weaknesses)}</li>}</ul></div>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <strong>Réponse idéale :</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{typeof feedback.improved_answer === 'object' ? JSON.stringify(feedback.improved_answer) : feedback.improved_answer}</p>
              </div>
              <button onClick={() => { setActiveQuestion(null); setFeedback(null); }} className="btn-secondary" style={{ marginTop: '1rem' }}>Terminer et passer à la suite</button>
            </div>
            );
          })()}
        </DashboardCard>
      )}

      {/* --- HISTORIQUE D'ENTRAÎNEMENT --- */}
      {!activeQuestion && trainingHistory && trainingHistory.length > 0 && (
        <DashboardCard title="Historique d'Entraînement" icon={<History size={24} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...(Array.isArray(trainingHistory) ? trainingHistory : [])].reverse().map((q: any, index: number) => {
              const fb = q.feedback || q.evaluation;
              const score10 = (fb?.score || 0) / 10;
              const scoreColor = score10 >= 8 ? '#10b981' : score10 >= 5 ? '#f59e0b' : '#ef4444';

              return (
                <div key={q.id || index} style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: `6px solid ${scoreColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>{q.category} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>• {q.type}</span></div>
                    <div style={{ background: scoreColor, color: 'white', padding: '0.25rem 1rem', borderRadius: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {score10} / 10
                    </div>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1rem' }}><strong>Question :</strong> {q.question}</p>
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}><strong>Votre réponse :</strong> {q.userAnswer}</p>
                  </div>
                  {fb && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <strong style={{ color: '#10b981' }}>{q.type === 'Vocal' ? 'Métriques :' : 'Points forts :'}</strong>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>{Array.isArray(fb.strengths) ? fb.strengths.map((s: any, i: number) => <li key={i}>{renderSafeText(s)}</li>) : <li>{renderSafeText(fb.strengths)}</li>}</ul>
                      </div>
                      <div>
                        <strong style={{ color: '#ef4444' }}>{q.type === 'Vocal' ? 'Diagnostic :' : 'À améliorer :'}</strong>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>{Array.isArray(fb.weaknesses) ? fb.weaknesses.map((w: any, i: number) => <li key={i}>{renderSafeText(w)}</li>) : <li>{renderSafeText(fb.weaknesses)}</li>}</ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DashboardCard>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}