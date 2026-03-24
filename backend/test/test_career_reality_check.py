import asyncio
import os
import sys
import json
from pathlib import Path

# Ajout du chemin parent pour importer les services du backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from services.ai_generator import ai_service
    from services.utils import load_prompt, clean_ai_json_response
except ImportError as e:
    print(f"❌ Erreur d'import : {e}")
    print("Assurez-vous d'exécuter ce script depuis la racine du projet ou le dossier backend.")
    sys.exit(1)

async def test_reality_check_e2e():
    print("\n🚀 TEST E2E: Career Reality Check (Viral Feature)\n" + "="*50)
    
    # 1. Vérification du fichier Prompt
    prompt_path = Path(__file__).resolve().parent.parent / "ai/prompts/career_reality_check.md"
    print(f"📂 1. Vérification du prompt : {prompt_path.name}")
    
    if not prompt_path.exists():
        print(f"   ❌ Fichier introuvable à : {prompt_path}")
        return
    
    prompt_template = load_prompt(str(prompt_path))
    if not prompt_template:
        print("   ❌ Le contenu du prompt est vide.")
        return
    print("   ✅ Prompt chargé avec succès.")

    # 2. Simulation des données Candidat (Mock)
    print("\n👤 2. Préparation des données candidat")
    mock_data = {
        "personal_info": {"first_name": "Denis", "last_name": "G."},
        "current_role": "Project Manager",
        "skills": ["Leadership", "Crisis Management", "Agile", "Stakeholder Management"],
        "experiences": [
            {"role": "Senior Project Manager", "company": "Thales", "duration": "5 ans"}
        ],
        "employability_score": 84  # Simulé comme venant d'une autre tâche
    }
    
    # 3. Construction du Prompt Final
    final_prompt = f"""
    {prompt_template}
    
    PROFIL CANDIDAT :
    {json.dumps(mock_data, indent=2, ensure_ascii=False, default=str)}
    
    SCORE EMPLOYABILITÉ DÉJÀ CALCULÉ : {mock_data['employability_score']}/100
    """

    # 4. Appel Réel à l'IA
    print("\n🧠 3. Appel à l'IA (Génération en cours...)")
    try:
        result_str = await ai_service.generate(final_prompt, system_instruction="You are a Personal Branding Expert.")
        print("   ✅ Réponse reçue.")
    except Exception as e:
        print(f"   ❌ Erreur critique IA : {e}")
        return

    # 5. Validation du JSON
    print("\n🔍 4. Analyse du JSON")
    result = clean_ai_json_response(result_str)
    
    required_keys = ["archetype", "tagline", "market_position", "score", "top_3_skills", "linkedin_post"]
    data = result.get("reality_check", {})
    
    missing = [key for key in required_keys if key not in data]
    
    if missing:
        print(f"   ❌ ÉCHEC : Clés manquantes -> {missing}")
    else:
        print(f"   🎉 SUCCÈS : JSON Valide !\n")
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Chargement des variables d'env
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
    asyncio.run(test_reality_check_e2e())