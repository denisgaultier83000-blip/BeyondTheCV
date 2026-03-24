import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PKG = os.path.join(BASE_DIR, "package.json")
FRONT_DIR = os.path.join(BASE_DIR, "front")
FRONT_PKG = os.path.join(FRONT_DIR, "package.json")
BACKEND_PKG = os.path.join(BASE_DIR, "backend", "package.json")

def write_json(path, content):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(content, f, indent=2)
        print(f"✅ Écrit : {path}")
    except Exception as e:
        print(f"❌ Erreur écriture {path}: {e}")

def main():
    print("🔧 Correction de la configuration NPM...")

    # 1. Correction du package.json RACINE
    # On retire 'backend' des workspaces car c'est du Python
    root_content = {
        "name": "beyondthecv",
        "version": "1.0.0",
        "private": True,
        "workspaces": ["front"], 
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
    write_json(ROOT_PKG, root_content)

    # 2. Correction du package.json FRONTEND
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
    write_json(FRONT_PKG, front_content)

    # 3. Nettoyage du backend (Suppression package.json si existant)
    if os.path.exists(BACKEND_PKG):
        try:
            os.remove(BACKEND_PKG)
            print(f"🗑️ Supprimé : {BACKEND_PKG} (Inutile pour Python)")
        except Exception as e:
            print(f"⚠️ Impossible de supprimer {BACKEND_PKG}: {e}")

if __name__ == "__main__":
    main()
