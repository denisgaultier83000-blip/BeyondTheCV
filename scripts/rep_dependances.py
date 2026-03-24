"""
Nom du fichier : fix_missing_deps.py
Description : Ajoute react-router-dom et i18next au package.json du frontend.
"""
import os
import json

# Chemins possibles pour le frontend selon l'historique du projet
POSSIBLE_PATHS = [
    os.path.join(os.getcwd(), "front", "package.json"),
    os.path.join(os.getcwd(), "frontend", "package.json"),
    os.path.join(os.getcwd(), "platform", "apps", "careeredge", "frontend", "package.json")
]

# Dépendances manquantes à injecter
MISSING_DEPS = {
    "react-router-dom": "^6.22.0",
    "i18next": "^23.10.0",
    "react-i18next": "^14.0.5",
    "i18next-browser-languagedetector": "^7.2.0",
    "i18next-http-backend": "^2.5.0"
}

def update_package_json(path):
    if not os.path.exists(path):
        return False
    
    print(f"🔧 Analyse de : {path}")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        dependencies = data.get("dependencies", {})
        modified = False
        
        for dep, version in MISSING_DEPS.items():
            if dep not in dependencies:
                print(f"   ➕ Ajout de {dep}")
                dependencies[dep] = version
                modified = True
            else:
                print(f"   ✅ {dep} déjà présent.")
        
        if modified:
            data["dependencies"] = dependencies
            # Tri alphabétique pour la propreté
            data["dependencies"] = dict(sorted(dependencies.items()))
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"💾 {path} mis à jour avec succès.")
            return True
        else:
            print(f"👌 Aucune modification nécessaire pour {path}.")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors de la lecture/écriture de {path}: {e}")
        return False

def main():
    print("🔍 Recherche du fichier package.json du Frontend...")
    found = False
    for path in POSSIBLE_PATHS:
        if update_package_json(path):
            found = True
            # On continue au cas où il y aurait des doublons de structure à nettoyer/fixer
            
    if not found:
        print("❌ Aucun package.json valide trouvé dans les dossiers standards (front/, frontend/, platform/...).")
        print("   Vérifiez que vous êtes à la racine du projet.")
    else:
        print("\n✅ Correctif appliqué.")
        print("👉 ÉTAPE SUIVANTE OBLIGATOIRE :")
        print("   1. Si vous êtes en local : lancez 'npm install'")
        print("   2. Si vous êtes sous Docker : relancez le build (docker-compose build --no-cache)")

if __name__ == "__main__":
    main()
