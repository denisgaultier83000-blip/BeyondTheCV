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
    print(f"🎨 Refactoring Header to be Generic (Shared Pattern) in: {FRONTEND_DIR}")

    # 1. HEADER GENERIC (Ne contient aucune donnée spécifique à une app)
    create_file(os.path.join(COMPONENTS_DIR, "Header.tsx"), r"""
import React from 'react';
import './Header.css';

export interface Step {
  id: number;
  title: string;
}

interface HeaderProps {
  // Config visuelle
  logoSrc: string;
  appName?: string; // Optionnel, si on veut afficher du texte à côté du logo
  
  // Auth
  isAuthenticated: boolean;
  onLogout: () => void;
  onLoginClick?: () => void;
  
  // Stepper (Données injectées par le parent)
  steps?: Step[];
  currentStep?: number;
  onStepClick?: (stepId: number) => void;
}

export function Header({ 
  logoSrc,
  appName,
  isAuthenticated, 
  onLogout, 
  onLoginClick,
  steps = [],
  currentStep = 1,
  onStepClick
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="header-main">
        
        {/* LOGO SECTION (Configurable) */}
        <div className="header-logo">
          <img src={logoSrc} alt={appName || "Logo"} className="logo-img" />
          {appName && <span className="app-name">{appName}</span>}
        </div>

        {/* STEPPER SECTION (S'affiche uniquement si des étapes sont fournies) */}
        {isAuthenticated && steps.length > 0 && (
          <div className="header-stepper">
            <div className="stepper-container">
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = (currentStep && step.id < currentStep);
                
                return (
                  <div
                    key={step.id}
                    className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => onStepClick && step.id <= (currentStep || 1) && onStepClick(step.id)}
                  >
                    <div className="step-circle">
                      {isCompleted ? '✓' : step.id}
                    </div>
                    <span className="step-label">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIONS SECTION */}
        <div className="header-actions">
          {isAuthenticated ? (
            <button onClick={onLogout} className="user-profile-btn" title="Se déconnecter">
              <span className="user-icon">👤</span>
              <span className="user-name">Mon Compte</span>
            </button>
          ) : (
            onLoginClick && (
              <button onClick={onLoginClick} className="login-link">
                Login
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
""")

    # 2. APP.TSX (C'est ici qu'on définit la "Personnalité" de l'app)
    create_file(os.path.join(SRC_DIR, "App.tsx"), r"""
import React, { useEffect, useState } from 'react';
import { LucideRocket, LucideFileText, LucideSearch, LucideCheckCircle } from 'lucide-react';
import { Login } from './components/Login';
import { Header, Step } from './components/Header';
import './index.css';

// --- CONFIGURATION SPECIFIQUE A CAREER EDGE ---
const APP_NAME = "CareerEdge"; // Laisser vide si le logo contient déjà le texte
const LOGO_PATH = "/logoCE.png";

// Définition du Workflow spécifique à cette app
const CAREER_EDGE_STEPS: Step[] = [
  { id: 1, title: 'Import CV' },
  { id: 2, title: 'Analyse IA' },
  { id: 3, title: 'Matching' },
  { id: 4, title: 'Candidature' }
];

function App() {
  const [status, setStatus] = useState("Connecting...");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    fetch('http://localhost:8001/')
      .then(res => res.json())
      .then(data => setStatus(data.message || data.status))
      .catch(err => setStatus("Backend unreachable"));
  }, []);

  // Rendu du contenu principal (Dashboard)
  const renderStepContent = () => {
    switch(currentStep) {
      case 1:
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <LucideFileText size={64} color="#cbd5e1" />
            <h2>Importez votre CV</h2>
            <p>Déposez votre CV ici pour commencer l'analyse CareerEdge.</p>
            <button onClick={() => setCurrentStep(2)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Lancer l'analyse
            </button>
          </div>
        );
      case 2:
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <LucideSearch size={64} color="#cbd5e1" />
            <h2>Analyse IA en cours...</h2>
            <p>Nos algorithmes décortiquent vos compétences.</p>
            <button onClick={() => setCurrentStep(3)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Voir les offres
            </button>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <LucideCheckCircle size={64} color="#22c55e" />
            <h2>Prêt à postuler !</h2>
            <button onClick={() => setCurrentStep(1)} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Nouvelle recherche
            </button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      
      {/* HEADER GENERIC : On lui passe la config spécifique */}
      <Header 
        logoSrc={LOGO_PATH}
        // appName={APP_NAME} // Décommenter si besoin d'afficher le texte
        isAuthenticated={isAuthenticated} 
        onLogout={() => setIsAuthenticated(false)}
        onLoginClick={!isAuthenticated ? () => {} : undefined}
        
        // Injection du Stepper spécifique
        steps={CAREER_EDGE_STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      <main style={{ paddingTop: '100px', paddingBottom: '2rem', maxWidth: '1280px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem' }}>
        {!isAuthenticated ? (
          <Login onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', minHeight: '400px' }}>
            {renderStepContent()}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f1f5f9', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              Backend API: <strong style={{ color: status.includes("unreachable") ? '#ef4444' : '#22c55e' }}>{status}</strong>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
""")

if __name__ == "__main__":
    main()
