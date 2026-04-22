import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff,
  Send, 
  Activity, 
  Target, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  BrainCircuit,
  MessageSquare,
  Settings2
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import ScoreGauge from './ScoreGauge';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';

export default function TrainingTab() {
  const [score, setScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [themeScores, setThemeScores] = useState<Record<string, number>>({});
  const [selectedTheme, setSelectedTheme] = useState('Gestion de crise');
  const [selectedType, setSelectedType] = useState('MES');
  const [isGenerating, setIsGenerating] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const themes = ['Management', 'Gestion de crise', 'Négociation', 'Leadership', 'Communication'];
  const types = [{ id: 'Classique', label: 'Questions Classiques' }, { id: 'MES', label: 'Mises en Situation' }];

  // Charger les statistiques globales au montage
  useEffect(() => {
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
    fetchStats();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setFeedback(null);
    setAnswer('');
    
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme, question_type: selectedType, count: 1 })
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestion(data.questions[0]);
      }
    } catch (err) {
      console.error("Erreur génération question", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setIsEvaluating(true);
    
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          question_type: selectedType,
          question_text: question.text,
          user_answer: answer
        })
      });
      const data = await res.json();
      setFeedback(data.feedback);
      setScore(prev => Math.min(100, Math.round((prev * totalSessions + data.feedback.score) / (totalSessions + 1))));
      setTotalSessions(prev => prev + 1);
      setThemeScores(prev => ({ ...prev, [selectedTheme]: data.feedback.score })); // MAJ optimiste du radar
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

      {/* --- ZONE D'INTERACTION --- */}
      {question && (
        <div style={{ background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', overflow: 'hidden', animation: 'fadeIn 0.4s ease-out', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '1rem', color: 'white' }}>
                {selectedType === 'MES' ? <BrainCircuit size={28} /> : <MessageSquare size={28} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{selectedTheme}</div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{question.text}</h3>
                <p style={{ margin: '1rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={16} /> Objectif du recruteur : {question.advice}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{ padding: '2rem' }}>
            <textarea 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Rédigez votre réponse ici de manière structurée..."
              rows={6}
              disabled={isEvaluating}
              style={{ width: '100%', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: '1.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button 
                onClick={handleSubmit}
                disabled={isEvaluating || !answer.trim()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 2rem' }}
              >
                {isEvaluating ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
                {isEvaluating ? "Analyse en cours..." : "Soumettre & Évaluer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEEDBACK IA --- */}
      {feedback && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <ScoreGauge score={feedback.score / 10} label="Impact de la réponse" critique={feedback.score >= 80 ? "Excellente réponse !" : "Réponse à optimiser."} />
             
             <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
               <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Ce qui fonctionne bien</h4>
               <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                 {feedback.strengths?.map((s: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}
               </ul>
             </div>
             
             <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
               <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Axes d'amélioration</h4>
               <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                 {feedback.weaknesses?.map((w: string, i: number) => <li key={i} style={{ marginBottom: '0.5rem' }}>{w}</li>)}
               </ul>
             </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6', height: 'fit-content' }}>
             <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
               <Award size={20} /> Réponse idéale suggérée (STAR)
             </h4>
             <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', lineHeight: 1.6, fontStyle: 'italic', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
               "{feedback.improved_answer}"
             </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}