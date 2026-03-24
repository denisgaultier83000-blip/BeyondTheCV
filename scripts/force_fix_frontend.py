import os
import json

# Chemin absolu vers le fichier problématique
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_FILE = os.path.join(BASE_DIR, "platform", "apps", "careeredge", "frontend", "package.json")

# Contenu correct du package.json
content = {
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

try:
    os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)
    print(f"✅ Fichier réparé avec succès : {TARGET_FILE}")
except Exception as e:
    print(f"❌ Erreur lors de l'écriture : {e}")