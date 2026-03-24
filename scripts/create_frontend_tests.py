import os

BASE_DIR = os.getcwd()
FRONTEND_DIR = os.path.join(BASE_DIR, "platform", "apps", "careeredge", "frontend")
SRC_DIR = os.path.join(FRONTEND_DIR, "src")
TESTS_DIR = os.path.join(SRC_DIR, "components", "__tests__")

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"✅ Created: {path}")

def main():
    print(f"🧪 Generating Frontend Tests in: {TESTS_DIR}")

    # 1. Configuration Vitest (Mise à jour de vite.config.ts)
    # On écrase le fichier existant pour inclure la config 'test'
    create_file(os.path.join(FRONTEND_DIR, "vite.config.ts"), r"""
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true
  }
})
""")

    # 2. Setup Tests (pour les matchers Jest-DOM)
    create_file(os.path.join(SRC_DIR, "setupTests.ts"), r"""
import '@testing-library/jest-dom';
""")

    # 3. Test: Header (UI & Props)
    create_file(os.path.join(TESTS_DIR, "Header.test.tsx"), r"""
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { describe, it, expect, vi } from 'vitest';

describe('Header Component', () => {
  const mockSteps = [
    { id: 1, title: 'Step 1' },
    { id: 2, title: 'Step 2' }
  ];

  it('renders login button when not authenticated', () => {
    // On passe une fonction vide pour onLoginClick si le composant l'attend
    render(<Header isAuthenticated={false} onLogout={() => {}} onLoginClick={() => {}} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders user profile and stepper when authenticated', () => {
    render(
      <Header 
        isAuthenticated={true} 
        onLogout={() => {}} 
        steps={mockSteps} 
        currentStep={1} 
      />
    );
    expect(screen.getByText('Mon Compte')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('calls onLogout when logout button is clicked', () => {
    const handleLogout = vi.fn();
    render(<Header isAuthenticated={true} onLogout={handleLogout} />);
    
    // Le bouton peut être trouvé par son titre (title="Se déconnecter") ou son texte
    const logoutBtn = screen.getByTitle('Se déconnecter');
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
""")

    # 4. Test: Login (Interaction Formulaire)
    create_file(os.path.join(TESTS_DIR, "Login.test.tsx"), r"""
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../Login';
import { describe, it, expect, vi } from 'vitest';

describe('Login Component', () => {
  it('renders login form inputs', () => {
    render(<Login onLogin={() => {}} />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('handles form submission and loading state', async () => {
    const handleLogin = vi.fn();
    render(<Login onLogin={handleLogin} />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    });

    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);

    // Vérifie que le bouton passe en état de chargement
    expect(screen.getByText(/Signing in/i)).toBeInTheDocument();

    // Attend que le timeout simulé dans le composant soit terminé
    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });
});
""")

    # 5. Test: GapAnalysisModal (Rendu conditionnel & Données)
    create_file(os.path.join(TESTS_DIR, "GapAnalysisModal.test.tsx"), r"""
import { render, screen, fireEvent } from '@testing-library/react';
import { GapAnalysisModal } from '../GapAnalysisModal';
import { describe, it, expect, vi } from 'vitest';

const mockData = {
  match_score: 85,
  key_needs_from_job: ['Python', 'React'],
  missing_gaps: ['Docker'],
  recommended_adjustments: ['Learn Docker']
};

describe('GapAnalysisModal', () => {
  it('renders score and lists correctly', () => {
    render(<GapAnalysisModal data={mockData} onClose={() => {}} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
    // Vérifie la présence d'un titre de section
    expect(screen.getByText(/Besoins du Poste/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<GapAnalysisModal data={mockData} onClose={handleClose} />);
    
    // On clique sur le bouton de fermeture (souvent le premier bouton ou une icône X)
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]); 
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
""")

if __name__ == "__main__":
    main()