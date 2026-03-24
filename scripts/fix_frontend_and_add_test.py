import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "platform", "apps", "careeredge", "frontend")
TESTS_DIR = os.path.join(FRONTEND_DIR, "src", "components", "__tests__")

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        if isinstance(content, dict):
            json.dump(content, f, indent=2)
        else:
            f.write(content.strip())
    print(f"✅ Created/Updated: {path}")

def main():
    print("🔧 Starting Repair & Test Generation...")

    # 1. Réparation du package.json RACINE (Gestion des workspaces)
    # On s'assure qu'il pointe vers le bon dossier frontend
    root_package = os.path.join(BASE_DIR, "package.json")
    create_file(root_package, {
        "name": "beyondthecv",
        "version": "1.0.0",
        "private": True,
        "workspaces": ["platform/apps/careeredge/frontend", "backend"],
        "scripts": {
            "test": "echo \"Error: no test specified\" && exit 1"
        }
    })

    # 2. Réparation du package.json FRONTEND (Dépendances Vitest incluses)
    frontend_package = os.path.join(FRONTEND_DIR, "package.json")
    create_file(frontend_package, {
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
    })

    # 3. Création du test pour ResearchReport
    create_file(os.path.join(TESTS_DIR, "ResearchReport.test.tsx"), r"""
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

  it('renders culture and challenges', () => {
    render(<ResearchReport data={mockData} />);
    expect(screen.getByText("Innovative culture")).toBeInTheDocument();
    expect(screen.getByText("Scaling challenges")).toBeInTheDocument();
  });

  it('renders advice list', () => {
    render(<ResearchReport data={mockData} />);
    expect(screen.getByText("Be yourself")).toBeInTheDocument();
    expect(screen.getByText("Ask questions")).toBeInTheDocument();
  });

  it('renders key points tags', () => {
    render(<ResearchReport data={mockData} />);
    expect(screen.getByText("Point 1")).toBeInTheDocument();
    expect(screen.getByText("Point 2")).toBeInTheDocument();
  });
});
""")

if __name__ == "__main__":
    main()