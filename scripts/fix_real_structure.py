import os
import json

# Détection des chemins
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PKG = os.path.join(BASE_DIR, "package.json")

# On cherche le bon dossier frontend (front ou Frontend)
FRONT_DIR = os.path.join(BASE_DIR, "front")
if not os.path.exists(FRONT_DIR) and os.path.exists(os.path.join(BASE_DIR, "Frontend")):
    FRONT_DIR = os.path.join(BASE_DIR, "Frontend")

FRONT_PKG = os.path.join(FRONT_DIR, "package.json")

print(f"🎯 Cible Frontend : {FRONT_DIR}")

# 1. Contenu pour package.json RACINE
root_content = {
  "name": "beyondthecv",
  "version": "1.0.0",
  "private": True,
  "workspaces": [
    "front",
    "backend"
  ],
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

# 2. Contenu pour package.json FRONTEND
front_content = {
  "name": "beyondthecv-frontend",
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

def write_json(path, content):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=2)
        print(f"✅ Réparé : {path}")
    except Exception as e:
        print(f"❌ Erreur sur {path}: {e}")

def write_file(path, content):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Créé : {path}")
    except Exception as e:
        print(f"❌ Erreur sur {path}: {e}")

# Exécution des réparations
write_json(ROOT_PKG, root_content)
write_json(FRONT_PKG, front_content)

# Configuration Vite
vite_content = """/// <reference types="vitest" />
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
write_file(os.path.join(FRONT_DIR, "vite.config.ts"), vite_content)

# Setup Tests
write_file(os.path.join(FRONT_DIR, "src", "setupTests.ts"), "import '@testing-library/jest-dom';")

# Test ResearchReport
test_content = """import { render, screen } from '@testing-library/react';
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
"""
write_file(os.path.join(FRONT_DIR, "src", "components", "__tests__", "ResearchReport.test.tsx"), test_content)