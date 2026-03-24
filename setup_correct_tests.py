import os
import shutil
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WRONG_DIR = os.path.join(BASE_DIR, "platform")
# D'après votre package.json racine, le dossier s'appelle "front"
CORRECT_FRONTEND = os.path.join(BASE_DIR, "front") 
ROOT_PKG = os.path.join(BASE_DIR, "package.json")

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        if isinstance(content, dict):
            json.dump(content, f, indent=2)
        else:
            f.write(content.strip())
    print(f"✅ Fichier créé/mis à jour : {path}")

def main():
    global CORRECT_FRONTEND # Declare intent to modify the global variable

    print("🧹 NETTOYAGE ET CONFIGURATION CORRECTE")
    
    # 1. Suppression du mauvais dossier
    if os.path.exists(WRONG_DIR):
        try:
            shutil.rmtree(WRONG_DIR)
            print(f"🗑️ Dossier incorrect supprimé : {WRONG_DIR}")
        except Exception as e:
            print(f"⚠️ Impossible de supprimer {WRONG_DIR} : {e}")
            print("   (Veuillez le supprimer manuellement)")

    # 2. Vérification du dossier 'front'
    if not os.path.exists(CORRECT_FRONTEND):
        # Fallback si vous l'avez nommé 'frontend'
        alt = os.path.join(BASE_DIR, "frontend")
        if os.path.exists(alt):
            CORRECT_FRONTEND = alt
            print(f"ℹ️ Dossier 'frontend' trouvé au lieu de 'front'. Utilisation de : {CORRECT_FRONTEND}")
        else:
            print(f"⚠️ Dossier 'front' introuvable. Création de {CORRECT_FRONTEND}...")
            os.makedirs(CORRECT_FRONTEND, exist_ok=True)

    print(f"🎯 Cible confirmée : {CORRECT_FRONTEND}")

    # 3. Réparation du package.json RACINE
    root_content = {
        "name": "beyondthecv",
        "version": "1.0.0",
        "private": True,
        "workspaces": ["front", "backend"],
        "scripts": {
            "dev": "npm run dev --prefix front",
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "dependencies": {
            "i18next": "^25.8.14",
            "i18next-browser-languagedetector": "^8.2.1",
            "i18next-http-backend": "^3.0.2",
            "lucide-react": "^0.577.0",
            "react-i18next": "^16.5.5"
        }
    }
    create_file(ROOT_PKG, root_content)

    # 4. Configuration package.json (Frontend)
    pkg_path = os.path.join(CORRECT_FRONTEND, "package.json")
    
    front_content = {
        "name": "careeredge-frontend",
        "private": True,
        "version": "0.0.1",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "preview": "vite preview",
            "test": "vitest",
            "coverage": "vitest run --coverage"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "lucide-react": "^0.330.0"
        },
        "devDependencies": {
            "@types/react": "^18.2.56",
            "@types/react-dom": "^18.2.19",
            "@vitejs/plugin-react": "^4.2.1",
            "vite": "^5.1.4",
            "vitest": "^1.3.1",
            "jsdom": "^24.0.0",
            "@testing-library/react": "^14.2.1",
            "@testing-library/jest-dom": "^6.4.2",
            "@testing-library/user-event": "^14.5.2"
        }
    }
    create_file(pkg_path, front_content)

    # 5. Configuration Vite
    vite_path = os.path.join(CORRECT_FRONTEND, "vite.config.ts")
    vite_content = r"""
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
"""
    create_file(vite_path, vite_content)

    # 6. Setup Tests
    src_dir = os.path.join(CORRECT_FRONTEND, "src")
    os.makedirs(src_dir, exist_ok=True)
    create_file(os.path.join(src_dir, "setupTests.ts"), "import '@testing-library/jest-dom';")

    # 7. Création du test ResearchReport
    tests_dir = os.path.join(src_dir, "components", "__tests__")
    create_file(os.path.join(tests_dir, "ResearchReport.test.tsx"), r"""
import { render, screen } from '@testing-library/react';
import { ResearchReport } from '../ResearchReport';
import { describe, it, expect } from 'vitest';

const mockData = {
  brief: {
    overview: "Company overview text",
    culture: "Innovative culture",
    challenges: "Scaling challenges",
    advice: ["Be yourself", "Ask questions"]
  },
  key_points: ["Point 1", "Point 2"]
};

describe('ResearchReport Component', () => {
  it('renders company name and overview', () => {
    render(<ResearchReport data={mockData} companyName="TechCorp" />);
    expect(screen.getByText(/Rapport Stratégique : TechCorp/i)).toBeInTheDocument();
  });
});
""")

if __name__ == "__main__":
    main()