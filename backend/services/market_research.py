import os
import json
import asyncio
from datetime import datetime
from .ai_generator import ai_service
from .search_service import search_web
# Correction de l'import circulaire : utilisation de utils
from .utils import load_prompt, clean_ai_json_response
from .websocket_manager import manager

def get_market_sources():
    """
    Charge la liste des sources depuis le fichier JSON de configuration.
    """
    try:
        # Cherche d'abord dans le dossier courant (services), puis dans data
        current_dir = os.path.dirname(__file__)
        paths_to_check = [
            os.path.join(current_dir, "market_sources.json"),
            os.path.join(current_dir, "..", "data", "market_sources.json")
        ]
        for path in paths_to_check:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        return {}
    except Exception as e:
        print(f"[WARNING] Could not load market_sources.json: {e}", flush=True)
        return {}

def generate_deterministic_queries(company: str, industry: str) -> list:
    """
    Génère des requêtes de recherche de manière déterministe (sans IA).
    Beaucoup plus robuste et rapide que d'attendre un agent 'Planner'.
    """
    current_year = datetime.now().year
    queries = []
    
    # [OPTIMISATION] Requêtes plus naturelles pour Google. Les opérateurs booléens complexes étouffent l'algorithme sémantique.
    company_context = f'"{company}"'
    
    # [FIX] Ne rechercher l'entreprise que si elle est renseignée
    if company and company.strip() and company.lower() != "unknown":
        queries.extend([
            f"{company_context} actualités presse {current_year}", # [FIX] Garde cette requête générale
            f"{company_context} articles de presse {current_year}", # [FIX] Ajout requête spécifique
            f"{company_context} communiqués de presse {current_year}", # [FIX] Ajout requête spécifique
            f"{company_context} plan stratégique vision",
            f"{company_context} résultats financiers chiffre d'affaires",
            f"{company_context} valeurs culture d'entreprise",
            f"{company_context} recrutement process RH",
            f"{company_context} dirigeants CEO",
            f"{company_context} concurrents parts de marché",
            f"{company_context} avis employés",
            f"{company_context} rapport ESG RSE durabilité {current_year}" # [NEW] Pour plus de détails sur la culture et les valeurs
        ])
        
    if industry and industry.strip() and industry.lower() != "unknown":
        queries.extend([
            f"{industry} market trends AI sustainability digitalization {current_year}",
            f"{industry} most in-demand skills hard soft skills {current_year}",
            f"{industry} competitive landscape startups challengers {current_year}",
            f"{industry} recruitment trends hiring volume {current_year}",
            f"{industry} salary benchmarks {current_year}"
        ])
        
    return queries

async def generate_ai_search_plan(company: str, industry: str, role: str, country: str, provider: str = None) -> list:
    """
    Génère un plan de recherche intelligent via l'IA (Agent Planificateur) en utilisant le prompt markdown.
    """
    try:
        prompt_template = load_prompt("marche_plan_de_recherche.md")
        if not prompt_template:
            print("[Planner] Warning: Prompt file 'marche_plan_de_recherche.md' not found.", flush=True)
            return []

        # [FIX EXPERT] Architecture 100% découplée. Le Python ne fait que remplacer les variables.
        # On utilise .replace() plutôt que .format() pour ignorer les accolades du JSON.
        final_prompt = prompt_template.replace("{company}", company or "Non spécifiée") \
                                      .replace("{industry}", industry or "Non spécifié") \
                                      .replace("{role}", role or "Candidat") \
                                      .replace("{country}", country or "Non spécifié")
        
        res_str = await ai_service.generate(final_prompt, provider="gemini", system_instruction="You are a Strategic Search Planner. Output STRICT JSON.")
        res_json = clean_ai_json_response(res_str)
        
        queries = res_json.get("queries", [])
        # Nettoyage basique si l'IA renvoie des guillemets ou numéros dans les strings
        clean_queries = [q.strip().strip('"').strip("'") for q in queries if isinstance(q, str)]
        return clean_queries
        
    except Exception as e:
        print(f"[Planner Error] Failed to generate AI plan: {e}", flush=True)
        return []

