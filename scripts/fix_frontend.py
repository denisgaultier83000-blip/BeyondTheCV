import os
import shutil

# Chemin vers le dossier frontend dans la nouvelle structure
BASE_DIR = os.getcwd()
FRONTEND_TARGET = os.path.join(BASE_DIR, "platform", "apps", "beyondthecv", "frontend")

def fix_structure():
    print(f"🕵️  Inspection de : {FRONTEND_TARGET}")

    if not os.path.exists(FRONTEND_TARGET):
        print("❌ Le dossier frontend n'existe pas ! Vérifie ta migration.")
        return

    # 1. Vérifie si package.json est déjà au bon endroit
    if os.path.exists(os.path.join(FRONTEND_TARGET, "package.json")):
        print("✅ package.json est bien présent à la racine du dossier.")
        print("👉 Le problème vient probablement de Docker. Redémarre Docker Desktop.")
        return

    print("⚠️  package.json introuvable à la racine. Recherche de sous-dossiers imbriqués...")

    # 2. Recherche d'un sous-dossier qui contiendrait les fichiers (ex: frontend/front ou frontend/frontend)
    subdirs = [d for d in os.listdir(FRONTEND_TARGET) if os.path.isdir(os.path.join(FRONTEND_TARGET, d))]
    
    for subdir in subdirs:
        nested_path = os.path.join(FRONTEND_TARGET, subdir)
        nested_package = os.path.join(nested_path, "package.json")
        
        if os.path.exists(nested_package):
            print(f"💡 Fichiers trouvés dans le sous-dossier : '{subdir}'")
            print("📦 Remontée des fichiers vers la racine...")
            
            # Déplacement des fichiers vers le haut
            for item in os.listdir(nested_path):
                shutil.move(os.path.join(nested_path, item), FRONTEND_TARGET)
            
            # Suppression du dossier vide devenu inutile
            os.rmdir(nested_path)
            print("✅ Structure réparée ! Tu peux relancer Docker.")
            return

    print("❌ Impossible de trouver les fichiers du frontend (package.json). Vérifie manuellement le dossier.")

if __name__ == "__main__":
    fix_structure()