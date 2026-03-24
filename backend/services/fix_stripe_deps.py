import os
import json

# Chemins possibles pour le frontend
POSSIBLE_PATHS = [
    os.path.join(os.getcwd(), "front", "package.json"),
    os.path.join(os.getcwd(), "frontend", "package.json"),
    os.path.join(os.getcwd(), "platform", "apps", "careeredge", "frontend", "package.json")
]

STRIPE_DEPS = {
    "@stripe/stripe-js": "^3.0.0",
    "@stripe/react-stripe-js": "^2.5.0"
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
        
        for dep, version in STRIPE_DEPS.items():
            if dep not in dependencies:
                print(f"   ➕ Ajout de {dep}")
                dependencies[dep] = version
                modified = True
            else:
                print(f"   ✅ {dep} déjà présent.")
        
        if modified:
            data["dependencies"] = dependencies
            # Tri pour la propreté du fichier
            data["dependencies"] = dict(sorted(dependencies.items()))
            
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"💾 {path} mis à jour avec succès.")
            return True
        else:
            print(f"👌 Aucune modification nécessaire pour {path}.")
            return True
            
    except Exception as e:
        print(f"❌ Erreur sur {path}: {e}")
        return False

def main():
    print("🔍 Recherche du package.json pour ajout de Stripe...")
    for path in POSSIBLE_PATHS:
        if update_package_json(path):
            break
    print("\n👉 N'oubliez pas de lancer 'npm install' (ou de rebuilder Docker) !")

if __name__ == "__main__":
    main()