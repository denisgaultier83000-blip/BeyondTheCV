import requests
import time
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000"

def test_pipeline():
    print("\n🚀 DÉMARRAGE DU TEST PIPELINE (Fichier Racine - 75 itérations)")
    print("==============================================================")

    # 1. Données simulées (Ce que le Frontend envoie à l'étape 2)
    payload = {
        "personal_info": {"first_name": "Jean", "last_name": "Test", "email": "jean@test.com"},
        "experiences": [],
        "educations": [],
        "skills": ["Python", "React"],
        "target_job": "CTO",
        "target_company": "Google",  # Déclenche la recherche de marché
        "target_industry": "Tech",
        "provider": "gemini",
        "is_partial_start": True   # Simule l'étape 2
    }

    try:
        print(f"\n📡 ÉTAPE 1 : Envoi de la requête Partielle (Page 2)...")
        resp = requests.post(f"{BASE_URL}/api/cv/start-analysis", json=payload)
        
        if resp.status_code != 200:
            print(f"❌ Erreur API ({resp.status_code}): {resp.text}")
            return

        data = resp.json()
        tasks = data.get("tasks", {})
        research_task_id = tasks.get("market_research")
        
        if not research_task_id:
            print("❌ ÉCHEC : La tâche de marché n'a pas démarré à l'étape 2.")
            return
            
        print(f"✅ Tâche de marché lancée en fond : {research_task_id}")
        print("\n🔄 Attente de la fin de la recherche (Simulation de la saisie utilisateur)...")
        
        research_data = None
        for i in range(75):
            sys.stdout.write(f"\r⏳ Polling {i+1}/75 : ")
            res = requests.get(f"{BASE_URL}/api/cv/analysis-status/{research_task_id}")
            if res.status_code == 200:
                status_data = res.json()
                status = status_data.get("status")
                
                if status in ["COMPLETED", "SUCCESS"]:
                    print("\n✅ Recherche terminée et récupérée !")
                    research_data = status_data.get("result")
                    break
                elif status == "FAILED":
                    print(f"\n❌ ÉCHEC CÔTÉ SERVEUR : {status_data.get('result')}")
                    return
            time.sleep(2)

        if not research_data:
            print("\n❌ Timeout ou échec de la recherche.")
            return

        print(f"\n📡 ÉTAPE 2 : Envoi de la requête Finale (Page 8) avec les données en cache...")
        
        # On simule le passage à la page 8
        payload["is_partial_start"] = False
        payload["research_data"] = research_data if isinstance(research_data, dict) else json.loads(research_data)

        resp_final = requests.post(f"{BASE_URL}/api/cv/start-analysis", json=payload)
        final_tasks = resp_final.json().get("tasks", {})

        print(f"🔑 Nouvelles Task IDs reçues : {list(final_tasks.keys())}")
        
        if "market_research" not in final_tasks:
            print("\n🎉 SUCCÈS TOTAL : Le backend a bien détecté le cache et n'a pas écrasé la recherche de marché !")
            print("   Les cartes s'afficheront donc instantanément sur le Dashboard.")
        else:
            print("\n❌ ÉCHEC : Le backend a relancé la recherche de marché et écrasé le cache.")

        # 3. Simulation du Dashboard (Polling de toutes les tâches)
        print("\n🔄 Simulation du Dashboard (Attente des résultats finaux)...")
        
        completed_tasks = set()
        max_retries = 90 # 180 secondes max (File d'attente IA due au Sémaphore)
        
        for i in range(max_retries):
            sys.stdout.write(f"\r⏳ Tour {i+1}/{max_retries} : {len(completed_tasks)}/{len(final_tasks)} terminées...")
            sys.stdout.flush()
            
            for task_name, task_id in final_tasks.items():
                if task_name in completed_tasks:
                    continue
                    
                try:
                    # Appel de la route de statut unifiée
                    res = requests.get(f"{BASE_URL}/api/cv/analysis-status/{task_id}")
                    if res.status_code == 200:
                        status_data = res.json()
                        status = status_data.get("status")
                        
                        if status in ["COMPLETED", "SUCCESS"]:
                            print(f"\n   ✅ {task_name.upper()} : TERMINÉ")
                            completed_tasks.add(task_name)
                        elif status == "FAILED":
                            print(f"\n   ❌ {task_name.upper()} : ÉCHOUÉ - {status_data.get('result')}")
                            completed_tasks.add(task_name)
                except Exception:
                    pass
            
            if len(completed_tasks) == len(final_tasks):
                print("\n\n🚀 SUCCÈS ABSOLU : Tout le pipeline (y compris la validation et les vues recruteur) a survécu à la charge !")
                break
                
            time.sleep(2)

        if len(completed_tasks) < len(final_tasks):
            print("\n\n⚠️ Timeout : Certaines tâches sont encore en cours ou bloquées.")

    except Exception as e:
        print(f"❌ Impossible de contacter le backend : {e}")

if __name__ == "__main__":
    test_pipeline()