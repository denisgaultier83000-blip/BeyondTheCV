import os
import json
import asyncio
import re
from datetime import datetime
from urllib.parse import urlparse
from .ai_generator import ai_service
from .search_service import search_web
# Correction de l'import circulaire : utilisation de utils
from ai.prompts.osint_pipeline import OSINTPipeline
from .utils import load_prompt, clean_ai_json_response
from .websocket_manager import manager


def _extract_urls_from_text(raw_text: str) -> list[str]:
    if not raw_text:
        return []
    matches = re.findall(r"https?://[^\s\]\)\}\"'>]+", str(raw_text))
    cleaned: list[str] = []
    seen = set()
    for candidate in matches:
        url = candidate.strip().rstrip('.,;:!?)')
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or "").lower()
            if not parsed.scheme.startswith("http"):
                continue
            if not host:
                continue
            if host in {"example.com", "www.example.com", "exemple.com", "www.exemple.com", "localhost"}:
                continue
            if url not in seen:
                seen.add(url)
                cleaned.append(url)
        except Exception:
            continue
    return cleaned


def _is_placeholder_url(url: str) -> bool:
    try:
        parsed = urlparse(str(url or "").strip())
        host = (parsed.netloc or "").lower()
        if host in {"", "example.com", "www.example.com", "exemple.com", "www.exemple.com", "localhost"}:
            return True
        return False
    except Exception:
        return True


