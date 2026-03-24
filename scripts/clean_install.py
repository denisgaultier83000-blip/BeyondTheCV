import os
import shutil
import time
import subprocess
import stat

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
NODE_MODULES = os.path.join(BASE_DIR, "node_modules")
PACKAGE_LOCK = os.path.join(BASE_DIR, "package-lock.json")
FRONT_NODE_MODULES = os.path.join(BASE_DIR, "front", "node_modules")
FRONT_PACKAGE_LOCK = os.path.join(BASE_DIR, "front", "package-lock.json")

def on_rm_error(func, path, exc_info):
    """
    Gestionnaire d'erreur pour shutil.rmtree.
    Force l'écriture sur les fichiers en lecture seule (problème courant git/npm sur Windows).
    """
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception as e:
        # On ignore l'erreur ici, la boucle de retry s'en chargera
        pass

def force_remove(path):
    """Tente de supprimer un fichier ou dossier avec plusieurs essais."""
    if not os.path.exists(path):
        return
    
    print(f"🗑️ Suppression de {path}...")
    for i in range(3):
        try:
            if os.path.isfile(path) or os.path.islink(path):
                os.chmod(path, stat.S_IWRITE)
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path, onerror=on_rm_error)
            
            if not os.path.exists(path):
                print(f"✅ Supprimé : {path}")
                return
        except Exception as e:
            print(f"⚠️ Essai {i+1}/3 échoué (Verrouillé ?): {e}")
            time.sleep(2) # Attendre que le fichier se libère
    
    print(f"❌ ÉCHEC FATAL sur {path}. Un processus (VS Code ?) bloque ce fichier.")

def main():
    print("🧹 NETTOYAGE AGRESSIF V2 (Permissions Windows)")
    
    # 1. Tenter de tuer les processus node.js fantômes (Windows)
    try:
        subprocess.run(["taskkill", "/F", "/IM", "node.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("💀 Processus Node.js tués (s'il y en avait).")
    except Exception:
        pass

    # 2. Suppressions
    force_remove(NODE_MODULES)
    force_remove(PACKAGE_LOCK)
    force_remove(FRONT_NODE_MODULES)
    force_remove(FRONT_PACKAGE_LOCK)

    if os.path.exists(NODE_MODULES):
        print("\n🛑 ATTENTION : node_modules n'a pas pu être supprimé entièrement.")
        print("👉 SOLUTION : Fermez VS Code complètement et relancez ce script depuis un terminal PowerShell externe.")
    else:
        print("\n✨ Environnement parfaitement propre.")
        print("👉 Vous pouvez maintenant lancer : npm install")

if __name__ == "__main__":
    main()