async def _analyze_search_results(results: list, company: str, provider: str = None, lang: str = "French") -> dict:
    """
    Une seule passe d'IA pour extraire les faits marquants des résultats de recherche.
    """
    if not results:
        return {"key_points": [], "summary": "No data found."}

    # Tentative de chargement du prompt externe pour l'analyse (marche_analyse.md)
    external_prompt = load_prompt("marche_analyse.md")
    
    if external_prompt:
        # [FIX EXPERT] Découplage total
        prompt = external_prompt.replace("{company}", company or "Non spécifiée") \
                                .replace("{results}", json.dumps(results[:40], default=str)) \
                                .replace("{lang}", lang) \
                                .replace("{current_date}", datetime.now().strftime("%Y-%m-%d"))
    else:
        prompt = f"""
        Analyze these search results for company '{company}'.
        Extract key facts: Financials, Strategy, Culture, Competitors, Products, News, Recruitment Process.
        
        SEARCH RESULTS:
        {json.dumps(results[:40], default=str)}
        
        OUTPUT STRICT JSON:
        {{
            "key_points": ["Fact 1", "Fact 2", ...],
            "synthesis_notes": "Brief summary of the data found."
        }}
        Respond in {lang}.
        """
        
    res = await ai_service.generate(prompt, provider="gemini", system_instruction=f"You are a Market Research Analyst. Language: {lang}")
    return clean_ai_json_response(res)

def _enforce_schema(data: dict) -> dict:
    """
    Garantit que le dictionnaire de sortie possède toutes les clés requises par le Frontend.
    Remplit les trous laissés par l'IA avec des valeurs par défaut.
    """
    if not isinstance(data, dict):
        data = {}
        
    # [FIX EXPERT] Désencapsulation profonde. Si l'IA renvoie {"data": {"market_report": {...}}} au lieu de l'objet direct
    root = data.get("data") or data.get("result") or data.get("response") or data.get("synthesis") or data
    if not isinstance(root, dict):
        root = data
        
    market = root.get("market_report") or root.get("rapport_marche") or root.get("market_analysis") or root.get("analyse_marche") or root
    if not isinstance(market, dict):
        market = {}
    
    company = root.get("company_report") or root.get("rapport_entreprise") or root.get("entreprise") or root
    if not isinstance(company, dict):
        company = {}
    
    safe_market = market.copy()
    safe_market["tension_index"] = market.get("tension_index") or market.get("indice_tension") or "Non spécifié."
    safe_market["tension_score"] = market.get("tension_score") or market.get("score_tension") or 85
    safe_market["salary_barometer"] = market.get("salary_barometer") or market.get("barometre_salaires") or market.get("salaires") or "Non spécifié."
    safe_market["competitive_landscape"] = market.get("competitive_landscape") or market.get("paysage_concurrentiel") or "Non spécifié."
    safe_market["trends"] = market.get("trends") or market.get("tendances") or "Non spécifié."
    safe_market["recruitment_dynamics"] = market.get("recruitment_dynamics") or market.get("dynamique_recrutement") or "Non spécifié."
    safe_market["major_disruptions"] = market.get("major_disruptions") or market.get("perturbations") or "Non spécifié."
    safe_market["top_skills"] = market.get("top_skills") or market.get("competences_cles") or {"hard": [], "soft": []}

    safe_company = company.copy()
    safe_company["key_figures"] = company.get("key_figures") or company.get("chiffres_cles") or "Non spécifié."
    safe_company["leadership"] = company.get("leadership") or company.get("dirigeants") or company.get("ceo_name") or "Non spécifié."
    safe_company["identity_dna"] = company.get("identity_dna") or company.get("identite_adn") or company.get("identite") or "Non spécifié."
    safe_company["financial_health"] = company.get("financial_health") or company.get("sante_financiere") or "Non spécifié."
    safe_company["usp"] = company.get("usp") or company.get("proposition_valeur") or company.get("enjeux_defis") or company.get("enjeux") or "Non spécifié."
    safe_company["culture_environment"] = company.get("culture_environment") or company.get("culture_environnement") or company.get("culture") or "Non spécifié."
    safe_company["team_structure"] = company.get("team_structure") or company.get("equipe") or company.get("structure_equipe") or "Non spécifié."
    safe_company["news_links"] = company.get("news_links") or company.get("actualites") or []

    return {
        "market_report": safe_market,
        "company_report": safe_company
    }

