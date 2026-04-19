import React, { useState, useEffect } from 'react';
import { BrainCircuit, Eye, Edit3, CheckCircle2, AlertTriangle, Lightbulb, MessageSquare, ArrowLeft, Target, ChevronDown, ChevronUp, Loader2, Send, Users, ListChecks, Shield, Award, RefreshCw, X } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';
import { useDashboard } from './DashboardContext'; // [NEW] Importer le hook
import scenariosData from './scenarios.json';

// --- TYPES ---

interface ModelAnswer {
  diagnostic: string;
  human: string;
  action: string;
  follow_up: string;
}

interface ScenarioItem {
  id: string;
  title: string;
  description: string;
}

interface ScenarioCategory {
  category: string;
  icon: string;
  scenarios: ScenarioItem[];
}

interface AIFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  analysis: ModelAnswer;
  recommendations: string[];
  improved_answer: string;
}

const iconMap: { [key: string]: React.ElementType } = {
  AlertTriangle,
  Users,
  MessageSquare,
  ListChecks,
  BrainCircuit,
  Shield
};

export function SituationSimulator() {
  const { cvData, customScenariosResult, updateFormData } = useDashboard(); 
  const [scenarios, setScenarios] = useState<ScenarioCategory[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioItem | null>(null);
  const [mode, setMode] = useState<'passive' | 'active' | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [showPassiveModel, setShowPassiveModel] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // État local pour un retour visuel instantané (Optimistic UI update)
  const [localScores, setLocalScores] = useState<Record<string, number>>({});

  // Synchronisation avec les données du serveur au chargement
  useEffect(() => {
    if (cvData?.simulatorScores) {
      setLocalScores(cvData.simulatorScores);
    }
  }, [cvData?.simulatorScores]);

  // Utilitaire pour déterminer le thème de la carte en fonction du score
  const getScoreTheme = (score100?: number) => {
    if (score100 === undefined) return { border: 'var(--border-color)', bg: 'transparent', text: 'var(--text-muted)' };
    if (score100 >= 75) return { border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' };
    if (score100 >= 50) return { border: '#eab308', bg: 'rgba(234, 179, 8, 0.05)', text: '#eab308' };
    return { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.05)', text: '#ef4444' };
  };

  const reset = () => {
    setSelectedScenario(null);
    setMode(null);
    setUserAnswer("");
    setAiFeedback(null);
    setShowPassiveModel(false);
  };

  useEffect(() => {
    // Si l'IA a généré des scénarios personnalisés, on les utilise. Sinon, fallback statique.
    if (customScenariosResult && customScenariosResult.categories && customScenariosResult.categories.length > 0) {
      setScenarios(customScenariosResult.categories);
    } else {
      setScenarios(scenariosData);
    }
  }, [customScenariosResult]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || !selectedScenario) return;
    
    setIsSubmitting(true);
    setAiFeedback(null);

    try {
      // Appel API Réel
      const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/simulate-situation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scenario_id: selectedScenario.id,
          scenario_context: selectedScenario,
          candidate_profile: cvData, // [NEW] Envoyer le profil complet
          user_answer: userAnswer 
        }),
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      setAiFeedback(data.feedback);
      const scId = selectedScenario.id || selectedScenario.title;
      
      // Mise à jour optimiste pour que la bordure change instantanément en UI
      setLocalScores(prev => ({ ...prev, [scId]: Number(data.feedback.score) }));

      if (updateFormData) {
        updateFormData("simulatorScores", { ...localScores, [scId]: Number(data.feedback.score) });
      }
    } catch (error) {
      console.error("Erreur lors de l'analyse IA :", error);
      // Le mock a été supprimé pour ne plus écraser la vraie note (ex: 4/10) en cas d'erreur de rendu.
      alert("Une erreur de communication avec le serveur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMore = async () => {
    setIsGeneratingMore(true);
    try {
      // Point d'accroche pour la future route de regénération
      // await authenticatedFetch(`${API_BASE_URL}/api/cv/generate-extra-scenarios`, { method: 'POST', ... });
      setTimeout(() => {
        alert("Fonctionnalité en cours de raccordement. L'IA générera bientôt de nouveaux cas à la volée !");
        setIsGeneratingMore(false);
      }, 1000);
    } catch (e) {
      setIsGeneratingMore(false);
    }
  };

  const isCategoryMastered = (category: ScenarioCategory) => {
    if (!category.scenarios || category.scenarios.length === 0) return false;
    // On considère un scénario comme maîtrisé si le score est supérieur à 50
    return category.scenarios.every(sc => {
      const scId = sc.id || sc.title;
      return localScores[scId] !== undefined && localScores[scId] >= 50;
    });
  };

  const allMastered = scenarios.length > 0 && scenarios.every(isCategoryMastered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
      {/* --- VUE LISTE TOUJOURS VISIBLE --- */}
      {scenarios.map((category) => {
        const Icon = iconMap[category.icon] || BrainCircuit;
        const mastered = isCategoryMastered(category);
        return (
          <div key={category.category}>
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={24} color={mastered ? "#10b981" : "var(--primary)"} />
                {category.category}
              </div>
              {mastered && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.4rem 0.75rem', borderRadius: '2rem', fontWeight: 600 }}>
                  <Award size={16} /> Badge Obtenu
                </span>
              )}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {category.scenarios.map(sc => {
                const scId = sc.id || sc.title;
                const score = localScores[scId];
                const isDone = score !== undefined;
                const theme = getScoreTheme(score);
                const isHovered = hoveredCard === scId;
                const scoreSur10 = score !== undefined ? (score / 10).toFixed(1) : null;
                
                // --- NOUVEAU : Pré-calcul propre pour imposer le style au navigateur ---
                const currentBorderColor = isDone ? theme.border : (isHovered ? 'var(--primary)' : 'var(--border-color)');
                const currentBorderWidth = isDone ? '2px' : '1px';
                const dynamicBorder = `${currentBorderWidth} solid ${currentBorderColor}`;
                const dynamicBoxShadow = isHovered 
                  ? (isDone ? `0 10px 15px -3px ${theme.border}40` : '0 10px 15px -3px rgba(0,0,0,0.05)') 
                  : 'none';

                return (
                  <div 
                    key={scId} 
                    onClick={() => setSelectedScenario(sc)} 
                    style={{ 
                      background: isDone ? theme.bg : 'var(--bg-card)', 
                      padding: '1.5rem', 
                      borderRadius: '1rem', 
                      border: dynamicBorder,
                      cursor: 'pointer', 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      position: 'relative', 
                      overflow: 'hidden',
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                      boxShadow: dynamicBoxShadow
                    }} 
                    onMouseEnter={() => setHoveredCard(scId)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', flex: 1, paddingRight: '1rem' }}>{sc.title}</h4>
                      {isDone && (
                        <div style={{ background: theme.border, color: 'white', padding: '0.35rem 0.85rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          {scoreSur10} / 10
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', flex: 1 }}>{sc.description}</p>
                    <div style={{ marginTop: '1.5rem', display: 'inline-block' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isDone ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>
                        {isDone ? 'Refaire ce cas' : 'S\'entraîner sur ce cas'} &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {allMastered && (
        <div style={{ marginTop: '1rem', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '1rem', textAlign: 'center', border: '1px dashed var(--primary)' }}>
          <Award size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Félicitations, vous maîtrisez tous les scénarios !</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)' }}>Vous êtes prêt pour affronter les cas pratiques de cet entretien.</p>
          <button onClick={handleGenerateMore} disabled={isGeneratingMore} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            {isGeneratingMore ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
            Générer de nouveaux cas complexes (IA)
          </button>
        </div>
      )}

      {/* --- MODALE DÉTAIL SCÉNARIO (OVERLAY) --- */}
      {selectedScenario && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1200,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-body)', width: '100%', maxWidth: '800px', maxHeight: '90vh',
            borderRadius: '1rem', overflowY: 'auto', position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column'
          }}>
            
            {/* Bouton Fermer */}
            <div style={{ position: 'sticky', top: 0, background: 'var(--bg-body)', zIndex: 10, padding: '1.5rem 1.5rem 0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={reset} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--border-color)'} onMouseOut={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header Scénario */}
              <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{selectedScenario.title}</h3>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.6', fontStyle: 'italic' }}>"{selectedScenario.description}"</p>
              </div>

              {/* Choix du mode (si non sélectionné) */}
              {!mode && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setMode('passive')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                    <Eye size={32} color="var(--primary)" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Mode Lecture</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Découvrir la structure attendue</span>
                  </button>
                  
                  <button onClick={() => setMode('active')} style={{ background: 'var(--primary)', border: 'none', padding: '2rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <Edit3 size={32} color="white" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>Je m'entraîne (IA)</span>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Rédigez votre réponse pour un feedback expert</span>
                  </button>
                </div>
              )}

              {/* MODE PASSIF */}
              {mode === 'passive' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} /> Ce que le recruteur évalue</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                      <li style={{ marginBottom: '0.5rem' }}>Capacité à gérer le stress et l'urgence</li>
                    </ul>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setShowPassiveModel(!showPassiveModel)} style={{ width: '100%', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1.1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BrainCircuit size={20} color="var(--primary)"/> Déroulé de la Réponse Idéale</span>
                      {showPassiveModel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    
                    {showPassiveModel && (
                      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <div><strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>1. Diagnostic</strong><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>Évaluer l'impact réel.</p></div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <button onClick={reset} className="btn-secondary" style={{ padding: '0.75rem 2rem' }}>Fermer</button>
                  </div>
                </div>
              )}

              {/* MODE ACTIF */}
              {mode === 'active' && !aiFeedback && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '0.5rem', color: 'var(--primary)' }}><Edit3 size={24} /></div>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>À vous de jouer</h4>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Rédigez votre réponse comme si vous parliez au recruteur. Soyez concret et structuré (max ~10 lignes).</p>
                    </div>
                  </div>
                  
                  <textarea 
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Ex: Ma première action serait de..."
                    rows={6}
                    disabled={isSubmitting}
                    style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', outline: 'none', transition: 'border-color 0.2s', marginBottom: '1rem' }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={reset} disabled={isSubmitting} className="btn-ghost">Annuler</button>
                    <button onClick={handleSubmit} disabled={!userAnswer.trim() || isSubmitting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isSubmitting ? <><Loader2 size={18} className="spin" /> Analyse IA en cours...</> : <><Send size={18} /> Analyser ma réponse</>}
                    </button>
                  </div>
                </div>
              )}

              {/* FEEDBACK IA */}
              {aiFeedback && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'slideUp 0.4s ease-out' }}>
                  
                  {/* Score & Verdict Rapide */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                    <ScoreGauge score={aiFeedback.score / 10} label="Score de Réponse" />
                    <div style={{ flex: 1 }}>
                       <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Diagnostic IA</h4>
                       <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                         {aiFeedback.score >= 80 ? "Excellente réponse, très bien structurée." : aiFeedback.score >= 50 ? "Bonne base, mais manque de structure ou de pragmatisme." : "Réponse à retravailler, les attentes du recruteur ne sont pas couvertes."}
                       </p>
                    </div>
                  </div>

                  {/* Forces / Faiblesses */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} /> Ce qui fonctionne bien</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {aiFeedback.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{s}</li>)}
                      </ul>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={18} /> Ce qu'il manque</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {aiFeedback.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{w}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Analyse étape par étape */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} color="var(--primary)" /> Analyse Structurelle</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Diagnostic</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{aiFeedback.analysis.diagnostic}</p>
                      </div>
                      <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Humain</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{aiFeedback.analysis.human}</p>
                      </div>
                      <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Action</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{aiFeedback.analysis.action}</p>
                      </div>
                      <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase' }}>Suivi</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>{aiFeedback.analysis.follow_up}</p>
                      </div>
                    </div>
                  </div>

                  {/* Réponse Améliorée */}
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> Proposition de réponse optimisée</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', fontStyle: 'italic' }}>
                      "{aiFeedback.improved_answer}"
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <button onClick={() => { setAiFeedback(null); setUserAnswer(""); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Edit3 size={16} /> Réessayer
                    </button>
                    <button onClick={reset} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Valider et retourner aux scénarios
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}