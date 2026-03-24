import asyncio
import os
import sys
import json
from pathlib import Path

# Ajout du chemin parent pour importer les services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from services.ai_generator import ai_service
    from services.utils import load_prompt, clean_ai_json_response
except ImportError as e:
    print(f"❌ Erreur d'import : {e}")
    print("Assurez-vous d'exécuter ce script depuis la racine du projet ou le dossier backend.")
    sys.exit(1)

async def test_career_gps_e2e():
    print("\n🧭 TEST E2E: Fonctionnalité GPS de Carrière\n" + "="*40)
    
    # 1. Vérification du fichier Prompt
    prompt_path = Path(__file__).resolve().parent.parent / "ai/prompts/career_gps.md"
    print(f"📂 1. Vérification du prompt : {prompt_path.name}")
    
    if not prompt_path.exists():
        print(f"   ❌ Fichier introuvable à : {prompt_path}")
        return
    else:
        print("   ✅ Fichier présent.")

    prompt_template = load_prompt(str(prompt_path))
    if not prompt_template:
        print("   ❌ Le contenu du prompt est vide.")
        return

    # 2. Simulation des données Candidat (Mock)
    print("\n👤 2. Préparation des données candidat (Mock)")
    mock_data = {
        "personal_info": {"first_name": "Test", "last_name": "User"},
        "current_role": "Développeur Fullstack",
        "experiences": [
            {"role": "Développeur Web", "duration": "3 ans", "description": "React, Node.js, PostgreSQL"}
        ],
        "skills": ["React", "Python", "SQL", "Git"],
        "target_role_primary": "CTO (Chief Technology Officer)",
        "target_language": "French"
    }
    print(f"   Cible : {mock_data['target_role_primary']}")

    # 3. Construction du Prompt Final (Logique tasks.py)
    final_prompt = f"""
    {prompt_template}
    
    PROFIL DU VOYAGEUR (CANDIDAT) :
    {json.dumps(mock_data, indent=2, ensure_ascii=False, default=str)}
    
    DESTINATION SOUHAITÉE :
    {mock_data.get('target_role_primary', 'Non défini')}
    
    OUTPUT LANGUAGE: French
    """

    # 4. Appel Réel à l'IA
    print("\n🧠 3. Appel à l'IA (Génération en cours... patientez)")
    try:
        # On force un provider si besoin, ou on laisse le défaut
        result_str = await ai_service.generate(
            final_prompt, 
            system_instruction="You are a Career Navigation System."
        )
        print("   ✅ Réponse reçue.")
    except Exception as e:
        print(f"   ❌ Erreur critique lors de l'appel IA : {e}")
        return

    # 5. Parsing et Validation Structurelle
    print("\n🔍 4. Analyse et Validation du JSON")
    result = clean_ai_json_response(result_str)
    
    if "error" in result:
        print(f"   ❌ L'IA a renvoyé une erreur : {result['error']}")
        return

    # Liste des champs critiques attendus par CareerGPS.tsx
    required_structure = {
        "current_position": ["role", "employability_score"],
        "destination": ["target_role"],
        "route": ["estimated_time", "probability", "steps", "obstacles"],
        "progression": ["percentage"],
        "market_radar": ["demand_score", "salary_target"]
    }

    errors = []
    for section, fields in required_structure.items():
        if section not in result:
            errors.append(f"Section manquante : '{section}'")
            continue
        
        # Vérification des sous-champs
        if isinstance(result[section], dict):
            for field in fields:
                if field not in result[section]:
                    errors.append(f"Champ manquant : '{section}.{field}'")
    
    # Vérification spécifique des listes (souvent source de crash si null)
    if "alternatives" in result and not isinstance(result["alternatives"], list):
        errors.append("'alternatives' doit être une liste")
    
    if "steps" in result.get("route", {}) and not isinstance(result["route"]["steps"], list):
        errors.append("'route.steps' doit être une liste")

    # 6. Verdict
    print("\n📊 RÉSULTAT DU TEST")
    if errors:
        print("❌ ÉCHEC DU TEST : Le JSON généré est invalide pour le Frontend.")
        for err in errors:
            print(f"   - {err}")
        print("\nContenu reçu (pour debug) :")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("🎉 SUCCÈS ! Le Backend génère un JSON parfaitement valide pour le composant GPS.")
        print("   Le problème d'écran blanc vient probablement d'un import Frontend ou d'une erreur de syntaxe React.")
        print(f"   Score généré : {result.get('current_position', {}).get('employability_score')}/100")

if __name__ == "__main__":
    # Chargement des variables d'env pour les clés API
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
    
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("⚠️ ATTENTION: Aucune clé API trouvée dans .env")
    
    asyncio.run(test_career_gps_e2e())
