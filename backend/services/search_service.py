import json
import httpx
import asyncio

async def search_web(query: str, api_key: str = None, max_retries: int = 2):
    """
    Exécute une recherche réelle via Serper.dev (Google Search API) de manière asynchrone.
    Service neutre utilisé par market_research et ai_generator.
    """
    if not api_key:
        return None
        
    url = "https://google.serper.dev/search"
    payload = {
        "q": query,
        "num": 20, # [FIX EXPERT] Augmente la profondeur de la recherche par requête Serper
        "gl": "fr",
        "hl": "fr",
        "tbs": "qdr:y" # [FIX EXPERT] Restreint strictement les résultats aux 12 derniers mois
    }
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    
    # [OPTIMISATION] Timeout strict: 5s max pour se connecter, 10s max pour recevoir la réponse
    timeout_config = httpx.Timeout(10.0, connect=5.0)
    
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout_config) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code in [429, 500, 502, 503, 504]:
                    print(f"[Serper Warning] HTTP {response.status_code}. Retry {attempt+1}/{max_retries}...", flush=True)
                    if attempt < max_retries:
                        await asyncio.sleep(1.0 * (attempt + 1))
                        continue
                else:
                    print(f"[Serper Error] {response.status_code} - {response.text}", flush=True)
                    return None
        except httpx.RequestError as e:
            print(f"[Serper Network Error] {e} - Retry {attempt+1}/{max_retries}...", flush=True)
            if attempt < max_retries:
                await asyncio.sleep(1.0 * (attempt + 1))
                continue
        except Exception as e:
            print(f"Search API Error: {e}")
            return None
            
    return None