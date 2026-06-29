import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  // ... autres imports
  DollarSign,
  Target, 
  Award, 
  RefreshCw,
  BrainCircuit,
  MessageSquare,
  Settings2,
  History,
  Lightbulb,
  Lock,
  TrendingUp,
  Mic,
  Send,
  CheckCircle2,
  AlertCircle,
  Dumbbell
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // [NOUVEAU]
import { DashboardCard } from './DashboardCard';
import Questionnaire from './Questionnaire';
import { API_BASE_URL } from '../config';
import { authenticatedFetch } from '../utils/auth';
import { useDashboard } from './DashboardContext';
import { VocalPitchTrainer } from './VocalPitchTrainer';
import { RechargeModal } from './RechargeModal';

// --- API Functions ---

interface EvaluatePayload {
  theme: string;
  question_type: string;
  question_text: string;
  user_answer: string;
  interview_format?: string;
  stress_level?: string;
  target_language?: string;
}

const evaluateAnswerAPI = async (payload: EvaluatePayload) => {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.detail || "Erreur lors de l'évaluation de la réponse.");
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
};

export default function TrainingTab() {
  const dashboardContext = useDashboard();
  if (!dashboardContext) return null;

  const { cvData, updateFormData, actionPlanResult, quotas, fetchQuotas } = dashboardContext;
  const [score, setScore] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [themeScores, setThemeScores] = useState<Record<string, number>>({});
  const [themeCounts, setThemeCounts] = useState<Record<string, number>>({});
  const [selectedTheme, setSelectedTheme] = useState('Gestion de crise');
  const [selectedType, setSelectedType] = useState('MES');
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // UX Interactive (Aide & Suggestion)
  const [activeQuestion, setActiveQuestion] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  
  const queryClient = useQueryClient(); // [NOUVEAU]

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
      const [trainRes, intRes] = await Promise.all([
        authenticatedFetch(`${API_BASE_URL}/api/cv/training/history`),
        authenticatedFetch(`${API_BASE_URL}/api/cv/interview/history`)
      ]);
      if (trainRes.ok) {
        const data = await trainRes.json();
        setTrainingHistory(data.history || []);
      }
      if (intRes.ok) {
        const data = await intRes.json();
        setInterviewHistory(data.history || []);
      }
    } catch (err) {
      console.error("Erreur récupération historique", err);
    }
  };

  // Charger les statistiques globales au montage
  useEffect(() => {
    fetchStats();
    fetchHistory();
    if (fetchQuotas) fetchQuotas();
  }, [fetchQuotas]);

  const refreshAllStats = () => {
    fetchStats();
    if (fetchQuotas) fetchQuotas();
  };

  // [NOUVEAU] Remplacement de handleGenerate par useMutation
  const generateQuestionMutation = useMutation({
    mutationFn: (variables: { theme: string; type: string; lang: string }) => {
      return authenticatedFetch(`${API_BASE_URL}/api/cv/training/generate-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: variables.theme, question_type: variables.type, count: 1, target_language: variables.lang })
      }).then(res => {
        if (!res.ok) {
          if (res.status === 402) setShowRechargeModal(true);
          return res.json().then(err => { throw new Error(err.detail || "Erreur de génération") });
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      // La mutation a réussi, on met à jour l'UI
      const newQ = {
        id: Date.now().toString(),
        category: selectedTheme,
        type: selectedType,
        question: data.questions[0].text,
        advice: data.questions[0].advice,
        suggested_answer: data.questions[0].suggested_answer,
      };
      setActiveQuestion(newQ);
      setShowHint(false);
      setShowSuggestion(false);
      setUserAnswer('');
      setFeedback(null);
      queryClient.invalidateQueries({ queryKey: ['quotas'] }); // Invalide et rafraîchit les quotas
    }
  });

  // [NOUVEAU] Remplacement de handleEvaluate par useMutation
  const evaluateAnswerMutation = useMutation({
    mutationFn: evaluateAnswerAPI,
    onSuccess: (data) => {
      // La mutation a réussi !
      setFeedback(data.feedback); // Met à jour l'UI avec le feedback
      refreshAllStats(); // Rafraîchit les stats globales et les quotas
      
      const completedQ = { ...activeQuestion, userAnswer, evaluation: data.feedback, feedback: data.feedback };
      
      // Injection silencieuse dans le cache local pour que l'historique "Questionnaire" l'affiche avec couleurs et /10
      try {
        localStorage.setItem(`training_${activeQuestion.id}`, JSON.stringify({
          userAnswer: userAnswer,
          evaluation: data.feedback,
          feedback: data.feedback
        }));
      } catch(e) { console.error("Erreur cache", e); }

      // Met à jour l'historique local et global
      const updatedHistory = [...trainingHistory, completedQ];
      setTrainingHistory(updatedHistory);
      if (updateFormData) updateFormData("trainingQuestions", updatedHistory);
    },
    onError: (error: any) => {
      // Gestion centralisée des erreurs
      if (error.status === 402) {
        setShowRechargeModal(true);
      }
      // L'erreur est automatiquement disponible dans `evaluateAnswerMutation.error` pour l'affichage
    }
  });

  const handleEvaluate = () => {
    if (!userAnswer.trim() || !activeQuestion) return;
    const requiredQuota = activeQuestion.type === 'MES' ? (quotas?.mes ?? 0) : (quotas?.qa ?? 0);
    if (requiredQuota <= 0) {
      setShowRechargeModal(true);
      return;
    }
    evaluateAnswerMutation.mutate({
      theme: activeQuestion.category,
      question_type: activeQuestion.type,
      question_text: activeQuestion.question,
      user_answer: userAnswer,
      interview_format: cvData?.interview_format,
      stress_level: cvData?.stress_level,
      target_language: cvData?.target_language || 'fr'
    });
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

  // --- FUSION DES HISTORIQUES (PITCH + MES + ENTRETIEN + NEGO) ---
  const negoHistory = cvData?.negotiationHistory ?? [];
  const unifiedHistory = [
    ...trainingHistory.map((h: any) => ({ ...h, source: 'training', date: new Date(h.created_at || Date.now()) })),
    ...interviewHistory.map((h: any) => ({ ...h, source: 'interview', category: "Question d'entretien", type: 'Classique', userAnswer: h.user_answer, score: h.score, date: new Date(h.created_at || Date.now()) })),
    ...negoHistory.map((h: any) => ({ ...h, source: 'negotiation', category: 'Négociation Salariale', type: 'Négo', question: "Défense des prétentions salariales", score: h.feedback?.score || 0, date: new Date(h.date || Date.now()) }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calcul des stats Négo
  const negoTotalSessions = negoHistory.length;
  const negoScore = negoTotalSessions > 0 ? Math.round(negoHistory.reduce((acc: number, h: any) => acc + (h.feedback?.score || 0), 0) / negoTotalSessions) : 0;

  // Calcul des stats spécifiques Q/A (Training Q&A + Interview Q&A)
  const trainingQACount = totalSessions - oralPitchSessions;
  let trainingQATotalScore = 0;
  if (trainingQACount > 0) {
    Object.entries(themeScores).forEach(([theme, tScore]) => {
      if (theme !== 'Pitch Vocal') trainingQATotalScore += tScore * (themeCounts[theme] ?? 0);
    });
  }
  const interviewQACount = interviewHistory.length;
  const interviewQATotalScore = interviewHistory.reduce((acc: number, h: any) => acc + (h.score || 0), 0);

  const qaTotalSessions = trainingQACount + interviewQACount;
  const qaScore = qaTotalSessions > 0 ? Math.round((trainingQATotalScore + interviewQATotalScore) / qaTotalSessions) : 0;

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

  const upcomingModules = actionPlanResult?.training_plan?.filter((t: any) => t.stage === 'upcoming') || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* --- CONSEIL STRATÉGIQUE (IA) --- */}
      {actionPlanResult?.strategy_advice && (
        <DashboardCard title="Conseil Stratégique d'Entretien" icon={<Lightbulb size={24} />}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderLeft: '4px solid var(--primary)', padding: '1.5rem', borderRadius: '0.5rem' }}>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
              {actionPlanResult.strategy_advice}
            </p>
          </div>
        </DashboardCard>
      )}

      {/* --- MODULES D'ANTICIPATION --- */}
      {upcomingModules.length > 0 && (
        <DashboardCard title="Anticipation & Prochains Rounds" icon={<TrendingUp size={24} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingModules.map((mod: any, idx: number) => (
              <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', opacity: 0.8 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--text-muted)' }}>
                  <Lock size={24} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontWeight: 700, fontSize: '1.05rem' }}>{mod.module}</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>{mod.focus}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* --- NOUVEAU : AFFICHAGE DES QUOTAS PAR MODULE --- */}
      <DashboardCard title="Simulations Notées Disponibles" icon={<Dumbbell size={24} />}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Votre pack inclut un nombre de simulations évaluées par l'IA pour chaque type d'exercice. L'entraînement libre (lecture des questions et réponses) est illimité.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { key: 'qa', label: "Questions / Réponses", icon: <MessageSquare size={20} /> },
            { key: 'pitch', label: "Pitch Vocal", icon: <Mic size={20} /> },
            { key: 'mes', label: "Mises en Situation", icon: <BrainCircuit size={20} /> },
            { key: 'negotiation', label: "Négociation Salariale", icon: <DollarSign size={20} /> },
          ].map(q => {
            const remaining = quotas?.[q.key] ?? 0;
            const hasQuota = remaining > 0;
            return (
              <div key={q.key} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: `1px solid ${hasQuota ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ color: hasQuota ? 'var(--primary)' : 'var(--danger-text)' }}>
                  {q.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: hasQuota ? 'var(--text-main)' : 'var(--danger-text)' }}>
                    {remaining}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {q.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {(quotas?.qa === 0 || quotas?.pitch === 0 || quotas?.mes === 0 || quotas?.negotiation === 0) && <button onClick={() => setShowRechargeModal(true)} className="btn-primary" style={{ marginTop: '1.5rem', alignSelf: 'center' }}>Recharger des simulations</button>}
      </DashboardCard>

      {/* --- SECTION STATISTIQUES --- */}
      <DashboardCard title="Statistiques Globales & Évolution" icon={<Activity size={24} />}>
        {/* TOP STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Questions & Situations</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: qaTotalSessions > 0 ? getScoreColor(qaScore) : 'var(--text-muted)', margin: '0.5rem 0' }}>
              {qaTotalSessions > 0 ? (qaScore / 10).toFixed(1) : '-'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{qaTotalSessions} session{qaTotalSessions > 1 ? 's' : ''}</div>
          </div>
          
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pitch Vocal</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: oralPitchScore > 0 ? getScoreColor(oralPitchScore) : 'var(--text-muted)', margin: '0.5rem 0' }}>
              {oralPitchScore > 0 ? (oralPitchScore / 10).toFixed(1) : '-'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{oralPitchSessions} session{oralPitchSessions > 1 ? 's' : ''}</div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Négociation Salariale</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: negoTotalSessions > 0 ? getScoreColor(negoScore) : 'var(--text-muted)', margin: '0.5rem 0' }}>
              {negoTotalSessions > 0 ? (negoScore / 10).toFixed(1) : '-'} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{negoTotalSessions} session{negoTotalSessions > 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* CHART EVOLUTION */}
        {unifiedHistory.length > 0 && (
          <div style={{ marginBottom: '2.5rem', height: '260px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '1rem' }}><TrendingUp size={18} color="var(--primary)" /> Votre courbe de progression globale</h4>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...unifiedHistory].reverse().map(item => {
                  const fb = item.feedback || item.evaluation;
                  return {
                    name: item.date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
                    score: fb?.score ?? item.score ?? 0,
                    exercice: item.type === 'Vocal' ? 'Pitch' : item.source === 'negotiation' ? 'Négociation' : 'Simulation'
                  }
              })} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScoreGlobal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  formatter={(value: any, name: any, props: any) => [`${value}/100`, props.payload.exercice]}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem' }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorScoreGlobal)" activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* THEMES DETAILS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Détail par thématique</h4>
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
          
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} /> Conseil du Coach
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Votre tableau de bord consolide désormais tous vos entraînements (Pitch, Mises en situation, Négociation de salaire). Identifiez vos points faibles et ciblez vos prochaines sessions sur ces thématiques pour équilibrer votre profil avant l'entretien !
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* --- NOUVEAU MODULE : ENTRAÎNEMENT AU PITCH VOCAL --- */}
      <VocalPitchTrainer 
        targetJob={cvData?.target_job || cvData?.target_role_primary || "Candidat"} 
        targetCompany={cvData?.target_company}
        jobDescription={cvData?.job_description}
        onSuccess={refreshAllStats} 
      />

      {/* --- SECTION CONFIGURATION --- */}
      <DashboardCard title="Nouvelle Session d'Entraînement" icon={<Settings2 size={24} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {generateQuestionMutation.isError && !activeQuestion && !generateQuestionMutation.isPending && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-text)' }}>
              <AlertCircle size={18} /> {generateQuestionMutation.error.message}
            </div>
          )}

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
              onClick={() => {
                const requiredQuota = selectedType === 'MES' ? (quotas?.mes ?? 0) : (quotas?.qa ?? 0);
                if (requiredQuota > 0) {
                  generateQuestionMutation.mutate({ theme: selectedTheme, type: selectedType, lang: cvData?.target_language || 'fr' });
                } else {
                  setShowRechargeModal(true);
                }
              }}
              disabled={generateQuestionMutation.isPending}
              className="btn-primary"
              style={{ padding: '1rem 3rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              {generateQuestionMutation.isPending ? <RefreshCw className="spin" size={20} /> : <Target size={20} />}
              {generateQuestionMutation.isPending ? "Génération par l'IA..." : "Générer mon défi"}
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

          {evaluateAnswerMutation.isError && !evaluateAnswerMutation.isPending && (
            <div style={{ marginBottom: '1rem', color: 'var(--danger-text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {evaluateAnswerMutation.error.message}
            </div>
          )}

          {(() => {
            const remainingForType = activeQuestion.type === 'MES' ? (quotas?.mes ?? 0) : (quotas?.qa ?? 0);
            return (
              <button onClick={handleEvaluate} disabled={evaluateAnswerMutation.isPending || !userAnswer.trim()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {evaluateAnswerMutation.isPending ? <RefreshCw className="spin" size={18} /> : <MessageSquare size={18} />} {evaluateAnswerMutation.isPending ? "Évaluation..." : `Soumettre & Évaluer (${remainingForType} restants)`}
              </button>
            );
          })()}

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
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
      {!activeQuestion && unifiedHistory.length > 0 && (
        <DashboardCard title="Archives & Corrections" icon={<History size={24} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {unifiedHistory.map((q: any, index: number) => {
              const fb = q.feedback || q.evaluation;
              const rawScore = fb?.score ?? q.score ?? 0;
              const score10 = rawScore / 10;
              const scoreColor = score10 >= 8 ? '#10b981' : score10 >= 5 ? '#f59e0b' : '#ef4444';

              return (
                <div key={q.id || index} style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)', borderLeft: `6px solid ${scoreColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>{q.category} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>• {q.type}</span></div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.25rem' }}>{q.date.toLocaleString('fr-FR')} • Source : {q.source === 'training' ? 'Entraînement Libre' : q.source === 'interview' ? 'Questions Entretien' : 'Négociation'}</div>
                    </div>
                    <div style={{ background: scoreColor, color: 'white', padding: '0.25rem 1rem', borderRadius: '1rem', fontWeight: 'bold', fontSize: '1.1rem', alignSelf: 'center' }}>
                      {score10.toFixed(1)} / 10
                    </div>
                  </div>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1rem' }}><strong>Question :</strong> {q.question}</p>
                  <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}><strong>Votre réponse :</strong> {q.userAnswer || q.user_answer}</p>
                  </div>
                  {fb && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                      <div>
                        <strong style={{ color: '#10b981' }}>{q.type === 'Vocal' ? 'Métriques :' : 'Points forts :'}</strong>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>{Array.isArray(fb.strengths) ? fb.strengths.map((s: any, i: number) => <li key={i}>{renderSafeText(s)}</li>) : <li>{renderSafeText(fb.strengths)}</li>}</ul>
                      </div>
                      <div>
                        <strong style={{ color: '#ef4444' }}>{q.type === 'Vocal' ? 'Diagnostic :' : 'À améliorer :'}</strong>
                        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem' }}>{Array.isArray(fb.weaknesses) ? fb.weaknesses.map((w: any, i: number) => <li key={i}>{renderSafeText(w)}</li>) : <li>{renderSafeText(fb.weaknesses)}</li>}</ul>
                      </div>
                      {fb.improved_answer && (
                        <div style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem', borderRadius: '0.5rem', borderLeft: '3px solid #10b981', marginTop: '0.5rem' }}>
                          <strong style={{ color: '#10b981' }}>Réponse du Coach :</strong>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-main)', fontStyle: 'italic' }}>"{fb.improved_answer}"</p>
                        </div>
                      )}
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