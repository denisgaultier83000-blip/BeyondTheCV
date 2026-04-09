import React, { useState } from 'react';
import { BrainCircuit, Eye, Edit3, CheckCircle2, AlertTriangle, Lightbulb, MessageSquare, ArrowLeft, Target, ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import ScoreGauge from './ScoreGauge';

// --- TYPES ---
interface ModelAnswer {
  diagnostic: string;
  human: string;
  action: string;
  follow_up: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  category: 'Management' | 'Crise' | 'Communication' | 'Stratégie' | 'Éthique';
  level: 'Junior' | 'Intermédiaire' | 'Senior';
  recruiter_expectations: string[];
  model_answer: ModelAnswer;
  tips: string[];
  phrases: string[];
}

interface AIFeedback {
  score: number;
  strengths: string[];
  weaknesses: string[];
  analysis: ModelAnswer;
  recommendations: string[];
  improved_answer: string;
}

// --- STATIC SCENARIOS (MVP) ---
const SCENARIOS: Scenario[] = [
  {
    id: "sc_1",
    title: "Démission critique",
    description: "Un membre clé de votre équipe annonce sa démission surprise en plein milieu d'un projet stratégique dont le livrable est attendu dans 3 semaines. Comment réagissez-vous ?",
    category: "Management",
    level: "Intermédiaire",
    recruiter_expectations: [
      "Capacité à gérer le stress et l'urgence",
      "Empathie envers le démissionnaire (ne pas brûler les ponts)",
      "Réorganisation rapide et pragmatique",
      "Communication transparente avec le reste de l'équipe"
    ],
    model_answer: {
      diagnostic: "Évaluer l'impact réel du départ (tâches critiques, transfert de connaissances) sans paniquer.",
      human: "Féliciter le collaborateur pour sa nouvelle opportunité et comprendre ses motivations pour identifier d'éventuels problèmes de rétention globaux.",
      action: "Organiser un plan de transition strict sur ses dernières semaines. Redistribuer les tâches critiques en interne et, si nécessaire, négocier un délai avec les parties prenantes.",
      follow_up: "Organiser un point avec le reste de l'équipe pour rassurer et maintenir la motivation, puis lancer le processus de remplacement."
    },
    tips: [
      "Ne montrez pas de rancœur envers le collaborateur.",
      "Ne promettez pas aux clients/direction que 'rien ne changera' sans avoir évalué la charge.",
      "Transformez cette crise en opportunité de responsabiliser d'autres membres de l'équipe."
    ],
    phrases: [
      "Ma priorité absolue est double : sécuriser le transfert de compétences et maintenir la dynamique de l'équipe.",
      "Je ferais preuve de transparence avec les parties prenantes sur les éventuels ajustements de périmètre."
    ]
  },
  {
    id: "sc_2",
    title: "Client furieux",
    description: "Un client majeur menace de rompre son contrat suite à un bug de production critique qui a bloqué ses ventes pendant 4 heures. Il exige de vous parler immédiatement.",
    category: "Crise",
    level: "Senior",
    recruiter_expectations: [
      "Prise de responsabilité (ne pas blâmer l'équipe dev)",
      "Écoute active et désamorçage de conflit",
      "Orientation solution immédiate",
      "Mise en place de mesures préventives"
    ],
    model_answer: {
      diagnostic: "Récupérer un maximum de faits techniques avant l'appel (cause, statut actuel, impact estimé).",
      human: "Laisser le client exprimer sa frustration sans l'interrompre. Présenter des excuses factuelles, claires et sans justification défensive.",
      action: "Expliquer ce qui a été fait pour résoudre le problème dans l'immédiat et proposer une compensation commerciale ou technique si justifié.",
      follow_up: "S'engager à fournir un rapport post-mortem (RCA) sous 48h avec les mesures préventives mises en place pour que cela ne se reproduise plus."
    },
    tips: [
      "Évitez de dire 'Je comprends' si vous n'avez pas de solution, dites plutôt 'Je prends la mesure de l'impact'.",
      "Ne cherchez pas de coupables en externe, vous représentez l'entreprise."
    ],
    phrases: [
      "Je l'appellerais immédiatement pour accuser réception du problème, avant même d'avoir toutes les réponses techniques.",
      "L'objectif n'est pas de nous justifier, mais de restaurer la confiance via un plan d'action préventif clair."
    ]
  }
];

export function SituationSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [mode, setMode] = useState<'passive' | 'active' | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [showPassiveModel, setShowPassiveModel] = useState(false);

  const reset = () => {
    setSelectedScenario(null);
    setMode(null);
    setUserAnswer("");
    setAiFeedback(null);
    setShowPassiveModel(false);
  };

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
          user_answer: userAnswer 
        }),
      });

      if (!response.ok) throw new Error("API call failed");
      const data = await response.json();
      setAiFeedback(data.feedback);

    } catch (error) {
      console.warn("Backend not ready or failed, using mock fallback...", error);
      // FALLBACK MOCK (Pour tester l'UI en attendant l'endpoint)
      setTimeout(() => {
        setAiFeedback({
          score: 75,
          strengths: ["Bonne prise d'initiative", "Approche pragmatique orientée solution"],
          weaknesses: ["Manque d'empathie explicite au début", "Le suivi post-crise est ignoré"],
          analysis: {
            diagnostic: "Vous avez bien cerné l'urgence, mais oublié d'évaluer l'impact complet avant d'agir.",
            human: "Il manque une phase de réassurance verbale. L'humain doit précéder l'opérationnel.",
            action: "L'action proposée est très solide et directement applicable.",
            follow_up: "Aucune mention de la prévention pour éviter que le problème ne se reproduise."
          },
          recommendations: ["Commencez toujours par accuser réception du problème émotionnel/humain.", "Ajoutez une phrase sur le post-mortem ou le reporting final."],
          improved_answer: "Je commencerais par rassurer l'équipe et écouter le client. Ensuite, je mettrais en place votre solution de contournement, tout en planifiant un point de suivi dans 48h pour valider la résolution définitive."
        });
        setIsSubmitting(false);
      }, 1500);
    }
  };

  // --- VUE LISTE ---
  if (!selectedScenario) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrainCircuit size={20} /> Entraînement aux Mises en Situation
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Sélectionnez un scénario réaliste fréquemment posé en entretien. Vous pourrez soit lire la méthode recommandée, soit vous entraîner avec notre IA.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {SCENARIOS.map(sc => (
            <div key={sc.id} onClick={() => setSelectedScenario(sc)} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }} onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>{sc.category}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Niveau : {sc.level}</span>
              </div>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{sc.title}</h4>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', flex: 1 }}>{sc.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 500, marginTop: 'auto' }}>
                Choisir ce scénario &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VUE DÉTAIL SCÉNARIO ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header Scénario */}
      <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', position: 'relative' }}>
        <button onClick={reset} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.9rem', padding: 0 }}>
          <ArrowLeft size={16} /> Changer de scénario
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>{selectedScenario.category}</span>
          <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>{selectedScenario.level}</span>
        </div>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{selectedScenario.title}</h3>
        <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', lineHeight: '1.6', fontStyle: 'italic' }}>"{selectedScenario.description}"</p>
      </div>

      {/* Choix du mode (si non sélectionné) */}
      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={() => setMode('passive')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
            <Eye size={32} color="var(--primary)" />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Mode Lecture</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Découvrir la structure attendue et la réponse modèle</span>
          </button>
          
          <button onClick={() => setMode('active')} style={{ background: 'var(--primary)', border: 'none', padding: '2rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Edit3 size={32} color="white" />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>Je m'entraîne (IA)</span>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Rédigez votre réponse et obtenez un feedback expert</span>
          </button>
        </div>
      )}

      {/* MODE PASSIF */}
      {mode === 'passive' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18} /> Ce que le recruteur évalue secrètement</h4>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {selectedScenario.recruiter_expectations.map((exp, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{exp}</li>)}
            </ul>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
            <button onClick={() => setShowPassiveModel(!showPassiveModel)} style={{ width: '100%', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 0, color: 'var(--text-main)', fontWeight: 600, fontSize: '1.1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BrainCircuit size={20} color="var(--primary)"/> Déroulé de la Réponse Idéale</span>
              {showPassiveModel ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showPassiveModel && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div><strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>1. Diagnostic</strong><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedScenario.model_answer.diagnostic}</p></div>
                <div><strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>2. Humain</strong><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedScenario.model_answer.human}</p></div>
                <div><strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>3. Action</strong><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedScenario.model_answer.action}</p></div>
                <div><strong style={{ color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>4. Suivi</strong><p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedScenario.model_answer.follow_up}</p></div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={18} /> Conseils / Pièges</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                {selectedScenario.tips.map((tip, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{tip}</li>)}
              </ul>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: '4px solid #8b5cf6' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={18} /> Phrases prêtes à l'emploi</h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', fontStyle: 'italic' }}>
                {selectedScenario.phrases.map((phrase, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>"{phrase}"</li>)}
              </ul>
            </div>
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
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button onClick={() => { setAiFeedback(null); setUserAnswer(""); }} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit3 size={16} /> Réessayer ce scénario
            </button>
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