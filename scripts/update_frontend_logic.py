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
    print(f"🚀 Updating Frontend Logic in: {FRONTEND_DIR}")

    # 1. COMPOSANT GAP ANALYSIS
    create_file(os.path.join(COMPONENTS_DIR, "GapAnalysisModal.tsx"), r"""
import React from "react";
import { LucideX } from "lucide-react";

export interface GapAnalysisData {
  key_needs_from_job: string[];
  missing_gaps: string[];
  recommended_adjustments: string[];
  match_score: number;
}

interface GapAnalysisModalProps {
  data: GapAnalysisData;
  onClose: () => void;
}

export function GapAnalysisModal({ data, onClose }: GapAnalysisModalProps) {
  if (!data) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 50) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '900px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
          <LucideX size={24} color="#64748b" />
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Analyse d'Adéquation</h2>
            <p style={{ margin: '0.5rem 0 0', color: '#64748b' }}>Comparatif Profil vs Poste visé</p>
          </div>
          <div style={{ 
            background: getScoreColor(data.match_score), color: 'white', 
            padding: '0.5rem 1.5rem', borderRadius: '2rem', fontWeight: 'bold', fontSize: '1.5rem' 
          }}>
            {data.match_score}%
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          
          {/* Besoins */}
          <div>
            <h3 style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: '0.5rem', marginTop: 0 }}>🎯 Besoins du Poste</h3>
            <ul style={{ paddingLeft: '1.2rem', color: '#334155' }}>
              {data.key_needs_from_job?.map((item, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>)}
            </ul>
          </div>

          {/* Manques */}
          <div>
            <h3 style={{ color: '#ef4444', borderBottom: '2px solid #ef4444', paddingBottom: '0.5rem', marginTop: 0 }}>⚠️ Écarts Identifiés</h3>
            <ul style={{ paddingLeft: '1.2rem', color: '#334155' }}>
              {data.missing_gaps?.map((item, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>)}
            </ul>
          </div>

          {/* Conseils */}
          <div>
            <h3 style={{ color: '#16a34a', borderBottom: '2px solid #16a34a', paddingBottom: '0.5rem', marginTop: 0 }}>💡 Recommandations</h3>
            <ul style={{ paddingLeft: '1.2rem', color: '#334155' }}>
              {data.recommended_adjustments?.map((item, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
""")

    # 2. COMPOSANT PITCH DISPLAY
    create_file(os.path.join(COMPONENTS_DIR, "PitchDisplay.tsx"), r"""
import React from "react";
import { LucideMic } from "lucide-react";

export function PitchDisplay({ data }: { data: any }) {
  if (!data) return null;
  // Support structure v1 (flat) ou v2 (nested)
  const pitch = data.pitch || data;

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#0f172a' }}>
        <LucideMic size={20} color="#8b5cf6" /> Pitch d'Entretien
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <strong style={{ color: '#7c3aed', display: 'block', marginBottom: '0.25rem' }}>👋 Qui je suis (Accroche)</strong>
          <p style={{ margin: 0, color: '#4b5563' }}>{pitch.who_i_am}</p>
        </div>
        
        <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <strong style={{ color: '#7c3aed', display: 'block', marginBottom: '0.25rem' }}>🏆 Ce que j'ai fait (Preuve)</strong>
          <p style={{ margin: 0, color: '#4b5563' }}>{pitch.what_ive_done}</p>
        </div>

        <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <strong style={{ color: '#7c3aed', display: 'block', marginBottom: '0.25rem' }}>💎 Ce que j'apporte (Valeur)</strong>
          <p style={{ margin: 0, color: '#4b5563' }}>{pitch.what_i_bring}</p>
        </div>
      </div>
    </div>
  );
}
""")

    # 3. COMPOSANT QUESTIONS DISPLAY
    create_file(os.path.join(COMPONENTS_DIR, "QuestionsDisplay.tsx"), r"""
import React from "react";
import { LucideHelpCircle } from "lucide-react";

export function QuestionsDisplay({ data }: { data: any }) {
  if (!data) return null;
  const questions = data.questions || [];

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, color: '#0f172a' }}>
        <LucideHelpCircle size={20} color="#f59e0b" /> Questions Anticipées
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {questions.map((q: any, idx: number) => (
          <div key={idx} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>{q.category}</span>
            </div>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, color: '#334155' }}>{q.question}</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>💡 {q.suggested_answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
""")

    # 4. APP.TSX (Mise à jour majeure)
    create_file(os.path.join(SRC_DIR, "App.tsx"), r"""
import React, { useEffect, useState } from 'react';
import { LucideRocket, LucideFileText, LucideSearch, LucideCheckCircle, LucideLoader2, LucideAlertCircle, LucideLayoutDashboard, LucideArrowRight } from 'lucide-react';
import { Login } from './components/Login';
import { Header, Step } from './components/Header';
import { ResearchReport } from './components/ResearchReport';
import { GapAnalysisModal, GapAnalysisData } from './components/GapAnalysisModal';
import { PitchDisplay } from './components/PitchDisplay';
import { QuestionsDisplay } from './components/QuestionsDisplay';
import './index.css';

const API_BASE = 'http://localhost:8000'; 

const CAREER_EDGE_STEPS: Step[] = [
  { id: 1, title: 'Import CV' },
  { id: 2, title: 'Cible & Analyse' },
  { id: 3, title: 'Dashboard' },
  { id: 4, title: 'Candidature' }
];

// Données Mockées (Simulant le formulaire Page 1)
const MOCK_CV_DATA = {
  personal_info: { 
    first_name: "Jean", 
    last_name: "Dupont", 
    email: "jean@test.com",
    city: "Paris",
    country: "France"
  },
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
  const [taskIds, setTaskIds] = useState<{ [key: string]: string }>({});
  
  // Résultats
  const [cvResult, setCvResult] = useState<any>(null);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [salaryResult, setSalaryResult] = useState<any>(null);
  const [pitchResult, setPitchResult] = useState<any>(null);
  const [questionsResult, setQuestionsResult] = useState<any>(null);
  const [gapResult, setGapResult] = useState<GapAnalysisData | null>(null);
  
  const [globalStatus, setGlobalStatus] = useState<"IDLE" | "STARTING" | "PARTIAL_PROCESSING" | "PARTIAL_DONE" | "FULL_PROCESSING" | "FULL_DONE" | "FAILED">("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [showGapModal, setShowGapModal] = useState(false);

  // --- HANDLER : DÉMARRAGE PARTIEL (Page 2) ---
  const handlePartialStart = async () => {
    setGlobalStatus("STARTING");
    setError(null);
    try {
      const payload = {
        ...MOCK_CV_DATA,
        target_language: targetLanguage,
        is_partial_start: true // Trigger Page 2
      };

      const response = await fetch(`${API_BASE}/cv/start-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
      const data = await response.json();
      
      setTaskIds(prev => ({ ...prev, ...data.tasks }));
      setCurrentStep(3);
      setGlobalStatus("PARTIAL_PROCESSING");
    } catch (err: any) {
      setError(err.message);
      setGlobalStatus("FAILED");
    }
  };

  // --- HANDLER : DÉMARRAGE COMPLET (Page 8) ---
  const handleFullStart = async () => {
    setGlobalStatus("FULL_PROCESSING");
    try {
      const payload = {
        ...MOCK_CV_DATA,
        target_language: targetLanguage,
        is_partial_start: false // Trigger Page 8
      };

      const response = await fetch(`${API_BASE}/cv/start-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
      const data = await response.json();
      
      setTaskIds(prev => ({ ...prev, ...data.tasks }));
    } catch (err: any) {
      setError(err.message);
      setGlobalStatus("FAILED");
    }
  };

  // --- POLLING GÉNÉRIQUE ---
  const useTaskPolling = (taskId: string | undefined, onComplete: (data: any) => void) => {
    useEffect(() => {
      if (!taskId) return;
      
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE}/cv/analysis-status/${taskId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "COMPLETED" || data.status === "SUCCESS") {
              onComplete(data.result);
              clearInterval(interval);
            } else if (data.status === "FAILED") {
              clearInterval(interval);
            }
          }
        } catch (e) { console.error("Polling error", e); }
      }, 2000);
      return () => clearInterval(interval);
    }, [taskId]);
  };

  // Activation des pollings
  useTaskPolling(taskIds.market_research, setResearchResult);
  useTaskPolling(taskIds.salary_estimation, setSalaryResult);
  useTaskPolling(taskIds.cv_analysis, setCvResult);
  useTaskPolling(taskIds.pitch, setPitchResult);
  useTaskPolling(taskIds.questions, setQuestionsResult);
  useTaskPolling(taskIds.gap_analysis, setGapResult);

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
            <button className="btn-primary" onClick={handlePartialStart} disabled={globalStatus === "STARTING"}>
              {globalStatus === "STARTING" ? "Lancement..." : "Lancer l'Analyse"}
            </button>
          </div>
        );
      case 3: // DASHBOARD
        return (
          <div className="dashboard-container">
            <div className="dashboard-header">
              <h2><LucideLayoutDashboard className="inline-icon"/> Dashboard Analyse</h2>
              
              {/* Bouton Finaliser Profil (Apparaît si on a fait que le partiel) */}
              {!cvResult && globalStatus !== "FULL_PROCESSING" && (
                <button className="btn-accent" onClick={handleFullStart}>
                  Finaliser le Profil (Page 8) <LucideArrowRight size={16}/>
                </button>
              )}
            </div>

            <div className="results-grid">
              
              {/* COLONNE GAUCHE : RECHERCHE & SALAIRE */}
              <div className="grid-col">
                {/* Recherche Marché */}
                <div className="result-card">
                  {researchResult ? (
                    <ResearchReport data={researchResult} companyName={MOCK_CV_DATA.target_company} />
                  ) : (
                    <div className="loading-placeholder"><LucideLoader2 className="spin"/> Recherche Marché en cours...</div>
                  )}
                </div>

                {/* Salaire */}
                <div className="result-card">
                  <h3>💰 Estimation Salaire</h3>
                  {salaryResult ? (
                    <div>
                      <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a'}}>
                        {salaryResult.salary_range?.low} - {salaryResult.salary_range?.high} {salaryResult.currency}
                      </div>
                      <p style={{fontSize: '0.9rem', color: '#64748b'}}>{salaryResult.commentary}</p>
                    </div>
                  ) : (
                    <div className="loading-placeholder"><LucideLoader2 className="spin"/> Calcul en cours...</div>
                  )}
                </div>
              </div>

              {/* COLONNE DROITE : CV, PITCH, QUESTIONS */}
              <div className="grid-col">
                
                {/* Analyse CV */}
                <div className="result-card">
                  <h3>📄 Analyse CV</h3>
                  {cvResult ? (
                    <div style={{color: '#16a34a'}}>✅ Analyse terminée. Score: {cvResult.analysis?.global_score}/10</div>
                  ) : globalStatus === "FULL_PROCESSING" ? (
                    <div className="loading-placeholder"><LucideLoader2 className="spin"/> Analyse CV en cours...</div>
                  ) : (
                    <div className="waiting-placeholder">En attente de finalisation...</div>
                  )}
                </div>

                {/* Gap Analysis */}
                <div className="result-card">
                  <h3>⚖️ Adéquation (Gap)</h3>
                  {gapResult ? (
                    <button className="btn-outline" onClick={() => setShowGapModal(true)}>Voir l'analyse détaillée ({gapResult.match_score}%)</button>
                  ) : globalStatus === "FULL_PROCESSING" ? (
                    <div className="loading-placeholder"><LucideLoader2 className="spin"/> Calcul des écarts...</div>
                  ) : (
                    <div className="waiting-placeholder">En attente...</div>
                  )}
                </div>

                {/* Pitch */}
                {pitchResult && <PitchDisplay data={pitchResult} />}

                {/* Questions */}
                {questionsResult && <QuestionsDisplay data={questionsResult} />}

              </div>
            </div>

            {/* MODALE GAP ANALYSIS */}
            {showGapModal && gapResult && (
              <GapAnalysisModal data={gapResult} onClose={() => setShowGapModal(false)} />
            )}

          </div>
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
        .btn-accent { background: #8b5cf6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .btn-outline { background: white; border: 1px solid #cbd5e1; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; color: #475569; }
        .spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; }
        .results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .grid-col { display: flex; flex-direction: column; gap: 1.5rem; }
        .result-card { background: #f8fafc; padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
        .main-content { padding-top: 100px; padding-bottom: 2rem; max-width: 1280px; margin: 0 auto; padding-left: 2rem; padding-right: 2rem; }
        .card-container { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); min-height: 500px; }
        .mock-data-info { margin-bottom: 1.5rem; color: #64748b; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.8rem; }
        .loading-placeholder { color: #64748b; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
        .waiting-placeholder { color: #94a3b8; font-style: italic; font-size: 0.9rem; }
        @media (max-width: 768px) { .results-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
export default App;
""")

if __name__ == "__main__":
    main()