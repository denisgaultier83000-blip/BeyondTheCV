import os
import json
import asyncio
import aiohttp
from urllib.parse import urlparse

class OSINTPipeline:
    """
    Pipeline de recherche OSINT structuré pour l'Intelligence Économique.
    Sépare la découverte de l'analyse, élimine le bruit SEO et cible les signaux faibles.
    """
    
    def __init__(self, serper_api_key: str):
        self.serper_api_key = serper_api_key
        
        # Liste blanche stricte pour garantir la crédibilité (à adapter selon les pays)
        self.trusted_domains = [
            "lesechos.fr", "latribune.fr", "usinenouvelle.com", 
            "reuters.com", "bloomberg.com", "ft.com", "wsj.com",
            "lefigaro.fr", "lemonde.fr", "challenges.fr", "intelligenceonline.fr"
        ]

    def expand_entity(self, company_name: str) -> list[str]:
        """
        Génère les alias de l'entreprise (filiales, anciens noms, dirigeants).
        Dans une version avancée, cette étape fait appel à un LLM très rapide (ex: gpt-4o-mini).
        """
        # Exemple basique
        return [company_name, f"{company_name} Group"]

    def build_queries(self, aliases: list[str]) -> list[str]:
        """Construit des requêtes booléennes d'expert pour chaque catégorie de risque."""
        alias_str = " OR ".join([f'"{alias}"' for alias in aliases])
        domains_str = " OR ".join([f'site:{d}' for d in self.trusted_domains])
        
        # Segmentation stratégique des recherches
        categories = {
            "eco": "(résultats OR financier OR acquisition OR croissance OR chiffre d'affaires OR fusion)",
            "risk": "(plainte OR procès OR scandale OR corruption OR redressement OR enquête)",
            "cyber": "(ransomware OR cyberattaque OR piratage OR fuite de données)",
            "hr": "(grève OR syndicats OR restructuration OR licenciement)",
        }
        
        queries = []
        for cat, keywords in categories.items():
            # Ex: ("Safran" OR "Safran Group") (site:lesechos.fr OR site:reuters.com) (acquisition OR corruption)
            query = f"({alias_str}) ({domains_str}) {keywords}"
            queries.append(query)
            
        return queries

    async def fetch_serper_async(self, session: aiohttp.ClientSession, query: str) -> list[dict]:
        url = "https://google.serper.dev/search"
        payload = json.dumps({
            "q": query,
            "num": 5,
            "tbs": "qdr:y"  # Restreint à la dernière année pour ne garder que l'actualité chaude
        })
        headers = {
            'X-API-KEY': self.serper_api_key,
            'Content-Type': 'application/json'
        }
        try:
            async with session.post(url, headers=headers, data=payload) as response:
                response.raise_for_status()
                data = await response.json()
                return data.get("organic", [])
        except Exception as e:
            print(f"[OSINT] Erreur Serper pour la requête '{query}': {e}")
            return []

    def deduplicate_and_filter(self, articles: list[dict]) -> list[dict]:
        """Supprime les doublons, syndications d'agences et sites poubelles."""
        seen_urls = set()
        unique_articles = []
        
        # Sites de communiqués de presse ou aggrégateurs SEO à ignorer
        bad_domains = ["yahoo.com", "msn.com", "zonebourse.com", "globenewswire.com", "prnewswire.com", "boursorama.com"]
        
        for art in articles:
            url = art.get("link", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            
            domain = urlparse(url).netloc.lower()
            if any(bad in domain for bad in bad_domains):
                continue
                
            unique_articles.append(art)
            
        return unique_articles

    async def run(self, company_name: str) -> str:
        """Exécute l'analyse et retourne le contexte formaté pour le Prompt final."""
        aliases = self.expand_entity(company_name)
        queries = self.build_queries(aliases)
        
        all_articles = []
        # Recherches en parallèle pour des performances optimales
        sem = asyncio.Semaphore(5) # Limite à 5 requêtes concurrentes
        
        async def fetch_with_sem(session, q):
            async with sem:
                return await self.fetch_serper_async(session, q)

        async with aiohttp.ClientSession() as session:
            tasks = [fetch_with_sem(session, q) for q in queries]
            results = await asyncio.gather(*tasks)
            for res in results:
                all_articles.extend(res)
                
        filtered_articles = self.deduplicate_and_filter(all_articles)
        
        # Construction du contexte injecté dans le prompt `marche_synthese.md`
        context_str = "### REVUE DE PRESSE OSINT (Filtrée et Dédupliquée) ###\n"
        for art in filtered_articles[:10]:  # On ne garde que la "crème de la crème"
            context_str += f"- Titre : {art.get('title')}\n  Source/URL : {art.get('link')}\n  Extrait : {art.get('snippet')}\n  Date : {art.get('date', 'Récente')}\n\n"
            
        return context_str