def _domain_from_url(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        return host or "Source Web"
    except Exception:
        return "Source Web"


def _deduplicate_queries(queries: list[str], limit: int = 15) -> list[str]:
    deduped: list[str] = []
    seen = set()
    for query in queries or []:
        if not isinstance(query, str):
            continue
        cleaned = re.sub(r"\s+", " ", query).strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(cleaned)
        if len(deduped) >= limit:
            break
    return deduped


async def _score_osint_articles(articles: list[dict], company: str, role: str, provider: str | None = None) -> list[dict]:
    if not articles:
        return []

    prompt_template = load_prompt("osint_scoring.md")
    if not prompt_template:
        return articles

    prompt = prompt_template.replace("{company_name}", company or "Entreprise cible") \
                            .replace("{role}", role or "Poste visé") \
                            .replace("{articles_json}", json.dumps(articles, ensure_ascii=False, indent=2, default=str))
    try:
        scored = await ai_service.generate_valid_json(
            prompt,
            provider=provider or "openai",
            system_instruction="You are an OSINT scoring engine. Output STRICT JSON only."
        )
    except Exception as e:
        print(f"[OSINT SCORING] Error: {e}", flush=True)
        return articles

    scored_items = scored.get("scored_articles") if isinstance(scored, dict) else None
    if not isinstance(scored_items, list):
        return articles

    score_map = {
        str(item.get("article_id") or ""): item
        for item in scored_items
        if isinstance(item, dict) and item.get("article_id")
    }
    enriched = []
    for article in articles:
        score_data = score_map.get(str(article.get("article_id") or ""), {})
        candidate_score = int(score_data.get("candidate_score") or 0) if isinstance(score_data, dict) else 0
        enriched.append({
            **article,
            "candidate_score": candidate_score,
            "job_relevance": score_data.get("job_relevance") if isinstance(score_data, dict) else None,
            "themes": score_data.get("themes") if isinstance(score_data, dict) else [],
            "score_breakdown": score_data.get("score_breakdown") if isinstance(score_data, dict) else {},
            "scoring_reasoning": score_data.get("reasoning") if isinstance(score_data, dict) else "",
        })
    return enriched


async def _extract_osint_facts(selected_articles: list[dict], provider: str | None = None) -> list[dict]:
    if not selected_articles:
        return []

    prompt_template = load_prompt("marche_extraction.md")
    if not prompt_template:
        return []

    prompt = (
        f"{prompt_template}\n\n"
        "selected_articles_json:\n"
        f"{json.dumps(selected_articles, ensure_ascii=False, indent=2, default=str)}\n"
    )
    try:
        extracted = await ai_service.generate_valid_json(
            prompt,
            provider=provider or "openai",
            system_instruction="You are a factual extraction engine. Output STRICT JSON only."
        )
    except Exception as e:
        print(f"[OSINT EXTRACTION] Error: {e}", flush=True)
        return []

    facts = extracted.get("facts") if isinstance(extracted, dict) else None
    return facts if isinstance(facts, list) else []


async def _cluster_osint_facts(facts: list[dict], company: str, industry: str, role: str, country: str, provider: str | None = None) -> dict:
    if not facts:
        return {"clusters": [], "unclustered_facts": []}

    prompt_template = load_prompt("osint_clustering.md")
    if not prompt_template:
        return {"clusters": [], "unclustered_facts": []}

    prompt = prompt_template.replace("{company}", company or "Entreprise cible") \
                            .replace("{industry}", industry or "Non spécifié") \
                            .replace("{role}", role or "Poste visé") \
                            .replace("{country}", country or "Global") \
                            .replace("{facts_json}", json.dumps(facts, ensure_ascii=False, indent=2, default=str))
    try:
        clustered = await ai_service.generate_valid_json(
            prompt,
            provider=provider or "openai",
            system_instruction="You are an OSINT clustering engine. Output STRICT JSON only."
        )
    except Exception as e:
        print(f"[OSINT CLUSTERING] Error: {e}", flush=True)
        return {"clusters": [], "unclustered_facts": []}

    if not isinstance(clustered, dict):
        return {"clusters": [], "unclustered_facts": []}
    clustered.setdefault("clusters", [])
    clustered.setdefault("unclustered_facts", [])
    return clustered


def _build_structured_search_context(selected_articles: list[dict], extracted_facts: list[dict], clustered_signals: dict) -> str:
    payload = {
        "selected_articles": selected_articles,
        "extracted_facts": extracted_facts,
        "clusters": clustered_signals.get("clusters", []),
        "unclustered_facts": clustered_signals.get("unclustered_facts", []),
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)

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
    
    # [FIX] Ne rechercher l'entreprise que si elle est renseignée
    safe_company = str(company).strip() if company else ""
    company_context = f'"{safe_company}"'
    if safe_company and safe_company.lower() != "unknown" and safe_company.lower() != "none":
        queries.extend([
            f"{company_context} actualités stratégiques récentes {current_year}", # [NEW] Force la recherche d'actualités chaudes
            f"{company_context} nouveaux projets ou acquisitions {current_year}", # [NEW] Détecte les pivots de l'entreprise
            f"{company_context} plan stratégique vision",
            f"{company_context} résultats financiers chiffre d'affaires",
            f"{company_context} valeurs culture d'entreprise",
            f"{company_context} recrutement process RH",
            f"{company_context} dirigeants CEO",
            f"{company_context} concurrents parts de marché",
            f"{company_context} avis employés",
            f"{company_context} rapport ESG RSE durabilité {current_year}" # [NEW] Pour plus de détails sur la culture et les valeurs
        ])
        
    safe_industry = str(industry).strip() if industry else ""
    if safe_industry and safe_industry.lower() != "unknown" and safe_industry.lower() != "none":
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
                                .replace("{results}", json.dumps(results[:20], default=str)) \
                                .replace("{lang}", lang) \
                                .replace("{current_date}", datetime.now().strftime("%Y-%m-%d"))
    else:
        prompt = f"""
        Analyze these search results for company '{company}'.
        Extract key facts: Financials, Strategy, Culture, Competitors, Products, News, Recruitment Process.
        
        SEARCH RESULTS:
        {json.dumps(results[:20], default=str)}
        
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
    safe_company["linkedin_url"] = company.get("linkedin_url") or ""
    safe_company["strategic_challenges"] = company.get("strategic_challenges") or company.get("defis_strategiques") or []
    safe_company["news_links"] = company.get("news_links") or company.get("actualites") or root.get("news_links") or root.get("actualites") or []

    return {
        "market_report": safe_market,
        "company_report": safe_company
    }

async def perform_market_research(data: dict, task_id: str = None) -> dict:
    """
    Exécute le pipeline agentique complet (V2) de manière asynchrone.
    Si `_cached_market_report` est injecté dans data (par tasks.py via le cache L3),
    la partie marché est skippée et seule la partie entreprise est générée.
    """
    company = data.get('target_company')
    industry = data.get('target_industry', 'Unknown')
    role = data.get('target_role_primary') or data.get('target_job', 'Candidat')
    provider = data.get('provider') # Permet de forcer 'gemini' ou 'openai' depuis le front
    target_lang = data.get('target_language', 'French')
    target_country = data.get('target_country', 'Global')
    cached_market_report = data.get('_cached_market_report')  # Injecté par tasks.py si L3 HIT

    print(f"[PIPELINE] Starting Deep Market Research for: {company}", flush=True)
    if cached_market_report:
        print(f"[PIPELINE] ♻️ Market report from shared cache (L3), skipping market generation.", flush=True)
    if task_id:
        await manager.broadcast(task_id, f"Démarrage de l'analyse pour {company}...")
    
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        msg = "⚠️ Clé de recherche manquante. Mode 'Connaissances Générales' activé."
        print(f"[PIPELINE] {msg}", flush=True)
        if task_id:
            await manager.broadcast(task_id, msg)

    # --- ÉTAPE 1 : COUCHE 1 - PROFIL ENTREPRISE ---
    company_profile = {}
    if task_id:
        await manager.broadcast(task_id, "🏢 Couche 1 : Construction du profil stratégique de l'entreprise...")
        
    safe_company = str(company).strip() if company else ""
    if safe_company and safe_company.lower() not in ["unknown", "none"]:
        profile_prompt = f"""
        Génère un profil express de l'entreprise '{safe_company}' dans le secteur '{industry}'. 
        JSON attendu : {{"ceo": "Nom", "competitors": ["C1", "C2"]}}
        Si inconnu, laisse vide.
        """
        try:
            profile_res = await ai_service.generate_valid_json(profile_prompt, provider="gemini", system_instruction="You are a data API.", bypass_queue=True)
            company_profile = profile_res if "error" not in profile_res else {}
        except Exception:
            pass

    # --- ÉTAPE 2 : COUCHE 2 - RECHERCHE ORIENTÉE ENTRETIEN ---
    if task_id:
        await manager.broadcast(task_id, "🧠 Couche 2 : Génération de requêtes thématiques (Stratégie, RH, Risques, Marchés)...")
        
    current_year = datetime.now().year
    ceo_name = company_profile.get("ceo", "")
    queries = []
    role_lower = role.lower()
    
    # [MODIFIÉ] Personnalisation des requêtes en fonction du poste visé
    role_specific_keywords = {
        "rh": "(recrutement OR talents OR culture OR syndicats OR 'marque employeur')",
        "financ": "(résultats financiers OR rentabilité OR acquisition OR levée de fonds OR 'marge opérationnelle')",
        "cyber": "(cyberattaque OR cybersécurité OR 'protection des données' OR 'souveraineté numérique' OR SOC OR CISO)",
        "rse": "(ESG OR durabilité OR 'rapport extra-financier' OR 'impact environnemental')",
        "industr": "(supply chain OR 'chaîne d'approvisionnement' OR production OR usine OR logistique)",
        "commercial": "('développement commercial' OR 'nouveau marché' OR 'partenariat stratégique' OR 'conquête client')",
        "marketing": "('lancement produit' OR 'campagne marketing' OR 'image de marque' OR 'notoriété')",
    }
    
    # Recherche du mot-clé correspondant au rôle
    specific_theme = next((keywords for key, keywords in role_specific_keywords.items() if key in role_lower), None)
    
    fixed_queries = generate_deterministic_queries(safe_company, industry)

    if safe_company and safe_company.lower() not in ["unknown", "none"]:
        queries = [
            f'"{safe_company}" (stratégie OR croissance OR transformation) {current_year}',
            f'"{safe_company}" (résultats OR chiffre d\'affaires OR rentabilité OR marge) {current_year}',
            f'"{safe_company}" (recrutement OR talents OR culture OR management) {current_year}',
            f'"{safe_company}" (transformation OR réorganisation OR investissement) {current_year}',
            f'"{safe_company}" (difficultés OR retard OR controverse OR licenciement OR critique OR risque)',
        ]
        if specific_theme:
            queries.append(f'"{safe_company}" {specific_theme} {current_year}')
        else: # Fallback si le rôle n'est pas dans la liste
            queries.append(f'"{safe_company}" (innovation OR "nouveau projet") {current_year}')

        if ceo_name:
            queries.append(f'"{ceo_name}" CEO "{safe_company}" interview {current_year}')
    else:
        safe_industry = str(industry).strip() if industry else "Secteur inconnu"
        queries = [
            f'{safe_industry} market trends challenges {current_year}',
            f'{safe_industry} in-demand skills recruitment {current_year}'
        ]

    ai_queries = await generate_ai_search_plan(safe_company, industry, role, target_country, provider=provider)
    queries = _deduplicate_queries([*queries, *fixed_queries, *ai_queries], limit=15)
        
    print(f"[PIPELINE] Executing {len(queries)} thematic queries.", flush=True)
    
    # --- ÉTAPE 3 & 4 : COLLECTE ET EXTRACTION (Nouvel Agent OSINT) ---
    if task_id:
        await manager.broadcast(task_id, f"🌍 Agent OSINT : Exploration et extraction du contenu web...")
    
    search_context = ""
    selected_articles: list[dict] = []
    extracted_facts: list[dict] = []
    clustered_signals: dict = {"clusters": [], "unclustered_facts": []}
    if api_key:
        try:
            osint_agent = OSINTPipeline(serper_api_key=api_key)
            raw_articles = await osint_agent.run_structured(company_name=safe_company, queries=queries, max_articles=20)
            scored_articles = await _score_osint_articles(raw_articles, company=safe_company, role=role, provider=provider)
            scored_articles = sorted(scored_articles, key=lambda item: int(item.get("candidate_score") or 0), reverse=True)
            selected_articles = [article for article in scored_articles if int(article.get("candidate_score") or 0) >= 55][:10]
            if not selected_articles:
                selected_articles = scored_articles[:8]

            extracted_facts = await _extract_osint_facts(selected_articles, provider=provider)
            clustered_signals = await _cluster_osint_facts(extracted_facts, safe_company, industry, role, target_country, provider=provider)
            search_context = _build_structured_search_context(selected_articles, extracted_facts, clustered_signals)
        except Exception as e:
            print(f"[PIPELINE] OSINT Agent failed: {e}", flush=True)
            search_context = "ERREUR LORS DE L'ANALYSE OSINT. UTILISE TES CONNAISSANCES GÉNÉRALES."
    else:
        if task_id:
            await manager.broadcast(task_id, "⚠️ Pas de résultats web, utilisation des connaissances générales...")
        search_context = "AUCUN RÉSULTAT WEB RÉCENT. UTILISE TES CONNAISSANCES GÉNÉRALES."

    # --- ÉTAPE 5 : COUCHE 5 - RÉDACTION DU RAPPORT FINAL ---
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
                "strategic_challenges": [
                    "[Défi ultra-spécifique 1]",
                    "[Défi ultra-spécifique 2]"
                ],
                "news_links": [
                    {{
                        "title": "[Article title]",
                        "url": "https://...",
                        "source": "[Media name]",
                        "date": "[Date]",
                        "strategic_analysis": "[Actionable strategic advice for the candidate]"
                    }}
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

    # [CACHE L3] Si le market_report était en cache, on réutilise le contenu stocké
    # (plus riche car généré une première fois avec les vraies données Serper).
    if cached_market_report and isinstance(cached_market_report, dict):
        safe_synthesis["market_report"] = cached_market_report
        if task_id:
            await manager.broadcast(task_id, "♻️ Données marché injectées depuis le cache partagé.")

    # On récupère le tableau d'actualités généré par l'IA contenant son analyse stratégique
    ai_generated_news = safe_synthesis["company_report"].get("news_links", [])
    extracted_web_urls = [article.get("url") for article in selected_articles if article.get("url")]
    source_map = {
        str(article.get("url")): article
        for article in selected_articles
        if isinstance(article, dict) and article.get("url")
    }
    
    # Extraction intelligente des analyses IA tout en conservant les URLs RÉELLES (issues de Serper)
    ai_analyses = []
    if isinstance(ai_generated_news, list):
        for news in ai_generated_news:
            if isinstance(news, dict):
                analysis = news.get('strategic_analysis') or news.get('analyse_strategique') or news.get('conseil_strategique') or news.get('conseil') or ""
                if analysis or news.get("hidden_meaning") or news.get("interview_relevance"):
                    ai_analyses.append({
                        "url": news.get("url", ""),
                        "title": news.get("title", ""),
                        "source": news.get("source", "Presse / Web"),
                        "date": news.get("date", datetime.now().strftime("%Y-%m-%d")),
                        "analysis": analysis,
                        "interview_relevance": news.get("interview_relevance"),
                        "hidden_meaning": news.get("hidden_meaning", "")
                    })

    if not isinstance(ai_generated_news, list):
        ai_generated_news = []

    # Remplacement des URLs factices/vides par des URLs réelles trouvées dans le contexte web.
    replacement_idx = 0
    normalized_news = []
    for news in ai_generated_news:
        if not isinstance(news, dict):
            continue
        url = str(news.get("url") or "").strip()
        if _is_placeholder_url(url):
            if replacement_idx < len(extracted_web_urls):
                url = extracted_web_urls[replacement_idx]
                replacement_idx += 1
        if _is_placeholder_url(url):
            continue

        source_data = source_map.get(url, {})

        normalized_news.append({
            "title": news.get("title") or f"Article source {_domain_from_url(url)}",
            "url": url,
            "source": news.get("source") or source_data.get("source") or _domain_from_url(url),
            "date": news.get("date") or source_data.get("published_at") or datetime.now().strftime("%Y-%m-%d"),
            "strategic_analysis": news.get("strategic_analysis") or news.get("analyse_strategique") or "",
            "interview_relevance": news.get("interview_relevance") or source_data.get("candidate_score"),
            "hidden_meaning": news.get("hidden_meaning", "")
        })

    # Si l'IA n'a pas produit de liens exploitables, on construit une revue de presse minimale à partir des URLs web réelles.
    if not normalized_news and extracted_web_urls:
        normalized_news = [
            {
                "title": source_map.get(url, {}).get("title") or f"Source presse: {_domain_from_url(url)}",
                "url": url,
                "source": source_map.get(url, {}).get("source") or _domain_from_url(url),
                "date": source_map.get(url, {}).get("published_at") or datetime.now().strftime("%Y-%m-%d"),
                "strategic_analysis": "Source réelle collectée automatiquement. Analyse détaillée indisponible pour cette entrée.",
                "interview_relevance": source_map.get(url, {}).get("candidate_score"),
                "hidden_meaning": ""
            }
            for url in extracted_web_urls[:8]
        ]

    safe_synthesis["company_report"]["news_links"] = normalized_news
    display_sources = extracted_web_urls

    return {
        "company": company,
        "market_report": safe_synthesis["market_report"],
        "company_report": safe_synthesis["company_report"],
        "sources": display_sources
    }
