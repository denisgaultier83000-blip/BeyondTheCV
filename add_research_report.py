import os

BASE_DIR = os.getcwd()
FRONTEND_DIR = os.path.join(BASE_DIR, "platform", "apps", "careeredge", "frontend")
SRC_DIR = os.path.join(FRONTEND_DIR, "src")
COMPONENTS_DIR = os.path.join(SRC_DIR, "components")

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"✅ Created/Updated: {path}")

def main():
    print(f"🎨 Adding ResearchReport Component in: {COMPONENTS_DIR}")

    # 1. Création du composant ResearchReport
    create_file(os.path.join(COMPONENTS_DIR, "ResearchReport.tsx"), r"""
import React from 'react';
import { LucideBuilding, LucideTarget, LucideLightbulb, LucideTrendingUp, LucideGlobe, LucideAlertTriangle } from 'lucide-react';

interface ResearchData {
  // Support Backend V1 & V2
  synthesis?: any;
  brief?: {
    overview?: string;
    culture?: string;
    challenges?: string;
    advice?: string[];
  };
  key_points?: string[];
  key_data?: string[];
  essential_articles?: { title: string; url: string }[];
  // Fallback pour compatibilité si la structure varie
  overview?: string;
  culture?: string;
  challenges?: string;
  advice?: string[];
}

interface ResearchReportProps {
  data: ResearchData | null;
  companyName?: string;
}

export function ResearchReport({ data, companyName }: ResearchReportProps) {
  console.log("📊 ResearchReport Data Received:", data); // [DEBUG] Vérifier la structure dans la console F12
  if (!data) return null;

  // Normalisation des données (gestion des variantes de structure JSON)
  const brief = data.brief || data.synthesis || {};
  
  const overview = brief.overview || data.overview || "Analyse indisponible.";
  const culture = brief.culture || data.culture || "Non spécifié.";
  const challenges = brief.challenges || data.challenges || "Non spécifié.";
  const advice = brief.advice || data.advice || [];
  const keyPoints = data.key_points || data.key_data || [];

  return (
    <div className="research-report" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* En-tête du rapport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div style={{ background: '#dbeafe', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <LucideBuilding size={24} color="#2563eb" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Rapport Stratégique : {companyName || 'Entreprise Cible'}</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analyse de marché & Culture</span>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="report-section">
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem 0', color: '#334155' }}>
          <LucideTarget size={18} color="#475569"/> Vue d'ensemble
        </h4>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>{overview}</p>
      </div>

      {/* Grille Culture & Défis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#0f172a' }}>🧬 Culture & Valeurs</h4>
          <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>{culture}</p>
        </div>
        <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ffedd5' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LucideTrendingUp size={16}/> Enjeux & Défis
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#9a3412', margin: 0 }}>{challenges}</p>
        </div>
      </div>

      {/* Conseils Stratégiques */}
      {advice.length > 0 && (
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LucideLightbulb size={18}/> Conseils pour l'entretien
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#14532d', fontSize: '0.9rem' }}>
            {advice.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Points Clés (Tags) */}
      {keyPoints.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {keyPoints.map((pt, idx) => (
            <span key={idx} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem', color: '#475569', border: '1px solid #e2e8f0' }}>
              {pt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
""")

    # 2. Mise à jour de App.tsx pour intégrer le polling multiple et le nouveau composant
    create_file(os.path.join(SRC_DIR, "App.tsx"), r"""
import React, { useEffect, useState } from 'react';
import { LucideRocket, LucideFileText, LucideSearch, LucideCheckCircle, LucideLoader2, LucideAlertCircle } from 'lucide-react';
import { Login } from './components/Login';
import { Header, Step } from './components/Header';
import { ResearchReport } from './components/ResearchReport';
import { DashboardProvider } from './context/DashboardContext';
import { DashboardView } from './components/DashboardView';
import './index.css';

const API_BASE = 'http://localhost:8000'; 
const LOGO_PATH = "/logoCE.png";

const CAREER_EDGE_STEPS: Step[] = [
  { id: 1, title: 'Import CV' },
  { id: 2, title: 'Cible & Analyse' },
  { id: 3, title: 'Dashboard' },
  { id: 4, title: 'Candidature' }
];

const MOCK_CV_DATA = {
  personal_info: { name: "Jean Dupont", email: "jean@test.com" },
  experiences: [{ role: "Senior Developer", company: "TechCorp", description: "Led a team of 5." }],
  educations: [],
  skills: ["Python", "React", "SQL"],
  target_job: "CTO",
  target_company: "Google",
  target_industry: "Tech",
  provider: "gemini"
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [targetLanguage, setTargetLanguage] = useState('French');
  
  // --- ÉTAT DU PIPELINE ---
  const [taskIds, setTaskIds] = useState<{ [key: string]: string } | null>(null);
  
  // États séparés pour chaque brique du dashboard
  const [cvResult, setCvResult] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [salaryResult, setSalaryResult] = useState<any>(null);
  
  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);

  // --- HANDLER : DÉMARRAGE ---
  const handleStartAnalysis = async () => {
    setGlobalStatus("STARTING");
    setError(null);
    try {
      // Fusion de la langue sélectionnée dans le Header avec les données du CV
      const payload = {
        ...MOCK_CV_DATA,
        target_language: targetLanguage
      };

      const response = await fetch(`${API_BASE}/cv/start-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      const data = await response.json();
      setTaskIds(data.tasks);
      setCurrentStep(3);
      setGlobalStatus("PROCESSING");
    } catch (err: any) {
      setError(err.message);
      setGlobalStatus("FAILED");
    }
  };

  // --- POLLING GÉNÉRIQUE ---
  const useTaskPolling = (taskId: string | undefined, onComplete: (data: any) => void) => {
    useEffect(() => {
      if (!taskId || globalStatus !== "PROCESSING") return;
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/cv/analysis-status/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "COMPLETED") {
              onComplete(data.result);
              clearInterval(interval);
            } else if (data.status === "FAILED") {
              clearInterval(interval); // On arrête mais on ne bloque pas tout le dashboard
            }
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskId, globalStatus]);
  };

  // Activation des pollings parallèles
  useTaskPolling(taskIds?.cv_analysis, setCvResult);
  useTaskPolling(taskIds?.market_research, setResearchResult);
  useTaskPolling(taskIds?.salary_estimation, setSalaryResult);

  // Vérification de fin globale (quand CV + Recherche sont là, on considère que c'est bon pour l'affichage principal)
  useEffect(() => {
    if (cvResult && researchResult && globalStatus === "PROCESSING") {
      setGlobalStatus("COMPLETED");
    }
  }, [cvResult, researchResult, globalStatus]);

  // --- RENDU ---
  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div className="step-container">
            <LucideFileText size={64} className="step-icon" />
            <h2>Importez votre CV</h2>
            <button className="btn-primary" onClick={() => setCurrentStep(2)}>Suivant</button>
          </div>
        );
      case 2:
        return (
          <div className="step-container">
            <LucideSearch size={64} className="step-icon" />
            <h2>Définition de la Cible</h2>
            <div className="mock-data-info">Cible: {MOCK_CV_DATA.target_job} chez {MOCK_CV_DATA.target_company}</div>
            {error && <div className="error-box"><LucideAlertCircle size={16}/> {error}</div>}
            <button className="btn-primary" onClick={handleStartAnalysis} disabled={globalStatus === "STARTING"}>
              {globalStatus === "STARTING" ? "Lancement..." : "Lancer l'Analyse"}
            </button>
          </div>
        );
      case 3: // DASHBOARD
        return (
          <DashboardProvider
            initialCvData={cvResult || MOCK_CV_DATA}
            initialResearchResult={researchResult}
            initialSalaryResult={salaryResult}
            initialGlobalStatus={globalStatus}
            onSetCurrentStep={setCurrentStep}
          >
            <DashboardView />
          </DashboardProvider>
        );
      default:
        return (
          <div className="step-container">
            <LucideCheckCircle size={64} className="step-icon success" />
            <h2>Candidature Prête !</h2>
            <button className="btn-outline" onClick={() => setCurrentStep(1)}>Recommencer</button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Header 
        isAuthenticated={isAuthenticated} 
        onLogout={() => setIsAuthenticated(false)} 
        steps={CAREER_EDGE_STEPS} 
        currentStep={currentStep}
        targetLanguage={targetLanguage}
        onLanguageChange={setTargetLanguage}
      />
      <main className="main-content">
        {!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <div className="card-container">{renderStepContent()}</div>}
      </main>
      <style>{`
        .step-container { text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; }
        .step-icon { color: #cbd5e1; margin-bottom: 1rem; } .step-icon.success { color: #22c55e; }
        .btn-primary { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: #1e293b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
        .btn-outline { background: transparent; border: 1px solid #cbd5e1; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.processing { background: #dbeafe; color: #1e40af; } .status-badge.completed { background: #dcfce7; color: #166534; }
        .results-grid { display: flex; flex-direction: column; gap: 1.5rem; }
        .result-card { background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
        .result-card.success { background: #f0fdf4; border-color: #bbf7d0; }
        .main-content { padding-top: 100px; padding-bottom: 2rem; max-width: 1280px; margin: 0 auto; padding-left: 2rem; padding-right: 2rem; }
        .card-container { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 500px; }
        .mock-data-info { margin-bottom: 1.5rem; color: #64748b; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.8rem; }
        .tasks-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .task-item { font-size: 0.9rem; color: #64748b; } .task-item.done { color: #166534; font-weight: 600; }
      `}</style>
    </div>
  );
}
export default App;
""")

if __name__ == "__main__":
    main()
