import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Activity, Shield, Target, Mic, MessageSquare, Search, Eye, FileText, DollarSign, BrainCircuit } from 'lucide-react';

interface LoadingScreenProps {
  tasks: { [key: string]: string }; // e.g., { pitch: 'uuid1', gap_analysis: 'uuid2' }
  taskStatuses: { [key: string]: string }; // e.g., { uuid1: 'COMPLETED', uuid2: 'RUNNING' }
}

const proTips = [
  "Le saviez-vous ? Le temps de parole idéal en entretien est de 50/50. Préparez des questions pour transformer le monologue en dialogue.",
  "Conseil du Coach : Ne répondez jamais directement à la question du salaire. Pivotez toujours sur la valeur que vous apportez et les standards du marché.",
  "La question 'Quels sont vos défauts ?' n'est pas un piège, mais un test de conscience de soi. Préparez une réponse qui montre votre maturité.",
  "Votre pitch de présentation ne doit pas être un résumé de votre CV, mais une bande-annonce de votre valeur ajoutée.",
  "Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer vos réponses et prouver votre impact avec des faits.",
];

const hackerLines = [
  "Connecting to market intelligence database...",
  "Parsing job description for hidden keywords...",
  "Cross-referencing skills with industry benchmarks...",
  "Simulating recruiter's first impression...",
  "Analyzing company's strategic challenges...",
  "Identifying potential personality fit...",
  "Compiling behavioral questions...",
  "Structuring STAR method examples...",
  "Calibrating salary estimation models...",
  "Finalizing strategic battle plan...",
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ tasks, taskStatuses }) => {
  const [currentTip, setCurrentTip] = useState('');
  const [currentHackerLine, setCurrentHackerLine] = useState('');

  useEffect(() => {
    // Choisir un conseil au hasard au montage
    setCurrentTip(proTips[Math.floor(Math.random() * proTips.length)]);

    // Simuler la console "hacker"
    let lineIndex = 0;
    const intervalId = setInterval(() => {
      setCurrentHackerLine(hackerLines[lineIndex % hackerLines.length]);
      lineIndex++;
    }, 2500); // Change de ligne toutes les 2.5 secondes

    return () => clearInterval(intervalId);
  }, []);

  const taskList = [
    { key: 'market_research', label: 'Analyse du Marché & Entreprise', icon: <Search size={18} /> },
    { key: 'gap_analysis', label: 'Calcul de l\'adéquation au poste', icon: <Target size={18} /> },
    { key: 'recruiter_view', label: 'Simulation de la vue du recruteur', icon: <Eye size={18} /> },
    { key: 'pitch', label: 'Génération du pitch stratégique', icon: <Mic size={18} /> },
    { key: 'questions', label: 'Création du questionnaire personnalisé', icon: <MessageSquare size={18} /> },
    { key: 'flaw_coaching', label: 'Préparation des parades aux défauts', icon: <Shield size={18} /> },
    { key: 'action_plan', label: 'Élaboration du plan de bataille', icon: <FileText size={18} /> },
    { key: 'salary_estimation', label: 'Estimation de la fourchette salariale', icon: <DollarSign size={18} /> },
  ];

  const activeTasks = taskList.filter(task => tasks[task.key]);

  const getStatus = (taskKey: string) => {
    const taskId = tasks[taskKey];
    if (!taskId) return 'PENDING';
    const status = taskStatuses[taskId];
    if (status === 'SUCCESS' || status === 'COMPLETED') return 'COMPLETED';
    if (status === 'RUNNING' || status === 'PROCESSING') return 'RUNNING';
    return 'PENDING';
  };

  return (
    <div className="loading-screen-container">
      <style>{`
        .loading-screen-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--bg-body);
          color: var(--text-main);
          padding: 2rem;
          text-align: center;
          animation: fadeIn 0.5s ease-out;
        }
        .loading-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .loading-subtitle {
          font-size: 1.1rem;
          color: var(--text-muted);
          max-width: 600px;
          margin-bottom: 3rem;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
          width: 100%;
          max-width: 1000px;
          background: var(--bg-card);
          padding: 2rem;
          border-radius: 1rem;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }
        .task-checklist {
          text-align: left;
        }
        .task-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }
        .task-item:last-child {
          border-bottom: none;
        }
        .task-status {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .status-pending { color: var(--text-muted); }
        .status-running { color: var(--primary); }
        .status-completed { color: var(--success); }
        
        .console-container {
          background: #0F2650;
          color: #F7FAFC;
          border-radius: 0.75rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .hacker-text {
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          border-right: .15em solid #6DBEF7;
          animation: typing 2.5s steps(40, end), blink-caret .75s step-end infinite;
        }
        .pro-tip {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-size: 0.85rem;
          color: #A0AEC0;
          font-style: italic;
        }
        @keyframes typing { from { width: 0 } to { width: 100% } }
        @keyframes blink-caret { from, to { border-color: transparent } 50% { border-color: #6DBEF7; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .analysis-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <h1 className="loading-title"><BrainCircuit size={32} /> Initialisation du Poste de Commandement...</h1>
      <p className="loading-subtitle">Votre profil est en cours d'analyse par nos modèles stratégiques. Nous préparons vos arguments, anticipons les questions pièges et décodons le marché pour vous.</p>

      <div className="analysis-grid">
        <div className="task-checklist">
          <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Modules en cours de génération :</h3>
          {activeTasks.map(task => {
            const status = getStatus(task.key);
            return (
              <div key={task.key} className="task-item" style={{ opacity: status === 'PENDING' ? 0.5 : 1 }}>
                {task.icon}
                <span>{task.label}</span>
                <div className={`task-status status-${status.toLowerCase()}`}>
                  {status === 'RUNNING' && <Loader2 size={16} className="spin" />}
                  {status === 'COMPLETED' && <CheckCircle2 size={16} />}
                  {status === 'PENDING' ? 'En attente' : (status === 'RUNNING' ? 'En cours...' : 'Terminé')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="console-container">
          <div>
            <div style={{ color: '#6DBEF7', marginBottom: '0.5rem' }}>&gt; AI CORE: RUNNING DIAGNOSTICS...</div>
            <div className="hacker-text">{currentHackerLine}</div>
          </div>
          <div className="pro-tip">
            <strong>Conseil du Coach :</strong> {currentTip}
          </div>
        </div>
      </div>
    </div>
  );
};