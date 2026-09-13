import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Activity, Shield, Target, Mic, MessageSquare, Search, Eye, FileText, DollarSign, BrainCircuit, Sparkles, Lightbulb } from 'lucide-react';

interface LoadingScreenProps {
  tasks?: { [key: string]: string }; // e.g., { pitch: 'uuid1', gap_analysis: 'uuid2' }
  taskStatuses?: { [key: string]: string }; // e.g., { uuid1: 'COMPLETED', uuid2: 'RUNNING' }
  title?: string;
  description?: string;
}

const proTips = [
  { category: "Équilibre", text: "Le temps de parole idéal en entretien est de 50/50. Préparez des questions pour transformer le monologue en dialogue." },
  { category: "Négociation", text: "Ne répondez jamais directement à la question du salaire. Pivotez sur la valeur que vous apportez et les standards du marché." },
  { category: "Authenticité", text: "La question 'Quels sont vos défauts ?' est un test de conscience de soi. Préparez une réponse qui montre votre maturité." },
  { category: "Pitch", text: "Votre pitch ne doit pas résumer votre CV, mais être une bande-annonce de votre valeur ajoutée." },
  { category: "Structure", text: "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour prouver votre impact avec des faits." },
];

const progressSteps = [
  { key: 'market_research', label: 'Analyse du Marché & Entreprise', icon: <Search size={18} />, detail: 'Nous décryptons l\'actualité, la culture et les enjeux de votre cible.' },
  { key: 'gap_analysis', label: 'Adéquation au poste', icon: <Target size={18} />, detail: 'Vos forces et écarts sont croisés avec les exigences du poste.' },
  { key: 'recruiter_view', label: 'Simulation recruteur', icon: <Eye size={18} />, detail: 'On anticipe ce que verra l\'autre côté du bureau.' },
  { key: 'pitch', label: 'Pitch stratégique', icon: <Mic size={18} />, detail: 'Votre introduction est affûtée pour marquer dès les premières secondes.' },
  { key: 'questions', label: 'Questionnaire personnalisé', icon: <MessageSquare size={18} />, detail: 'Les questions les plus probables sont préparées avec des réponses clés.' },
  { key: 'flaw_coaching', label: 'Parades aux défauts', icon: <Shield size={18} />, detail: 'Vos points de vigilance sont transformés en réponses crédibles.' },
  { key: 'action_plan', label: 'Plan d\'action', icon: <FileText size={18} />, detail: 'Vos prochaines priorités sont hiérarchisées.' },
  { key: 'salary_estimation', label: 'Fourchette salariale', icon: <DollarSign size={18} />, detail: 'Nous calibrons votre positionnement sur le marché.' },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ tasks = {}, taskStatuses = {}, title, description }) => {
  const [currentTip, setCurrentTip] = useState(proTips[Math.floor(Math.random() * proTips.length)]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTip(proTips[Math.floor(Math.random() * proTips.length)]);
    }, 8000);
    return () => clearInterval(intervalId);
  }, []);

  const getStatus = (taskKey: string) => {
    const taskId = tasks[taskKey];
    if (!taskId) return 'PENDING';
    const status = taskStatuses[taskId];
    if (status === 'SUCCESS' || status === 'COMPLETED') return 'COMPLETED';
    if (status === 'RUNNING' || status === 'PROCESSING') return 'RUNNING';
    return 'PENDING';
  };

  const activeTasks = progressSteps.filter(task => tasks[task.key]);
  const completedCount = activeTasks.filter(t => getStatus(t.key) === 'COMPLETED').length;
  const progress = activeTasks.length > 0 ? Math.round((completedCount / activeTasks.length) * 100) : 0;

  return (
    <div className="loading-screen-container">
      <style>{`
        .loading-screen-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(180deg, var(--bg-body) 0%, var(--bg-card) 100%);
          color: var(--text-main);
          padding: 2rem;
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        .loading-card {
          width: 100%;
          max-width: 720px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 1.5rem;
          padding: 2.5rem;
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.12);
        }
        .loading-icon {
          width: 64px;
          height: 64px;
          border-radius: 1rem;
          background: linear-gradient(135deg, var(--primary) 0%, #7c5cfc 100%);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 25px -5px rgba(124, 92, 252, 0.35);
        }
        .loading-title {
          font-size: 1.6rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: var(--text-main);
        }
        .loading-subtitle {
          font-size: 1rem;
          color: var(--text-muted);
          max-width: 520px;
          margin: 0 auto 2rem auto;
          line-height: 1.5;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--bg-input);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, #7c5cfc 100%);
          border-radius: 999px;
          transition: width 0.6s ease;
        }
        .progress-text {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
          margin-bottom: 2rem;
        }
        .task-row {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.85rem;
          border-radius: 0.75rem;
          background: var(--bg-input);
          transition: all 0.3s ease;
        }
        .task-row.pending { opacity: 0.6; }
        .task-row.running { background: rgba(124, 92, 252, 0.08); border: 1px solid rgba(124, 92, 252, 0.2); }
        .task-row.completed { background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.15); }
        .task-icon {
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .task-content {
          flex: 1;
        }
        .task-label {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-main);
          margin-bottom: 0.15rem;
        }
        .task-detail {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .task-status {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .status-running { color: var(--primary); }
        .status-completed { color: var(--success); }
        .status-pending { color: var(--text-muted); }
        .tip-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          text-align: left;
          padding: 1rem;
          border-radius: 0.75rem;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .tip-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #d97706;
          margin-bottom: 0.25rem;
        }
        .tip-text {
          font-size: 0.9rem;
          color: var(--text-main);
          line-height: 1.45;
          margin: 0;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 1.2s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="loading-card">
        <div className="loading-icon">
          <Sparkles size={32} />
        </div>

        <h1 className="loading-title">{title || "Préparation de votre dossier"}</h1>
        <p className="loading-subtitle">{description || "Nous croisons votre profil avec les exigences du poste pour construire vos arguments, anticiper les questions et préparer votre stratégie."}</p>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-text">{activeTasks.length > 0 ? `${completedCount} / ${activeTasks.length} modules générés` : 'Analyse en cours...'}</div>

        <div className="task-list">
          {(activeTasks.length > 0 ? activeTasks : progressSteps.slice(0, 4)).map(task => {
            const status = activeTasks.length > 0 ? getStatus(task.key) : 'RUNNING';
            return (
              <div key={task.key} className={`task-row ${status.toLowerCase()}`}>
                <div className="task-icon" style={{ color: status === 'COMPLETED' ? 'var(--success)' : status === 'RUNNING' ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {status === 'COMPLETED' ? <CheckCircle2 size={18} /> : status === 'RUNNING' ? <Loader2 size={18} className="spin" /> : task.icon}
                </div>
                <div className="task-content">
                  <div className="task-label">{task.label}</div>
                  <div className="task-detail">{task.detail}</div>
                </div>
                <div className={`task-status status-${status.toLowerCase()}`}>
                  {status === 'RUNNING' && 'En cours'}
                  {status === 'COMPLETED' && 'Terminé'}
                  {status === 'PENDING' && 'En attente'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="tip-card">
          <Lightbulb size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 0.1 }} />
          <div>
            <div className="tip-label">Conseil du coach — {currentTip.category}</div>
            <p className="tip-text">{currentTip.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};