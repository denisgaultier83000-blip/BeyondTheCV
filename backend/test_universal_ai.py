"""
Nom : backend/test_universal_ai.py
But : Valider que le service IA peut utiliser n'importe quel fournisseur configuré (OpenAI, Gemini).
"""
import asyncio
import os
import sys

# Ajout du dossier parent pour les imports
sys.path.append(os.getcwd())

from services.ai_generator import ai_service

async def test_universal_selection():
    print("\n🧪 TEST: Démarrage du test de sélection universelle...")
    print(f"   Clé OpenAI détectée: {'Oui' if os.getenv('OPENAI_API_KEY') else 'Non'}")
    print(f"   Clé Gemini détectée: {'Oui' if os.getenv('GEMINI_API_KEY') else 'Non'}")
    
    prompt = "Réponds simplement 'OK' et indique quel modèle tu es."
    
    print("\n--- Lancement de la génération sans forcer de fournisseur ---")
    try:
        # On ne spécifie PAS de 'provider', on laisse le service choisir selon le .env
        response = await ai_service.generate(prompt)
        print(f"\n✅ SUCCÈS ! Réponse reçue : {response}")
    except Exception as e:
        print(f"\n❌ ÉCHEC : {e}")

if __name__ == "__main__":
    asyncio.run(test_universal_selection())