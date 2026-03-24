import os
import json

# Chemins absolus basés sur l'emplacement du script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PKG = os.path.join(BASE_DIR, "package.json")
FRONTEND_DIR = os.path.join(BASE_DIR, "front")
FRONTEND_PKG = os.path.join(FRONTEND_DIR, "package.json")
TESTS_DIR = os.path.join(FRONTEND_DIR, "src", "components", "__tests__")

# 1. Contenu pour package.json RACINE
root_content = {
    "name": "beyondthecv",
    "version": "1.0.0",
    "private": True,
    "workspaces": ["front"],
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1"
    }
}

# 2. Contenu pour package.json FRONTEND
frontend_content = {
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

# 3. Contenu pour le test ResearchReport
research_test_content = r"""
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
  it('renders nothing when data is null', () => {
    const { container } = render(<ResearchReport data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders company name and overview', () => {
    render(<ResearchReport data={mockData} companyName="TechCorp" />);
    expect(screen.getByText(/Rapport Stratégique : TechCorp/i)).toBeInTheDocument();
    expect(screen.getByText("Company overview text")).toBeInTheDocument();
  });
});
"""

def write_file(path, content, is_json=False):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            if is_json:
                json.dump(content, f, indent=2)
            else:
                f.write(content.strip())
        size = os.path.getsize(path)
        print(f"✅ Écrit : {path} ({size} octets)")
    except Exception as e:
        print(f"❌ Erreur sur {path}: {e}")

if __name__ == "__main__":
    print("🚑 Démarrage de la réparation d'urgence...")
    write_file(ROOT_PKG, root_content, is_json=True)
    write_file(FRONTEND_PKG, frontend_content, is_json=True)
    write_file(os.path.join(TESTS_DIR, "ResearchReport.test.tsx"), research_test_content)
    print("🏁 Terminé. Vous pouvez relancer npm install.")