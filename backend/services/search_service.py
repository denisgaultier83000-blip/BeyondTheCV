import json
import requests

def search_web(query: str, api_key: str = None):
    """
    Exécute une recherche réelle via Serper.dev (Google Search API).
    Service neutre utilisé par market_research et ai_generator.
    """
    if not api_key:
        return None
        
    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": query,
        "num": 20, # [FIX EXPERT] Augmente la profondeur de la recherche par requête Serper
        "gl": "fr",
        "hl": "fr",
        "tbs": "qdr:y" # [FIX EXPERT] Restreint strictement les résultats aux 12 derniers mois
    })
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, headers=headers, data=payload, timeout=15)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"[Serper Error] {response.status_code} - {response.text}", flush=True)
    except Exception as e:
        print(f"Search API Error: {e}")
    return None