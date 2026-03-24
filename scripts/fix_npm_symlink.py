import os
import json
import shutil
import stat

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PKG = os.path.join(BASE_DIR, "package.json")
FRONT_DIR = os.path.join(BASE_DIR, "front")
FRONT_PKG = os.path.join(FRONT_DIR, "package.json")

def on_rm_error(func, path, exc_info):
    """Force la suppression des fichiers en lecture seule."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

def force_remove(path):
    if not os.path.exists(path):
        return
    print(f"🗑️  Suppression : {path}")
    try:
        if os.path.isfile(path) or os.path.islink(path):
            os.chmod(path, stat.S_IWRITE)
            os.remove(path)
        elif os.path.isdir(path):
            shutil.rmtree(path, onerror=on_rm_error)
    except Exception as e:
        print(f"⚠️  Erreur suppression {path}: {e}")

def main():
    print("🔧 REPARATION CONFIGURATION NPM (FIX SYMLINK)")

    # 1. Nettoyage préventif
    force_remove(os.path.join(BASE_DIR, "node_modules"))
    force_remove(os.path.join(BASE_DIR, "package-lock.json"))
    force_remove(os.path.join(FRONT_DIR, "node_modules"))
    force_remove(os.path.join(FRONT_DIR, "package-lock.json"))

    # 2. Correction package.json RACINE
    # On limite les workspaces à "front" uniquement pour simplifier et éviter le lien vers backend (inutile pour npm)
    if os.path.exists(ROOT_PKG):
        with open(ROOT_PKG, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # On s'assure que workspaces est propre
        data["workspaces"] = ["front"]
        
        with open(ROOT_PKG, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print("✅ Root package.json corrigé (workspace=['front']).")

    # 3. Correction package.json FRONTEND
    # On uniformise le nom pour éviter le conflit 'beyondthecv-frontend' vs 'careeredge-frontend'
    if os.path.exists(FRONT_PKG):
        with open(FRONT_PKG, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        current_name = data.get("name")
        # On utilise le nom officiel du projet
        target_name = "beyondthecv-frontend"
        
        if current_name != target_name:
            data["name"] = target_name
            with open(FRONT_PKG, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print(f"✅ Front package.json renommé ('{current_name}' -> '{target_name}').")
        else:
            print("✅ Front package.json nom correct.")

    print("\n🛑 CAUSE DU PROBLEME 'EISDIR':")
    print("   NPM essaie de créer un lien symbolique (Symlink) pour le workspace 'front'.")
    print("   Sur Windows, cette action nécessite souvent des droits Administrateur.")

    print("\n👉 PROCEDURE A SUIVRE MAINTENANT :")
    print("   1. Fermez tous vos terminaux (VS Code inclus si possible).")
    print("   2. Ouvrez PowerShell en faisant : Clic droit > Exécuter en tant qu'administrateur.")
    print(f"   3. Allez dans le dossier : cd {BASE_DIR}")
    print("   4. Lancez : npm install")

if __name__ == "__main__":
    main()
