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

# --- NORMALISATION ET DÉSAMBIGUÏSATION DES NOMS D'ENTREPRISE ---

_LEGAL_FORM_SUFFIXES = [
    r"\bsa\b", r"\bsas\b", r"\bsasu\b", r"\bsarl\b", r"\beurl\b",
    r"\bscop\b", r"\bscs\b", r"\bsca\b", r"\bsci\b", r"\bscp\b",
    r"\bgie\b", r"\bsem\b", r"\bsnc\b", r"\bcs\b", r"\bse\b",
    r"\bllc\b", r"\binc\b", r"\bcorp\b", r"\bltd\b", r"\bplc\b",
    r"\b&g(?:\.en commandite)?\b", r"\b& co\b", r"\band co\b",
    r"\bet cie\b", r"\b& cie\b",
]

_LEGAL_FORM_PATTERN = re.compile(
    r"\s*(?:" + "|".join(_LEGAL_FORM_SUFFIXES) + r")\s*\.?\s*$",
    re.IGNORECASE,
)


def _normalize_company_name(name: str | None) -> str:
    """
    Nettoie une raison sociale brute pour la recherche web.
    - Supprime les espaces multiples
    - Supprime les formes juridiques en fin de nom (SA, SAS, SARL, Cie, etc.)
    - Remplace les ET isolés par &
    - Évite les '&' ou 'et' finaux résiduels
    - Capitalise proprement chaque mot
    """
    if not name:
        return ""
    cleaned = str(name).strip()
    # Uniformise les espaces
    cleaned = re.sub(r"\s+", " ", cleaned)
    # Supprime d'abord les formes juridiques en fin de nom
    cleaned = _LEGAL_FORM_PATTERN.sub("", cleaned)
    # Remplace ET CIE / ET CIE par & Cie, puis ET isolé par &
    cleaned = re.sub(r"\bET\s+CIE\b", "& Cie", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bET\b", "&", cleaned)
    # Supprime les connecteurs finaux résiduels (&, et, and)
    cleaned = re.sub(r"\s*\b(?:&|et|and)\b\s*$", "", cleaned, flags=re.IGNORECASE)
    # Nettoie la ponctuation et les espaces résiduels
    cleaned = re.sub(r"[\s,;]+$", "", cleaned).strip()
    # Capitalise chaque mot (titre)
    return cleaned.title()


def _generate_company_variants(name: str | None) -> list[str]:
    """
    Génère les variantes de recherche d'un nom d'entreprise.
    Ordre : forme canonique -> formes raccourcies -> formes alternatives.
    """
    base = _normalize_company_name(name)
    if not base:
        return []

    variants = {base}

    # Variante avec & remplacé par et
    if "&" in base:
        variants.add(base.replace("&", "et"))
    # Variante avec et remplacé par &
    if " et " in base.lower():
        variants.add(re.sub(r"\bet\b", "&", base, flags=re.IGNORECASE))

    # Raccourci : mot le plus discriminant (ex: Delubac)
    words = [w for w in base.split() if len(w) > 2]
    for w in words:
        variants.add(w)

    # Nom sans "Banque" / "Groupe" / "Holding"
    for prefix in ["Banque", "Groupe", "Holding", "Société", "Societe"]:
        if base.lower().startswith(prefix.lower()):
            short = base[len(prefix):].strip()
            if short and len(short) > 2:
                variants.add(short)

    # Raison sociale brute telle que saisie (pour ne pas perdre la forme exacte)
    raw = str(name or "").strip()
    if raw:
        variants.add(raw)

    # Trie par longueur décroissante pour privilégier les requêtes les plus spécifiques
    return sorted(variants, key=lambda x: (-len(x), x.lower()))


def _is_likely_official_domain(domain: str, company: str) -> bool:
    """
    Heuristique rapide : est-ce que le domaine ressemble au nom de l'entreprise ?
    """
    if not domain or not company:
        return False
    normalized_company = _normalize_company_name(company).lower()
    domain_root = domain.lower().replace("www.", "", 1)
    # Extrait le nom de domaine sans extension
    domain_name = domain_root.split(".")[0] if "." in domain_root else domain_root

    # Correspondance directe
    if domain_name in normalized_company or normalized_company in domain_name:
        return True

    # Correspondance sur un mot significatif (>3 caractères)
    company_words = [w for w in normalized_company.split() if len(w) > 3]
    for word in company_words:
        if word in domain_name:
            return True

    return False


# Cache de session simple pour éviter de rechercher plusieurs fois la même entreprise
# en cas de requêtes concurrentes.
_COMPANY_IDENTIFICATION_CACHE: dict[str, dict] = {}


async def _identify_company_online(company: str, industry: str | None = None) -> dict:
    """
    Phase d'identification préliminaire : combine une recherche web rapide et
    un prompt de désambiguïsation IA (company_disambiguation_v1.md) pour
    identifier l'entreprise avec certitude, même en cas de nom alternatif.
    Retourne un dict avec : official_domain, confidence, sources, queries.
    """
    import os
    cache_key = f"{company.lower().strip()}|{str(industry or '').lower().strip()}"
    if cache_key in _COMPANY_IDENTIFICATION_CACHE:
        return _COMPANY_IDENTIFICATION_CACHE[cache_key]

    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        result = {"official_domain": None, "confidence": 0, "sources": [], "queries": [], "error": "no_api_key"}
        _COMPANY_IDENTIFICATION_CACHE[cache_key] = result
        return result

    variants = _generate_company_variants(company)[:5]
    queries = []
    for variant in variants:
        queries.append(f'"{variant}"')
        queries.append(f'"{variant}" site officiel')
        if " " in variant:
            queries.append(variant)

    queries = _deduplicate_queries(queries, limit=12)

    try:
        osint = OSINTPipeline(serper_api_key=api_key)
        articles = await osint.run_structured(company_name=company, queries=queries, max_articles=15)
    except Exception as e:
        print(f"[IDENTIFICATION] OSINT error for {company}: {e}", flush=True)
        error_result = {"official_domain": None, "confidence": 0, "sources": [], "queries": queries, "error": str(e)}
        _COMPANY_IDENTIFICATION_CACHE[cache_key] = error_result
        return error_result

    # --- DÉSAMBIGUÏSATION PAR IA ---
    disambiguation_prompt = load_prompt("company_disambiguation_v1.md")
    ai_candidates: list[dict] = []
    if disambiguation_prompt:
        context_json = json.dumps({
            "industry": industry,
            "query_variants": variants,
            "search_snippets": [
                {"title": a.get("title"), "snippet": a.get("snippet"), "url": a.get("url")}
                for a in articles[:10]
            ],
        }, ensure_ascii=False, default=str)
        final_prompt = disambiguation_prompt \
            .replace("{{USER_QUERY}}", company) \
            .replace("{{CONTEXT_JSON}}", context_json)
        try:
            ai_res = await ai_service.generate_valid_json(
                final_prompt,
                provider="openai",
                system_instruction="You are a strict JSON-only business intelligence API. Output valid JSON only.",
                bypass_queue=True,
            )
            if "error" not in ai_res:
                ai_candidates = [c for c in ai_res.get("candidates", []) if isinstance(c, dict)]
        except Exception as e:
            print(f"[IDENTIFICATION] AI disambiguation error for {company}: {e}", flush=True)

    # Si l'IA a identifié un candidat fiable, on l'utilise comme source de vérité.
    best_ai = ai_candidates[0] if ai_candidates else None
    if best_ai and best_ai.get("confidence", 0) >= 0.7:
        official_domain = best_ai.get("official_domain")
        if official_domain and "." in str(official_domain):
            selected = {
                "domain": str(official_domain).lower().replace("www.", "", 1),
                "name": best_ai.get("name"),
                "search_name": best_ai.get("search_name"),
                "match_reason": best_ai.get("match_reason"),
                "confidence": int(min(best_ai.get("confidence", 0) * 100, 100)),
            }
            result = {
                "official_domain": selected["domain"],
                "confidence": selected["confidence"],
                "sources": [selected, *ai_candidates[1:5]],
                "queries": queries,
                "ai_disambiguation": True,
            }
            _COMPANY_IDENTIFICATION_CACHE[cache_key] = result
            return result

    # Analyse heuristique des résultats pour trouver un domaine officiel probable
    candidates = []
    rejected_domains: list[dict] = []
    for art in articles:
        url = art.get("url") or ""
        try:
            host = urlparse(url).netloc.lower().replace("www.", "", 1)
        except Exception:
            rejected_domains.append({"url": url, "reason": "unparseable_url"})
            continue
        if not host or "." not in host:
            rejected_domains.append({"url": url, "reason": "invalid_host"})
            continue
        if _is_placeholder_url(url):
            rejected_domains.append({"domain": host, "reason": "placeholder_url"})
            continue

        score = 0
        title = (art.get("title") or "").lower()
        snippet = (art.get("snippet") or "").lower()

        if _is_likely_official_domain(host, company):
            score += 30
        if any(v.lower() in title for v in variants):
            score += 20
        if any(v.lower() in snippet for v in variants):
            score += 10
        if host.count(".") == 1:  # domaine racine probable (ex: delubac.com)
            score += 10

        candidates.append({"domain": host, "url": url, "score": score, "title": art.get("title"), "snippet": art.get("snippet")})

    # Dédoublonne par domaine en gardant le meilleur score
    by_domain = {}
    for c in candidates:
        domain = c["domain"]
        if domain not in by_domain or by_domain[domain]["score"] < c["score"]:
            by_domain[domain] = c

    sorted_candidates = sorted(by_domain.values(), key=lambda x: x["score"], reverse=True)

    best = sorted_candidates[0] if sorted_candidates else None
    selected_domain = best["domain"] if best else None
    disambiguation_score = best["score"] if best else 0

    # Synthèse des motifs de rejet pour le diagnostic
    reason_counts: dict[str, int] = {}
    for r in rejected_domains:
        reason_counts[r.get("reason", "unknown")] = reason_counts.get(r.get("reason", "unknown"), 0) + 1
    rejection_reason = ", ".join(f"{reason}: {count}" for reason, count in reason_counts.items()) if reason_counts else ""

    # Log structuré pour le diagnostic
    log_payload = {
        "event": "company_identification",
        "company_input": company,
        "normalized_names": list(variants),
        "queries_sent": queries,
        "results_returned": len(articles),
        "results_rejected": len(rejected_domains),
        "rejection_reason": rejection_reason,
        "selected_domain": selected_domain,
        "disambiguation_score": disambiguation_score,
        "timeout_stage": False,
        "candidates": sorted_candidates[:5],
    }
    print(json.dumps(log_payload, ensure_ascii=False, default=str), flush=True)

    if best and disambiguation_score >= 30:
        result = {
            "official_domain": selected_domain,
            "confidence": min(disambiguation_score, 100),
            "sources": sorted_candidates[:5],
            "queries": queries,
        }
    else:
        result = {
            "official_domain": selected_domain,
            "confidence": disambiguation_score,
            "sources": sorted_candidates[:5],
            "queries": queries,
        }

    _COMPANY_IDENTIFICATION_CACHE[cache_key] = result
    return result


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

def generate_deterministic_queries(company: str, industry: str, official_domain: str | None = None) -> list:
    """
    Génère des requêtes de recherche de manière déterministe (sans IA).
    Beaucoup plus robuste et rapide que d'attendre un agent 'Planner'.
    Utilise les variantes normalisées du nom (ET -> &, formes raccourcies, etc.)
    et privilégie le site officiel quand il a été identifié.
    """
    current_year = datetime.now().year
    queries = []

    # [FIX] Ne rechercher l'entreprise que si elle est renseignée
    safe_company = str(company).strip() if company else ""
    if safe_company and safe_company.lower() not in {"unknown", "none", ""}:
        variants = _generate_company_variants(safe_company)
        # La première variante est la plus complète/normalisée
        primary = variants[0] if variants else safe_company
        company_context = f'"{primary}"'

        queries.extend([
            f"{company_context} actualités stratégiques récentes {current_year}",
            f"{company_context} nouveaux projets ou acquisitions {current_year}",
            f"{company_context} plan stratégique vision",
            f"{company_context} résultats financiers chiffre d'affaires",
            f"{company_context} valeurs culture d'entreprise",
            f"{company_context} recrutement process RH",
            f"{company_context} dirigeants CEO",
            f"{company_context} concurrents parts de marché",
            f"{company_context} avis employés",
            f"{company_context} rapport ESG RSE durabilité {current_year}",
        ])

        # Si un site officiel a été identifié, on ajoute des requêtes ciblées
        if official_domain:
            domain_query = official_domain.replace("www.", "", 1)
            queries.extend([
                f"site:{domain_query} présentation groupe chiffres",
                f"site:{domain_query} actualités {current_year}",
                f"site:{domain_query} métiers recrutement",
            ])

        # Ajoute quelques variantes courtes pour élargir la couverture
        for variant in variants[1:3]:
            queries.append(f'"{variant}" actualités {current_year}')

    safe_industry = str(industry).strip() if industry else ""
    if safe_industry and safe_industry.lower() not in {"unknown", "none", ""}:
        queries.extend([
            f"{industry} market trends AI sustainability digitalization {current_year}",
            f"{industry} most in-demand skills hard soft skills {current_year}",
            f"{industry} competitive landscape startups challengers {current_year}",
            f"{industry} recruitment trends hiring volume {current_year}",
            f"{industry} salary benchmarks {current_year}"
        ])

    return _deduplicate_queries(queries, limit=20)

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

def build_unknown_company_fallback(company: str | None, industry: str | None, identification: dict | None = None) -> dict:
    """
    Fallback rapide lorsque la recherche web échoue ou dépasse le délai imparti.
    Le message est volontairement prudent : on indique que l'identification n'a pas
    pu être confirmée dans le temps imparti, sans affirmer que l'entreprise est inconnue.
    """
    company_name = company or "Entreprise ciblée"
    sector = industry or "Secteur non renseigné"
    reason = ""
    if identification:
        if identification.get("error"):
            reason = f" (erreur technique : {identification['error']})"
        elif identification.get("sources"):
            reason = f" (meilleur candidat trouvé : {identification['sources'][0].get('domain')}, score {identification['sources'][0].get('score')})"

    return {
        "company": company_name,
        "market_report": {
            "tension_index": "Données marché temporairement indisponibles.",
            "tension_score": 0,
            "salary_barometer": "Données salariales temporairement indisponibles.",
            "competitive_landscape": "Analyse concurrentielle indisponible.",
            "trends": "Tendances de marché non disponibles.",
            "recruitment_dynamics": "Données de recrutement non disponibles.",
            "major_disruptions": "Aucune information disponible.",
            "top_skills": {"hard": [], "soft": []},
        },
        "company_report": {
            "key_figures": "Aucun chiffre clé disponible.",
            "leadership": "Direction non renseignée.",
            "identity_dna": f"Nous n'avons pas pu identifier '{company_name}' ({sector}) avec suffisamment de certitude dans le temps imparti.{reason} Vérifiez le nom de l'entreprise ou réessayez.",
            "financial_health": "Données financières non disponibles.",
            "usp": "Aucune information disponible.",
            "culture_environment": "Culture d'entreprise non disponible.",
            "team_structure": "Structure des équipes non disponible.",
            "linkedin_url": "",
            "strategic_challenges": ["Données stratégiques non disponibles."],
            "news_links": [],
        },
        "sources": [],
        "identification": identification or {},
    }


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

    safe_company = _normalize_company_name(company)
    raw_company = str(company or "").strip()

    # --- ÉTAPE 1b — IDENTIFICATION PRÉLIMINAIRE ---
    # On essaie de confirmer l'entreprise en ligne avec des requêtes courtes avant
    # de lancer l'analyse thématique complète. Cela résout les ratés liés à la
    # normalisation (ET vs &, casse, formes juridiques).
    identification = None
    official_domain = None
    if api_key and safe_company and safe_company.lower() not in {"unknown", "none"}:
        if task_id:
            await manager.broadcast(task_id, "🔎 Identification préliminaire de l'entreprise en ligne...")
        try:
            identification = await asyncio.wait_for(
                _identify_company_online(raw_company, industry),
                timeout=20.0,
            )
            official_domain = identification.get("official_domain")
            if official_domain:
                print(f"[IDENTIFICATION] Official domain confirmed for {raw_company}: {official_domain}", flush=True)
                if task_id:
                    await manager.broadcast(task_id, f"✅ Entreprise identifiée : {official_domain}")
            else:
                print(f"[IDENTIFICATION] Could not confirm company {raw_company} (confidence={identification.get('confidence')})", flush=True)
        except asyncio.TimeoutError:
            identification = {"error": "identification_timeout", "timeout_stage": True}
            print(json.dumps({
                "event": "company_identification",
                "company_input": raw_company,
                "normalized_names": list(_generate_company_variants(raw_company)),
                "queries_sent": [],
                "results_returned": 0,
                "results_rejected": 0,
                "rejection_reason": "",
                "selected_domain": None,
                "disambiguation_score": 0,
                "timeout_stage": True,
                "candidates": [],
                "error": "identification_timeout",
            }, ensure_ascii=False, default=str), flush=True)
            if task_id:
                await manager.broadcast(task_id, "⏱️ L'identification de l'entreprise a dépassé le temps imparti.")
        except Exception as e:
            identification = {"error": str(e), "timeout_stage": False}
            print(json.dumps({
                "event": "company_identification",
                "company_input": raw_company,
                "normalized_names": list(_generate_company_variants(raw_company)),
                "queries_sent": [],
                "results_returned": 0,
                "results_rejected": 0,
                "rejection_reason": "",
                "selected_domain": None,
                "disambiguation_score": 0,
                "timeout_stage": False,
                "candidates": [],
                "error": str(e),
            }, ensure_ascii=False, default=str), flush=True)

    if safe_company and safe_company.lower() not in {"unknown", "none"}:
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
    
    fixed_queries = generate_deterministic_queries(safe_company, industry, official_domain=official_domain)

    if safe_company and safe_company.lower() not in {"unknown", "none"}:
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
