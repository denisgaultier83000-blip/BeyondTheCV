"""
Nom : fix_beyondthecv_project.py
But : Restaurer les dépendances exactes de BeyondTheCV (Front & Back)
      et ignorer tout ce qui concerne CareerEdge.
"""
import os
import json

# Chemins stricts vers BeyondTheCV
BASE_DIR = os.getcwd()
FRONT_DIR = os.path.join(BASE_DIR, "front")
BACK_DIR = os.path.join(BASE_DIR, "backend")

# 1. Configuration FRONTEND (package.json)
# Basé sur vos imports dans Candidate.tsx et Payment.tsx
FRONT_PACKAGE = {
  "name": "beyondthecv-frontend",
  "private": True,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.330.0",
    # Validation
    "zod": "^3.22.4",
    # Navigation (Candidate.tsx)
    "react-router-dom": "^6.22.0",
    # Internationalisation (Candidate.tsx)
    "i18next": "^23.10.0",
    "react-i18next": "^14.0.5",
    "i18next-browser-languagedetector": "^7.2.0",
    "i18next-http-backend": "^2.5.0",
    # Paiement (Payment.tsx)
    "@stripe/stripe-js": "^3.0.0",
    "@stripe/react-stripe-js": "^2.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.56",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.4",
    "typescript": "^5.2.2"
  }
}

# 2. Configuration BACKEND (requirements.txt)
# Basé sur vos imports dans cv_generator.py, tasks.py, payment.py
BACK_REQUIREMENTS = """
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-multipart>=0.0.9
pydantic>=2.6.0
python-dotenv>=1.0.1
requests>=2.31.0
aiosqlite>=0.19.0
# IA
openai>=1.12.0
google-genai>=0.3.0
# Documents
pypdf>=4.0.1
python-docx>=1.1.0
jinja2>=3.1.3
# Paiement
stripe>=8.1.0
# Websockets
websockets>=12.0
# Securite (Auth & JWT)
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
email-validator>=2.1.0
# Base de donnees PostgreSQL
psycopg2-binary>=2.9.9
"""

def write_file(path, content):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            if isinstance(content, dict):
                json.dump(content, f, indent=2)
            else:
                f.write(content.strip())
        print(f"✅ Réparé : {path}")
    except Exception as e:
        print(f"❌ Erreur sur {path}: {e}")

def main():
    print("🚑 DÉBOGAGE SYSTÉMIQUE : BEYOND THE CV")
    print(f"   Racine : {BASE_DIR}")

    # 1. Réparation Frontend
    if os.path.exists(FRONT_DIR):
        pkg_path = os.path.join(FRONT_DIR, "package.json")
        write_file(pkg_path, FRONT_PACKAGE)
    else:
        print(f"❌ Dossier 'front' introuvable dans {BASE_DIR}")

    # 2. Réparation Backend
    if os.path.exists(BACK_DIR):
        req_path = os.path.join(BACK_DIR, "requirements.txt")
        write_file(req_path, BACK_REQUIREMENTS)
    else:
        print(f"❌ Dossier 'backend' introuvable dans {BASE_DIR}")

    print("\n👉 ACTIONS IMMÉDIATES REQUISES :")
    print("   1. FRONTEND : cd front && npm install")
    print("   2. BACKEND  : pip install -r backend/requirements.txt")
    print("                 (ou docker-compose build --no-cache si Docker)")

if __name__ == "__main__":
    main()
