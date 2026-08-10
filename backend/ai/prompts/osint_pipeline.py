import os
import json
import asyncio
import aiohttp
from datetime import datetime, timedelta
from urllib.parse import urlparse

# [AJOUT] Import de la bibliothèque d'extraction de contenu.
# Assurez-vous qu'elle est installée : pip install trafilatura
try:
    from trafilatura import fetch_url, extract
except ImportError:
    fetch_url, extract = None, None

# [AJOUT] Import du module de base de données pour le cache
try:
    from database import db
except ImportError:
    db = None
class OSINTPipeline:
    """
    Pipeline de recherche OSINT structuré pour l'Intelligence Économique.
    Sépare la découverte de l'analyse, élimine le bruit SEO et cible les signaux faibles.
    """
    
    def __init__(self, serper_api_key: str):
        self.cache_initialized = False
        self.serper_api_key = serper_api_key
        
        # [FIX] Liste blanche stricte pour garantir la crédibilité et éviter le bruit SEO
        self.trusted_domains = [
            "lesechos.fr", "latribune.fr", "usinenouvelle.com", 
            "reuters.com", "bloomberg.com", "ft.com", "wsj.com",
            "lefigaro.fr", "lemonde.fr", "challenges.fr", "intelligenceonline.fr",
            "journaldunet.com", "bfmtv.com/economie"
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
        alias_str = " OR ".join([f'"{alias}"' for alias in aliases if alias])
        if not alias_str: return []
        domains_str = " OR ".join([f'site:{d}' for d in self.trusted_domains if d])
        
        # [FIX] Segmentation stratégique des recherches pour des signaux faibles pertinents
        categories = {
            "eco": "(résultats OR financier OR acquisition OR croissance OR chiffre d'affaires OR fusion)",
            "risk": "(plainte OR procès OR scandale OR corruption OR redressement OR enquête)",
            "cyber": "(ransomware OR cyberattaque OR piratage OR fuite de données)",
            "hr": "(grève OR syndicats OR restructuration OR licenciement)",
            "strategy": "(stratégie OR partenariat OR innovation OR lancement produit)"
        }
        
        queries = []
        for cat, keywords in categories.items():
            # Ex: ("Safran" OR "Safran Group") (site:lesechos.fr OR site:reuters.com) (acquisition OR corruption)
            # On ne met les domaines que si on a une liste blanche, sinon recherche globale
            if domains_str:
                query = f"({alias_str}) ({domains_str}) {keywords}"
            else:
                query = f"({alias_str}) {keywords}"
            queries.append(query)
            
        return queries

    async def fetch_serper_async(self, session: aiohttp.ClientSession, query: str, endpoint: str = "search") -> list[dict]:
        url = f"https://google.serper.dev/{endpoint}"
        payload = json.dumps({
            "q": query,
            "num": 5,
            "tbs": "qdr:y"  # [FIX] Restreint à la dernière année pour ne garder que l'actualité chaude
        })
        headers = {
            'X-API-KEY': self.serper_api_key,
            'Content-Type': 'application/json'
        }
        try:
            # [FIX EXPERT] Ajout d'un timeout strict. Par défaut, aiohttp attend 5 minutes !
            timeout = aiohttp.ClientTimeout(total=15.0, connect=7.0)
            async with session.post(url, headers=headers, data=payload, timeout=timeout) as response:
                response.raise_for_status()
                data = await response.json()
                if endpoint == "news":
                    return data.get("news", [])
                return data.get("organic", [])
        except Exception as e:
            print(f"[OSINT] Erreur Serper ({endpoint}) pour la requête '{query}': {e}")
            return []

    def _normalize_serper_item(self, item: dict, query: str, endpoint: str) -> dict:
        link = item.get("link") or item.get("url") or ""
        domain = urlparse(link).netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return {
            "title": item.get("title") or "",
            "url": link,
            "snippet": item.get("snippet") or item.get("description") or "",
            "date": item.get("date") or item.get("publishedAt") or item.get("datePublished") or "",
            "source": item.get("source") or domain,
            "domain": domain,
            "query": query,
            "endpoint": endpoint,
        }

    def deduplicate_and_filter(self, articles: list[dict]) -> list[dict]:
        """Supprime les doublons, syndications d'agences et sites poubelles."""
        seen_urls = set()
        unique_articles = []
        
        # [FIX] Sites de communiqués de presse ou aggrégateurs SEO à ignorer
        bad_domains = ["yahoo.com", "msn.com", "zonebourse.com", "globenewswire.com", "prnewswire.com", "boursorama.com", "businesswire.com"]
        
        for art in articles:
            url = art.get("url") or art.get("link") or ""
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            
            domain = (art.get("domain") or urlparse(url).netloc.lower())
            if any(bad in domain for bad in bad_domains):
                continue
                
            unique_articles.append(art)
            
        return unique_articles

    async def _init_cache_db(self):
        """[NOUVEAU] Crée la table de cache si elle n'existe pas."""
        if not db or self.cache_initialized:
            return
        try:
            async with db.get_connection() as conn:
                await db.execute(conn, """
                    CREATE TABLE IF NOT EXISTS article_cache (
                        url TEXT PRIMARY KEY,
                        content TEXT,
                        cached_at TIMESTAMP
                    )
                """)
            self.cache_initialized = True
        except Exception as e:
            print(f"[CACHE INIT ERROR] {e}")

    async def extract_main_content_async(self, session: aiohttp.ClientSession, url: str) -> str:
        """
        [MODIFIÉ] Agent d'extraction de contenu avec cache en base de données.
        Utilise trafilatura pour extraire le texte principal d'un article, en ignorant les pubs et menus.
        """
        await self._init_cache_db()

        # 1. Vérifier le cache
        if db:
            try:
                async with db.get_connection() as conn:
                    row = await db.fetchone(conn, "SELECT content, cached_at FROM article_cache WHERE url = ?", (url,))
                    if row:
                        cached_content, cached_at = row[0], row[1]
                        # On utilise le cache s'il date de moins de 7 jours
                        if datetime.now() - cached_at < timedelta(days=7):
                            # print(f"[CACHE HIT] {url}")
                            # [MODIFIÉ] Incrémente le compteur de "hits" pour le jour actuel
                            await db.execute(conn, "INSERT INTO system_stats (key, value, date) VALUES (?, 1, CURRENT_DATE) ON CONFLICT(key, date) DO UPDATE SET value = system_stats.value + 1", ('article_cache_hits',))
                            return cached_content
            except Exception as e:
                print(f"[CACHE READ ERROR] {e}")

        if not extract:
            return "[Extraction désactivée : 'trafilatura' non installé]"

        # 2. Si pas de cache, extraire le contenu
        try:
            # Timeout strict pour éviter de bloquer sur un site trop lent.
            async with session.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'}) as response:
                if response.status != 200:
                    return f"[Erreur {response.status}]"
                html_content = await response.text()
                main_text = extract(html_content, include_comments=False, include_tables=False, no_fallback=True)
                content = main_text or "[Contenu non extractible]"

                # 3. Mettre en cache le nouveau contenu
                if db:
                    async with db.get_connection() as conn:
                        await db.execute(conn, "INSERT OR REPLACE INTO article_cache (url, content, cached_at) VALUES (?, ?, ?)", (url, content, datetime.now())) # [MODIFIÉ]
                        # [MODIFIÉ] Incrémente le compteur de "misses" pour le jour actuel
                        await db.execute(conn, "INSERT INTO system_stats (key, value, date) VALUES (?, 1, CURRENT_DATE) ON CONFLICT(key, date) DO UPDATE SET value = system_stats.value + 1", ('article_cache_misses',))

                return content
        except Exception as e:
            return f"[Erreur lors de l'extraction : {type(e).__name__}]"

    async def run_structured(self, company_name: str, queries: list[str] | None = None, max_articles: int = 18) -> list[dict]:
        """Retourne une liste structurée d'articles validés avec contenu extrait."""
        aliases = self.expand_entity(company_name)
        queries = queries or self.build_queries(aliases)
        
        all_articles = []
        # [FIX] Recherches en parallèle pour des performances optimales
        sem = asyncio.Semaphore(5) # Limite à 5 requêtes concurrentes
        
        async def fetch_with_sem(session, q, endpoint):
            async with sem:
                raw_items = await self.fetch_serper_async(session, q, endpoint=endpoint)
                return [self._normalize_serper_item(item, q, endpoint) for item in raw_items]

        async with aiohttp.ClientSession() as session:
            tasks = []
            for q in queries:
                tasks.append(fetch_with_sem(session, q, "search"))
                tasks.append(fetch_with_sem(session, q, "news"))
            results = await asyncio.gather(*tasks)
            for res in results:
                all_articles.extend(res)
                
        filtered_articles = self.deduplicate_and_filter(all_articles)
        top_articles = filtered_articles[:max_articles]

        if not top_articles:
            return []

        async with aiohttp.ClientSession() as session:
            extraction_tasks = [self.extract_main_content_async(session, art.get("url")) for art in top_articles]
            extracted_contents = await asyncio.gather(*extraction_tasks)

        structured_articles = []
        for i, art in enumerate(top_articles):
            content = extracted_contents[i]
            structured_articles.append({
                "article_id": f"art_{i + 1:03d}",
                "title": art.get("title") or f"Article {i + 1}",
                "url": art.get("url") or "",
                "source": art.get("source") or art.get("domain") or "Source Web",
                "domain": art.get("domain") or "",
                "published_at": art.get("date") or "Récente",
                "snippet": art.get("snippet") or "",
                "query": art.get("query") or "",
                "endpoint": art.get("endpoint") or "search",
                "content": content or "",
            })
        return structured_articles

    async def run(self, company_name: str) -> str:
        """Exécute l'analyse et retourne le contexte formaté pour le Prompt final."""
        top_articles = await self.run_structured(company_name=company_name)

        context_str = "### ANALYSE DE PRESSE OSINT (Contenu Complet) ###\n"
        if top_articles:
            for i, art in enumerate(top_articles):
                full_content = art.get("content") or ""
                truncated_content = (full_content[:4000] + '...') if full_content and len(full_content) > 4000 else full_content
                context_str += (
                    f"--- SOURCE {i+1} ---\n"
                    f"Titre: {art.get('title')}\n"
                    f"URL: {art.get('url')}\n"
                    f"Date: {art.get('published_at', 'Récente')}\n"
                    f"CONTENU COMPLET DE L'ARTICLE:\n{truncated_content}\n\n"
                )
        else:
            context_str += "Aucun article pertinent trouvé lors de la recherche web."

        return context_str