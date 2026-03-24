import asyncio
import os
import sys

# Ajout du dossier parent pour les imports si lancé manuellement
sys.path.append(os.getcwd())

from services.ai_generator import ai_service

async def test_fallback():
    print("\n🧪 TEST: Démarrage du test de fallback IA...")
    print(f"   Clé Gemini détectée: {'Oui' if os.getenv('GEMINI_API_KEY') else 'Non'}")
    
    prompt = "Réponds simplement 'OK' si tu me reçois."
    
    print("\n--- Début de la séquence de génération ---")
    try:
        # On force Gemini pour déclencher la cascade de modèles (1.5 Pro -> Flash -> Pro)
        response = await ai_service.generate(prompt, provider="gemini")
        print(f"\n✅ SUCCÈS FINAL ! Réponse reçue : {response}")
    except Exception as e:
        print(f"\n❌ ÉCHEC TOTAL : {e}")

if __name__ == "__main__":
    asyncio.run(test_fallback())