async def perform_market_research(data: dict, task_id: str = None) -> dict:
    """
    Exécute le pipeline agentique complet (V2) de manière asynchrone.
    """
    company = data.get('target_company')
    industry = data.get('target_industry', 'Unknown')
    role = data.get('target_role_primary') or data.get('target_job', 'Candidat')
    provider = data.get('provider') # Permet de forcer 'gemini' ou 'openai' depuis le front
    target_lang = data.get('target_language', 'French')
    target_country = data.get('target_country', 'Global')

    print(f"[PIPELINE] Starting Deep Market Research for: {company}", flush=True)
    if task_id:
        await manager.broadcast(task_id, f"Démarrage de l'analyse pour {company}...")
    
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        msg = "⚠️ Clé de recherche manquante. Mode 'Connaissances Générales' activé."
        print(f"[PIPELINE] {msg}", flush=True)
        if task_id:
            await manager.broadcast(task_id, msg)

    # --- ÉTAPE 2 : PLANIFICATION HYBRIDE (IA + Fallback) ---
    if task_id:
        await manager.broadcast(task_id, "🧠 Stratégie : L'IA définit le plan de recherche...")
    
    # 1. Tentative IA (Planner)
    queries = await generate_ai_search_plan(company, industry, role, target_country, provider)
    
    # 2. Fallback Déterministe si l'IA échoue ou ne renvoie rien
    if not queries:
        print("[PIPELINE] ⚠️ AI Planner returned no queries. Switching to deterministic fallback.", flush=True)
        if task_id:
            await manager.broadcast(task_id, "⚠️ Planification IA échouée. Passage en mode manuel.")
        queries = generate_deterministic_queries(company, industry)
    
    print(f"[PIPELINE] Executing {len(queries)} queries (Source: {'AI' if queries else 'Manual'}).", flush=True)

    # --- ÉTAPE 3 : COLLECTE (Agent Recherche) ---
    if task_id:
        await manager.broadcast(task_id, f"🌍 Agent Recherche : Exploration du web ({len(queries)} requêtes)...")
    raw_results = []
    seen_links = set()
    api_key_invalid = False

    # On augmente légèrement la limite pour couvrir les nouveaux sujets
    if api_key:
        async def _safe_search(q):
            print(f"   [Search] Executing: {q}")
            if task_id:
                await manager.broadcast(task_id, f"🔎 Recherche : {q}")
            try:
                # search_web est synchrone (requests), on le déporte dans un thread pour ne pas bloquer
                return await asyncio.to_thread(search_web, q, api_key)
            except Exception as e:
                print(f"   [ERROR] Search failed for query '{q}': {e}", flush=True)
                return None

        # [FIX EXPERT] Limiter la concurrence pour éviter l'erreur 429 de Serper.dev
        sem = asyncio.Semaphore(5)
        async def _safe_search_with_sem(q):
            async with sem:
                return await _safe_search(q)

        search_tasks = [_safe_search_with_sem(q) for q in queries[:20]]
        search_results = await asyncio.gather(*search_tasks)

        for res in search_results:
            if res:
                # Check for explicit API key errors
                if isinstance(res, dict) and ("Unauthorized" in str(res) or "Forbidden" in str(res) or res.get("message") == "Unauthorized."):
                    api_key_invalid = True
                    break

                if "organic" in res:
                    for item in res["organic"]:
                        if item["link"] not in seen_links:
                            raw_results.append({
                                "title": item.get("title"),
                                "snippet": item.get("snippet"),
                                "link": item.get("link"),
                                "date": item.get("date", "Recent")
                            })
                            seen_links.add(item["link"])
                            
                # [FIX EXPERT] Extraction spécifique des articles de presse et actualités
                for news_key in ["news", "topStories"]:
                    if news_key in res:
                        for item in res[news_key]:
                            if item.get("link") and item["link"] not in seen_links:
                                raw_results.append({
                                    "title": f"[PRESSE] {item.get('title')}",
                                    "snippet": item.get("snippet", item.get("source", "Actualité")),
                                    "link": item.get("link"),
                                    "date": item.get("date", "Récemment")
                                })
                                seen_links.add(item["link"])
                
        if api_key_invalid:
            print("[PIPELINE] 🛑 Serper API key is invalid or expired. Aborting web search.", flush=True)
            if task_id:
                await manager.broadcast(task_id, "❌ Erreur API de recherche (Clé invalide). Passage en mode connaissances générales.")
            # We force raw_results to be empty so the fallback logic triggers
            raw_results = []
    
    # [ROBUSTESSE] Si aucune donnée trouvée, on tente une recherche générique de secours
    if not raw_results and industry != 'Unknown' and api_key and not api_key_invalid:
        fallback_query = f"{industry} industry trends {datetime.now().year}"
        if task_id:
            await manager.broadcast(task_id, f"⚠️ Recherche précise échouée. Tentative générique : {fallback_query}")
        try:
            res = await asyncio.to_thread(search_web, fallback_query, api_key)
            if res and "organic" in res:
                raw_results.append({"title": "Industry Trends", "snippet": str(res["organic"][:3]), "link": "google.com"})
        except Exception as e:
            print(f"   [ERROR] Fallback search failed: {e}", flush=True)
            pass

    # --- ÉTAPE 4 : ANALYSE & SYNTHÈSE (Fusionnée pour robustesse) ---
    # Si pas de résultats, on passe en mode "Connaissances Générales" au lieu de planter
    search_context = ""
    if raw_results:
        if task_id:
            await manager.broadcast(task_id, f"📊 Formatage de {len(raw_results)} sources pour synthèse...")
        # [FIX EXPERT] Suppression du goulot d'étranglement (Data Loss).
        # On sépare les articles de presse et les résultats organiques pour garantir un mix parfait à l'IA.
        press_results = [r for r in raw_results if "[PRESSE]" in r.get('title', '')]
        organic_results = [r for r in raw_results if "[PRESSE]" not in r.get('title', '')]
        balanced_results = press_results[:15] + organic_results[:25]
        
        context_lines = []
        for i, r in enumerate(balanced_results):
            context_lines.append(f"Source [{i+1}] : {r.get('title', 'Sans titre')}\nLien: {r.get('link', '')}\nDate: {r.get('date', 'Récemment')}\nExtrait: {r.get('snippet', '')}\n")
        search_context = "\n".join(context_lines)
    else:
        if task_id:
            await manager.broadcast(task_id, "⚠️ Pas de résultats web, utilisation des connaissances générales...")
        search_context = "AUCUN RÉSULTAT WEB RÉCENT. UTILISE TES CONNAISSANCES GÉNÉRALES."

    # --- ÉTAPE 5 : RÉDACTION DU RAPPORT FINAL ---
    if task_id:
        await manager.broadcast(task_id, "✍️ Agent Recruteur : Rédaction du rapport final...")
    
    # Tentative de chargement du prompt externe pour permettre la personnalisation
    external_prompt = load_prompt("marche_synthese.md")
    
    if external_prompt:
        no_company_warning = "" if company else "L'utilisateur n'a pas spécifié d'entreprise. Remplis TOUS les champs de 'company_report' EXACTEMENT avec la mention 'Non renseigné'."
        # [FIX EXPERT] Découplage total. Le fichier markdown contient toute la structure JSON et le contexte.
        final_prompt = external_prompt.replace("{search_context}", search_context) \
                                      .replace("{company}", company or "Non spécifiée") \
                                      .replace("{no_company_warning}", no_company_warning) \
                                      .replace("{industry}", industry or "Non spécifié") \
                                      .replace("{target_country}", target_country or "Global") \
                                      .replace("{role}", role or "Non spécifié") \
                                      .replace("{target_lang}", target_lang) \
                                      .replace("{current_date}", datetime.now().strftime("%Y-%m-%d"))
                                      
        # [FIX EXPERT] Injection forcée du contexte de recherche
        if search_context and "Source [1]" not in final_prompt:
            final_prompt += f"\n\n### RÉSULTATS WEB BRUTS (CONTEXTE RAG OBLIGATOIRE) ###\n{search_context}"
    else:
        # Fallback robuste si le fichier est manquant
        final_prompt = f"""
        Generate two distinct strategic reports for a candidate applying to {company} ({industry}) as {role}.
        Language: {target_lang}
        Current Date: {datetime.now().strftime("%Y-%m-%d")}
        
        SEARCH CONTEXT (WEB RESULTS):
        {search_context}
        
        INSTRUCTIONS: Use the search context to extract real facts, links, and figures.
        
        OUTPUT STRICT JSON:
        {{
            "market_report": {{
                "tension_index": "[String (ex: Forte demande)]",
                "tension_score": 85,
                "salary_barometer": "[String]",
                "competitive_landscape": "[String]",
                "trends": "[String]",
                "recruitment_dynamics": "[String]",
                "major_disruptions": "[String]",
                "top_skills": {{"hard": [], "soft": []}}
            }},
            "company_report": {{
                "key_figures": "[String (CA, employés...)]",
                "leadership": "[String]",
                "identity_dna": "[String]",
                "financial_health": "[String]",
                "usp": "[String (Enjeux & Défis / Proposition de valeur)]",
                "culture_environment": "[String]",
                "team_structure": "[String]",
                "news_links": [
                    {
                        "title": "[Article title]",
                        "url": "https://...",
                        "source": "[Media name]",
                        "date": "[Date]"
                    }
                ]
            }}
        }}
        """
    
    # [ROBUSTESSE] Utilisation de generate_valid_json pour bénéficier du Retry automatique (Tenacity)
    final_synthesis = {}
    try:
        parsed = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction=f"You are a Strategic Corporate Analyst. Output STRICT JSON in {target_lang}.")
        if "error" not in parsed:
            final_synthesis = parsed
        else:
            print(f"[PIPELINE ERROR] AI JSON error: {parsed['error']}", flush=True)
    except Exception as e:
        print(f"[AI ERROR] Final synthesis failed: {e}")

    # [ROBUSTESSE] Application stricte du schéma pour éviter le crash du frontend
    safe_synthesis = _enforce_schema(final_synthesis)

    # [FIX EXPERT] Tri intelligent : on remonte les articles de presse en priorité absolue
    # et on augmente la limite visible pour l'utilisateur final.
    press_sources = [r for r in raw_results if "[PRESSE]" in r.get('title', '')]
    other_sources = [r for r in raw_results if "[PRESSE]" not in r.get('title', '')]
    
    best_sources = (press_sources + other_sources)[:10] # Top 10 des sources
    
    display_sources = []
    for r in best_sources:
        clean_title = r.get('title', '').replace('[PRESSE] ', '') # Nettoyage visuel
        display_sources.append(f"{clean_title} ({r.get('link', '')})")

    return {
        "company": company,
        "market_report": safe_synthesis["market_report"],
        "company_report": safe_synthesis["company_report"],
        "sources": display_sources
    }
