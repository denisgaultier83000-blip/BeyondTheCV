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
    
    # [FIX] Ne rechercher l'entreprise que si elle est renseignée
    if company and company.strip() and company.lower() != "unknown":
        queries.extend([
            f"{company} strategic plan {current_year}",
            f"{company} financial results revenue {current_year - 1}",
            f"{company} corporate culture values",
            f"{company} CEO founder leadership team background",
            f"{company} number of employees size locations HQ",
            f"{company} main competitors market share",
            f"{company} interview process questions candidates",
            f"{company} key products and services",
            f'"{company}" (actualité OR news OR article OR presse) {current_year}',
            f"{company} employee reviews glassdoor culture"
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

        # Construction du prompt contextuel
        final_prompt = f"""
        {prompt_template}
        
        CONTEXTE ACTUEL :
        Entreprise : {company}
        Secteur : {industry}
        Poste visé : {role}
        Pays : {country}
        """
        
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
        prompt = f"""
        {external_prompt}
        
        SEARCH RESULTS:
        {json.dumps(results[:15], default=str)}
        
        OUTPUT STRICT JSON:
        {{
            "key_points": ["Fact 1", "Fact 2", ...],
            "synthesis_notes": "Brief summary of the data found."
        }}
        Respond in {lang}.
        """
    else:
        prompt = f"""
        Analyze these search results for company '{company}'.
        Extract key facts: Financials, Strategy, Culture, Competitors, Products, News, Recruitment Process.
        
        SEARCH RESULTS:
        {json.dumps(results[:15], default=str)}
        
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
        
    # [FIX] Fallback multi-clés pour contrer les hallucinations de l'IA
    market = data.get("market_report") or data.get("rapport_marche") or data.get("market_analysis") or data.get("analyse_marche") or data.get("synthesis") or data
    if not isinstance(market, dict):
        market = {}
    
    company = data.get("company_report") or data.get("rapport_entreprise") or data.get("entreprise") or data.get("synthesis") or data
    if not isinstance(company, dict):
        company = {}
    
    return {
        "market_report": {
            "tension_index": market.get("tension_index", market.get("indice_tension", "Non spécifié.")),
            "tension_score": market.get("tension_score", market.get("score_tension", 85)),
            "salary_barometer": market.get("salary_barometer", market.get("barometre_salaires", market.get("salaires", "Non spécifié."))),
            "competitive_landscape": market.get("competitive_landscape", market.get("paysage_concurrentiel", "Non spécifié.")),
            "trends": market.get("trends", market.get("tendances", "Non spécifié.")),
            "recruitment_dynamics": market.get("recruitment_dynamics", market.get("dynamique_recrutement", "Non spécifié.")),
            "major_disruptions": market.get("major_disruptions", market.get("perturbations", "Non spécifié.")),
            "top_skills": market.get("top_skills", market.get("competences_cles", {"hard": [], "soft": []}))
        },
        "company_report": {
            "key_figures": company.get("key_figures", company.get("chiffres_cles", "Non spécifié.")),
            "leadership": company.get("leadership", company.get("dirigeants", "Non spécifié.")),
            "identity_dna": company.get("identity_dna", company.get("identite_adn", company.get("identite", "Non spécifié."))),
            "financial_health": company.get("financial_health", company.get("sante_financiere", "Non spécifié.")),
            "usp": company.get("usp", company.get("proposition_valeur", "Non spécifié.")),
            "culture_environment": company.get("culture_environment", company.get("culture_environnement", company.get("culture", "Non spécifié."))),
            "team_structure": company.get("team_structure", company.get("equipe", "Non spécifié.")),
            "hot_news": company.get("hot_news", company.get("actualites", "Aucune actualité récente."))
        }
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

        # [OPTIMISATION MAJEURE] Exécution des requêtes Serper en PARALLÈLE
        search_tasks = [_safe_search(q) for q in queries[:9]]
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
            await manager.broadcast(task_id, f"📊 Analyse de {len(raw_results)} sources...")
        analysis = await _analyze_search_results(raw_results, company, provider, target_lang)
        search_context = json.dumps(analysis, default=str)
    else:
        if task_id:
            await manager.broadcast(task_id, "⚠️ Pas de résultats web, utilisation des connaissances générales...")
        search_context = "NO WEB RESULTS AVAILABLE. USE YOUR GENERAL KNOWLEDGE ABOUT THIS COMPANY/INDUSTRY."

    # --- ÉTAPE 5 : RÉDACTION DU RAPPORT FINAL ---
    if task_id:
        await manager.broadcast(task_id, "✍️ Agent Recruteur : Rédaction du rapport final...")
    
    # Tentative de chargement du prompt externe pour permettre la personnalisation
    external_prompt = load_prompt("marche_synthese.md")
    
    # [CRITIQUE FIX] On centralise la contrainte de format JSON pour être SÛR qu'elle s'applique
    # même si le fichier externe "marche_synthese.md" contient un vieux schéma incomplet.
    json_structure_requirement = f"""
    OUTPUT STRICT JSON:
    {{
        "market_report": {{
            "tension_score": 75,
            "tension_index": "Ratio offres/candidats (Pénurie vs Sélection).",
            "salary_barometer": "Fourchettes salaires & avantages.",
            "competitive_landscape": "Leaders, Challengers, Startups.",
            "trends": "Innovations (IA, Eco, etc.).",
            "recruitment_dynamics": "Création vs Destruction d'emplois.",
            "major_disruptions": "Réglementations, crises ou ruptures technologiques imminentes.",
            "top_skills": {{ "hard": ["5 Hard Skills"], "soft": ["3 Soft Skills"] }}
        }},
        "company_report": {{
            "key_figures": "Année création, nombre employés, siège social.",
            "leadership": "Nom du CEO/Fondateur, son profil/background rapide.",
            "identity_dna": "Vision, mission, valeurs réelles.",
            "financial_health": "CA, croissance, mode (Conquête/Gestion).",
            "usp": "Positionnement unique vs concurrents.",
            "culture_environment": "Management, télétravail, ambiance.",
            "team_structure": "Taille dept, profils types.",
            "hot_news": "Lancements, partenariats, nominations."
        }}
    }}
    
    ⚠️ IMPORTANT: You MUST keep the EXACT JSON keys shown above in English ("market_report", "key_figures", "leadership", "major_disruptions", etc.). Do NOT translate the keys. Write the content values in {target_lang}.
    """

    if external_prompt:
        no_company_warning = "" if company else "L'utilisateur n'a pas spécifié d'entreprise. Remplis TOUS les champs de 'company_report' EXACTEMENT avec la mention 'Non renseigné'."
        # Si le fichier existe, on l'utilise en injectant le contexte
        final_prompt = f"""
        {external_prompt}
        
        ---
        CONTEXTE DE RECHERCHE (Données brutes) :
        {search_context}
        
        CIBLE :
        Entreprise: {company or 'Non spécifiée'}
        {no_company_warning}
        Industrie: {industry}
        Contexte Géographique: {target_country}
        Rôle visé: {role}
        Langue du rapport: {target_lang}
        
        {json_structure_requirement}
        """
    else:
        # Fallback robuste si le fichier est manquant
        final_prompt = f"""
        Generate two distinct strategic reports for a candidate applying to {company} ({industry}) as {role}.
        Language: {target_lang}
        
        SEARCH CONTEXT: {search_context}
        
        {json_structure_requirement}
        """
    
    # [ROBUSTESSE] Boucle de tentative pour l'IA (Retry pattern)
    final_synthesis = {}
    for attempt in range(2): # 2 essais max
        try:
            res_str = await ai_service.generate(final_prompt, provider="openai", system_instruction=f"You are a Career Coach. Output in {target_lang}.")
            parsed = clean_ai_json_response(res_str)
            if parsed and ("market_report" in parsed or "company_report" in parsed): # [FIX] Validation sur le nouveau format
                final_synthesis = parsed
                break
        except Exception as e:
            print(f"[AI RETRY] Synthesis failed attempt {attempt+1}: {e}")
            await asyncio.sleep(1)

    # [ROBUSTESSE] Application stricte du schéma pour éviter le crash du frontend
    safe_synthesis = _enforce_schema(final_synthesis)

    # Formatage des sources pour l'affichage
    display_sources = [f"{r['title']} ({r['link']})" for r in raw_results[:5]]

    return {
        "company": company,
        "market_report": safe_synthesis["market_report"],
        "company_report": safe_synthesis["company_report"],
        "sources": display_sources
    }
