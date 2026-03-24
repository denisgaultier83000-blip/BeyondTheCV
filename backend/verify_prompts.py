import os
from pathlib import Path
import sys

def check_prompts():
    print("🔍 DIAGNOSTIC DES PROMPTS IA\n")
    
    # 1. Calcul des chemins comme dans le code de production
    # backend/verify_prompts.py -> parent = backend
    BASE_DIR = Path(__file__).resolve().parent
    PROMPTS_DIR = BASE_DIR / "ai" / "prompts"
    
    print(f"📂 Dossier cible : {PROMPTS_DIR}")
    
    if not PROMPTS_DIR.exists():
        print("❌ LE DOSSIER 'ai/prompts' EST INTROUVABLE !")
        return

    # 2. Liste des fichiers critiques attendus par tasks.py
    required_files = [
        "master_prompt.md",
        "pitch_v1.md",
        "career_radar.md",
        "recruiter_view.md",
        "job_decoder.md",
        "hidden_market.md"
    ]
    
    all_good = True
    for filename in required_files:
        file_path = PROMPTS_DIR / filename
        if file_path.exists():
            print(f"   ✅ Trouvé : {filename}")
        else:
            print(f"   ❌ MANQUANT : {filename}")
            all_good = False
            
    print("\n" + ("🎉 TOUS LES FICHIERS SONT PRÉSENTS." if all_good else "⚠️ IL MANQUE DES FICHIERS."))

if __name__ == "__main__":
    check_prompts()