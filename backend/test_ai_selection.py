"""
Nom : backend/test_ai_selection.py
But : Auditer les modèles disponibles pour la clé API et valider la sélection automatique.
"""
import asyncio
import os
import sys

# Ajout du dossier parent pour les imports
sys.path.append(os.getcwd())

# On importe genai directement pour l'audit manuel avant de tester le service
try:
    from google import genai
except ImportError:
    print("❌ Library 'google-genai' not installed.")
    sys.exit(1)

from services.ai_generator import ai_service

async def audit_and_test():
    print("\n🔍 --- AUDIT DE LA CLÉ API GEMINI ---")
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ Aucune clé GEMINI_API_KEY trouvée dans l'environnement.")
        return

    client = genai.Client(api_key=api_key)
    
    print("📡 Connexion à Google API...")
    try:
        # 1. Lister TOUS les modèles
        all_models = list(client.models.list())
        print(f"✅ Connexion réussie. {len(all_models)} modèles trouvés au total.")
        
        # 2. Filtrer ceux qui supportent generateContent
        content_models = []
        for m in all_models:
            methods = getattr(m, "supported_generation_methods", None)
            model_name = m.name.replace("models/", "")
            
            if (methods and "generateContent" in methods) or ("gemini" in model_name.lower() and "embedding" not in model_name.lower()):
                content_models.append(model_name)
        
        print("\n📝 Modèles compatibles 'generateContent' pour votre clé :")
        for m in content_models:
            print(f"   - {m}")
            
    except Exception as e:
        print(f"❌ Erreur lors de l'audit des modèles : {e}")
        return

    print("\n🤖 --- TEST DU SERVICE AI_GENERATOR (Algorithme Robuste) ---")
    
    # On vérifie quel modèle a été sélectionné par notre nouvelle logique
    selected_model = ai_service.gemini_model_name
    print(f"👉 Modèle sélectionné automatiquement par le backend : '{selected_model}'")
    
    if not selected_model:
        print("❌ L'algorithme n'a pas réussi à sélectionner un modèle.")
        return

    print(f"🚀 Tentative de génération avec {selected_model}...")
    try:
        response = await ai_service.generate("Réponds juste par le mot : SUCCÈS", provider="gemini")
        print(f"✅ Résultat : {response}")
    except Exception as e:
        print(f"❌ Échec de la génération : {e}")

if __name__ == "__main__":
    asyncio.run(audit_and_test())
