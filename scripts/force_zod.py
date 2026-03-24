"""
Nom : force_zod.py
Description : Injecte Zod dans le package.json et nettoie le cache Vite.
"""
import os
import json
import shutil

BASE_DIR = os.getcwd()
FRONT_DIR = os.path.join(BASE_DIR, "front")
PKG_PATH = os.path.join(FRONT_DIR, "package.json")
VITE_CACHE = os.path.join(FRONT_DIR, "node_modules", ".vite")

def main():
    print("🚑 RÉPARATION D'URGENCE : ZOD")
    
    # 1. Vérification et Injection dans package.json
    if not os.path.exists(PKG_PATH):
        print(f"❌ Impossible de trouver : {PKG_PATH}")
        return

    with open(PKG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    deps = data.get("dependencies", {})
    
    if "zod" in deps:
        print(f"✅ 'zod' est déjà présent (version {deps['zod']}).")
    else:
        print("➕ Ajout de 'zod' aux dépendances...")
        deps["zod"] = "^3.22.4"
        data["dependencies"] = dict(sorted(deps.items()))
        
        with open(PKG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("💾 package.json sauvegardé.")

    # 2. Nettoyage du cache Vite (souvent responsable des erreurs persistantes)
    if os.path.exists(VITE_CACHE):
        print("🧹 Suppression du cache Vite (node_modules/.vite)...")
        try:
            shutil.rmtree(VITE_CACHE)
            print("✅ Cache nettoyé.")
        except Exception as e:
            print(f"⚠️ Impossible de supprimer le cache (peut-être verrouillé) : {e}")

if __name__ == "__main__":
    main()
