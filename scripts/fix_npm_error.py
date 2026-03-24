import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "platform", "apps", "careeredge", "frontend")
ROOT_PACKAGE = os.path.join(BASE_DIR, "package.json")
FRONTEND_PACKAGE = os.path.join(FRONTEND_DIR, "package.json")

def repair_json_file(path, default_content):
    """Vérifie si un fichier JSON est vide ou invalide et le répare."""
    is_damaged = False
    if not os.path.exists(path):
        print(f"⚠️  Fichier manquant : {path}")
        is_damaged = True
    else:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    print(f"⚠️  Fichier vide détecté : {path}")
                    is_damaged = True
                else:
                    json.loads(content)
        except json.JSONDecodeError:
            print(f"⚠️  JSON invalide détecté : {path}")
            is_damaged = True

    if is_damaged:
        print(f"🔧 Réparation de {path}...")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default_content, f, indent=2)
        print("✅ Fichier réparé.")
    else:
        print(f"✅ Fichier valide : {path}")

def main():
    print("🔍 Diagnostic des fichiers package.json...")

    # 1. Contenu par défaut pour la racine (si corrompu)
    root_content = {
        "name": "beyondthecv",
        "version": "1.0.0",
        "private": True,
        "workspaces": ["platform/apps/careeredge/frontend"], # Correction du chemin workspace
        "scripts": {
            "test": "echo \"Error: no test specified\" && exit 1"
        }
    }
    repair_json_file(ROOT_PACKAGE, root_content)

    # 2. Contenu par défaut pour le frontend (AVEC les dépendances de test)
    frontend_content = {
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
    repair_json_file(FRONTEND_PACKAGE, frontend_content)

    print("\n🚀 PRÊT ! Lancez maintenant ces commandes :")
    print(f"cd {os.path.relpath(FRONTEND_DIR, BASE_DIR)}")
    print("npm install")
    print("npm test")

if __name__ == "__main__":
    main()