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

export default function TrainingTab() {
  const { cvData, updateFormData } = useDashboard();
  const [score, setScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [themeScores, setThemeScores] = useState<Record<string, number>>({});
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
      }
    } catch (err) {
      console.error("Erreur récupération stats", err);
    }
  };

  // Charger les statistiques globales au montage
  useEffect(() => {
    fetchStats();
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
          advice: data.questions[0].advice
          suggested_answer: data.questions[0].suggested_answer
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
      
      const completedQ = { ...activeQuestion, userAnswer, feedback: data.feedback };
      const updatedQuestions = [...(cvData?.trainingQuestions || []), completedQ];
      if (updateFormData) updateFormData("trainingQuestions", updatedQuestions);
    } catch (err) {
      console.error("Erreur évaluation", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // --- GÉNÉRATEUR DU RADAR SVG ---
  const size = 300;
  const center = size / 2;
  const radius = center * 0.6;
  const getPoint = (angle: number, value: number) => {
    const val = Math.max(0, Math.min(100, value));
    const r = radius * (val / 100);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  };
  
  const maxPolygon = themes.map((_, i) => getPoint(i * 2 * Math.PI / themes.length - Math.PI / 2, 100)).join(' ');
  const midPolygon = themes.map((_, i) => getPoint(i * 2 * Math.PI / themes.length - Math.PI / 2, 50)).join(' ');
  const dataPolygon = themes.map((t, i) => getPoint(i * 2 * Math.PI / themes.length - Math.PI / 2, themeScores[t] || 0)).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* --- SECTION STATISTIQUES & RADAR --- */}
      <DashboardCard title="Tableau de Chasse" icon={<Activity size={24} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Score Global IA</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', margin: '0.5rem 0' }}>{score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 100</span></div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Basé sur {totalSessions} entraînements terminés.</div>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} /> Conseil du Coach
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Identifiez vos points faibles sur le radar ci-contre et ciblez vos prochaines sessions sur ces thématiques.
              </p>
            </div>
          </div>

          {/* Graphique Radar SVG personnalisé */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
              {/* Lignes de fond */}
              <polygon points={maxPolygon} fill="none" stroke="var(--border-color)" strokeWidth="1" />
              <polygon points={midPolygon} fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
              {themes.map((_, i) => (
                <line key={i} x1={center} y1={center} x2={getPoint(i * 2 * Math.PI / themes.length - Math.PI / 2, 100).split(',')[0]} y2={getPoint(i * 2 * Math.PI / themes.length - Math.PI / 2, 100).split(',')[1]} stroke="var(--border-color)" strokeWidth="1" />
              ))}
              {/* Données */}
              <polygon points={dataPolygon} fill="rgba(59, 130, 246, 0.3)" stroke="var(--primary)" strokeWidth="2" style={{ transition: 'all 0.5s ease-out' }} />
              {/* Labels */}
              {themes.map((label, i) => {
                const angle = i * 2 * Math.PI / themes.length - Math.PI / 2;
                const lblR = radius * 1.3;
                return (
                  <text key={label} x={center + lblR * Math.cos(angle)} y={center + lblR * Math.sin(angle)} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">
                    {label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      </DashboardCard>

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

          {feedback && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Score : {feedback.score}/100</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><strong style={{ color: '#10b981' }}>Points forts :</strong><ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>{feedback.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
                <div><strong style={{ color: '#ef4444' }}>À améliorer :</strong><ul style={{ margin: '0.5rem 0', paddingLeft: '1.2rem', fontSize: '0.9rem' }}>{feedback.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul></div>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <strong>Réponse idéale :</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', whiteSpace: 'pre-line' }}>{feedback.improved_answer}</p>
              </div>
              <button onClick={() => { setActiveQuestion(null); setFeedback(null); }} className="btn-secondary" style={{ marginTop: '1rem' }}>Terminer et passer à la suite</button>
            </div>
          )}
        </DashboardCard>
      )}

      {/* --- HISTORIQUE D'ENTRAÎNEMENT --- */}
      {!activeQuestion && cvData?.trainingQuestions && cvData.trainingQuestions.length > 0 && (
        <DashboardCard title="Historique d'Entraînement" icon={<History size={24} />}>
           <Questionnaire 
             questions={[...cvData.trainingQuestions].reverse()} 
             hideHeader={true} 
             storageKeyPrefix="training" 
             evalEndpoint="/api/cv/training/evaluate"
             onEvaluateSuccess={fetchStats}
           />
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