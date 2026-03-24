import asyncio
import time
import httpx
import os
import sys

# Assurer que Python trouve nos modules
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

BASE_URL = "http://localhost:8000"
PDF_TEST_FILE = "test_dummy_cv.pdf"

async def create_dummy_pdf():
    """Crée un faux PDF de 2Mo pour le test de charge."""
    if not os.path.exists(PDF_TEST_FILE):
        print("📝 Création d'un faux PDF de 2Mo...")
        with open(PDF_TEST_FILE, "wb") as f:
            # On crée un fichier PDF basique rempli de "A" pour atteindre 2Mo
            f.write(b"%PDF-1.4\n" + b"A" * 2_000_000 + b"\n%%EOF")

async def single_parse_request(client, req_id):
    """Envoie une requête de parsing de CV."""
    try:
        with open(PDF_TEST_FILE, "rb") as f:
            files = {"file": (f"cv_{req_id}.pdf", f, "application/pdf")}
            response = await client.post(f"{BASE_URL}/api/parse-cv", files=files, timeout=60.0)
            return response.status_code
    except Exception as e:
        return str(e)

async def run_load_test():
    """Test de charge : 50 requêtes simultanées sur l'API (IO/CPU bound)."""
    print("\n🚀 --- DÉMARRAGE DU TEST DE CHARGE (50 requêtes) ---")
    await create_dummy_pdf()
    
    start_time = time.time()
    async with httpx.AsyncClient() as client:
        tasks = [single_parse_request(client, i) for i in range(50)]
        results = await asyncio.gather(*tasks)
        
    end_time = time.time()
    successes = results.count(200)
    
    print(f"✅ Succès (HTTP 200) : {successes}/50")
    print(f"❌ Échecs / Timeouts : {50 - successes}")
    print(f"⏱️ Temps total : {end_time - start_time:.2f} secondes")
    if successes < 50:
        print("⚠️ ALERTE : Ton Executor ThreadPool semble être saturé. Pense à augmenter le nombre de workers.")

async def run_resilience_test():
    """Test de résilience : Simuler une hallucination JSON de l'IA."""
    print("\n🛡️ --- DÉMARRAGE DU TEST DE RÉSILIENCE (Auto-guérison Tenacity) ---")
    
    from services.ai_generator import ai_service
    
    # 1. On Mock (simule) le comportement de l'IA
    original_generate = ai_service.generate
    call_count = {"count": 0}
    
    async def mock_generate(prompt, provider=None, system_instruction=None):
        call_count["count"] += 1
        if call_count["count"] == 1:
            print("   -> [Mock] IA renvoie un JSON cassé (oubli d'accolade).")
            return "Voici le résultat : { 'nom': 'Jean' ... Oups" # Invalide
        else:
            print("   -> [Mock] IA comprend son erreur et renvoie un bon JSON.")
            return '{"nom": "Jean", "status": "corrigé"}'
            
    ai_service.generate = mock_generate
    
    try:
        result = await ai_service.generate_valid_json("Donne moi un JSON.")
        assert "status" in result
        assert call_count["count"] == 2
        print("🎉 TEST RÉUSSI : Tenacity a intercepté l'erreur, relancé l'IA, et récupéré un JSON propre !")
    except Exception as e:
        print(f"❌ ÉCHEC DU TEST : {e}")
    finally:
        ai_service.generate = original_generate # Restaure l'état

if __name__ == "__main__":
    asyncio.run(run_resilience_test())
    # Lance ton serveur FastAPI sur le port 8000 en tâche de fond avant d'exécuter la ligne suivante :
    # asyncio.run(run_load_test())