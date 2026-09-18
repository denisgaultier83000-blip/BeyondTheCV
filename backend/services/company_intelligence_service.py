"""
Module d'intelligence économique multi-sources pour BTCV.

Principe : enrichir l'analyse entreprise avec des sources publiques et légales,
sans jamais scraper directement les plateformes protégées (LinkedIn, Glassdoor, etc.).
Les données sont récupérées via APIs officielles ou moteurs de recherche.

Sources intégrées :
- SIRENE (API INSEE) : identité, forme juridique, effectifs, siège social
- Annuaire des Entreprises (API data.gouv) : dirigeants, comptes, annonces BODACC
- GitHub (API publique) : repos, langages, activité tech
- Offres d'emploi (via Serper/Google search) : recrutements actifs, technologies
- Glassdoor/Indeed avis (via moteur de recherche uniquement) : signaux culture
- Réseaux sociaux (via moteur de recherche) : Instagram, YouTube, TikTok

Chaque source est traitée comme un signal. Le croisement est fait par IA
et exposé sous forme de "signaux détectés" orientés entretien.
"""

import os
import re
import json
import asyncio
from datetime import datetime, timedelta
from urllib.parse import urlparse, quote_plus
from typing import Optional

try:
    import httpx
except ImportError:
    httpx = None

from .utils import load_prompt, clean_ai_json_response
from .ai_feature_caller import ai_call
from .search_service import search_web


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------

def _normalize_siren(siren: str | None) -> str | None:
    if not siren:
        return None
    cleaned = re.sub(r"\D", "", str(siren))
    return cleaned if len(cleaned) == 9 else None


def _safe_get(data: dict, *keys, default=None):
    for key in keys:
        if isinstance(data, dict) and key in data:
            data = data[key]
        else:
            return default
    return data


def _extract_siren_from_text(text: str | None) -> str | None:
    """Extrait un numéro SIREN à 9 chiffres d'un texte."""
    if not text:
        return None
    matches = re.findall(r"\b\d{3}\s?\d{3}\s?\d{3}\b", str(text))
    if matches:
        return re.sub(r"\D", "", matches[0])
    return None


def _http_client():
    if not httpx:
        raise RuntimeError("httpx n'est pas installé")
    return httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0))


# ---------------------------------------------------------------------------
# Provider : API SIRENE (INSEE)
# ---------------------------------------------------------------------------

async def fetch_sirene_data(company_name: str | None = None, siren: str | None = None) -> dict:
    """
    Interroge l'API SIRENE v3.11 de l'INSEE.
    Pas besoin de clé API pour les requêtes simples (rate limit appliqué).
    """
    result = {
        "source": "sirene",
        "status": "unknown",
        "data": {},
        "error": None,
    }
    if not company_name and not siren:
        result["status"] = "skipped"
        return result

    try:
        async with _http_client() as client:
            if siren:
                url = f"https://api.insee.fr/entreprises/sirene/V3.11/siren/{siren}"
                resp = await client.get(url)
            else:
                q = quote_plus(company_name)
                url = (
                    "https://api.insee.fr/entreprises/sirene/V3.11/siren"
                    f"?q=periode( denominationUniteLegale:*{q}* )"
                    f"&nombre=5"
                )
                resp = await client.get(url)

            if resp.status_code == 404:
                result["status"] = "not_found"
                return result
            if resp.status_code != 200:
                result["status"] = "error"
                result["error"] = f"HTTP {resp.status_code}"
                return result

            payload = resp.json()
            unite = None
            if siren:
                unite = payload.get("uniteLegale")
            else:
                units = payload.get("unitesLegales", [])
                unite = units[0] if units else None

            if not unite:
                result["status"] = "not_found"
                return result

            periodes = unite.get("periodesUniteLegale", [])
            current = periodes[0] if periodes else {}

            result.update({
                "status": "ok",
                "data": {
                    "siren": unite.get("siren"),
                    "denomination": current.get("denominationUniteLegale") or current.get("denominationUsuelle1UniteLegale"),
                    "forme_juridique": current.get("categorieJuridiqueUniteLegale"),
                    "date_creation": unite.get("dateCreationUniteLegale"),
                    "effectif": current.get("trancheEffectifsUniteLegale"),
                    "activite_principale": current.get("activitePrincipaleUniteLegale"),
                    "economie_sociale_solidaire": current.get("economieSocialeSolidaireUniteLegale"),
                    "societe_mission": current.get("societeMissionUniteLegale"),
                    "etat_administratif": current.get("etatAdministratifUniteLegale"),
                    "sigle": current.get("sigleUniteLegale"),
                },
            })
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


async def fetch_sirene_etablissements(siren: str | None) -> dict:
    """Récupère le siège social et les établissements d'une entreprise."""
    result = {"source": "sirene_etablissements", "status": "unknown", "data": {}, "error": None}
    siren = _normalize_siren(siren)
    if not siren:
        result["status"] = "skipped"
        return result

    try:
        async with _http_client() as client:
            url = (
                "https://api.insee.fr/entreprises/sirene/V3.11/siret"
                f"?q=siren:{siren}"
                f"&nombre=20"
            )
            resp = await client.get(url)
            if resp.status_code != 200:
                result["status"] = "error"
                result["error"] = f"HTTP {resp.status_code}"
                return result

            payload = resp.json()
            etabs = payload.get("etablissements", [])
            if not etabs:
                result["status"] = "not_found"
                return result

            siege = next((e for e in etabs if e.get("etablissementSiege") is True), etabs[0])
            adresse = siege.get("adresseEtablissement", {})

            result.update({
                "status": "ok",
                "data": {
                    "nombre_etablissements": len(etabs),
                    "siege": {
                        "siret": siege.get("siret"),
                        "enseigne": siege.get("enseigne1Etablissement"),
                        "adresse": " ".join(
                            filter(
                                None,
                                [
                                    adresse.get("numeroVoieEtablissement"),
                                    adresse.get("typeVoieEtablissement"),
                                    adresse.get("libelleVoieEtablissement"),
                                    adresse.get("codePostalEtablissement"),
                                    adresse.get("libelleCommuneEtablissement"),
                                    adresse.get("paysEtrangerEtablissement"),
                                ],
                            )
                        ),
                    },
                    "date_debut_activite": siege.get("dateDebut"),
                    "activite_principale": siege.get("activitePrincipaleEtablissement"),
                },
            })
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# Provider : Annuaire des Entreprises (data.gouv)
# ---------------------------------------------------------------------------

async def fetch_annuaire_entreprises(siren: str | None) -> dict:
    """
    Interroge l'API Annuaire des Entreprises.
    Agrège SIRENE, RNE/INPI, BODACC, comptes annuels.
    """
    result = {"source": "annuaire_entreprises", "status": "unknown", "data": {}, "error": None}
    siren = _normalize_siren(siren)
    if not siren:
        result["status"] = "skipped"
        return result

    try:
        async with _http_client() as client:
            url = f"https://recherche-entreprises.api.gouv.fr/search?q={siren}&page=1&per_page=1"
            resp = await client.get(url)
            if resp.status_code != 200:
                result["status"] = "error"
                result["error"] = f"HTTP {resp.status_code}"
                return result

            payload = resp.json()
            results = payload.get("results", [])
            if not results:
                result["status"] = "not_found"
                return result

            ent = results[0]
            result.update({
                "status": "ok",
                "data": {
                    "siren": ent.get("siren"),
                    "denomination": ent.get("nom_complet"),
                    "nombre_etablissements": ent.get("nombre_etablissements"),
                    "nombre_employees": ent.get("nombre_employees"),
                    "date_creation": ent.get("date_creation"),
                    "secteur_activite": ent.get("secteur_activite"),
                    "activite_principale": ent.get("activite_principale"),
                    "tranche_effectif_salarie": ent.get("tranche_effectif_salarie"),
                    "categorie_entreprise": ent.get("categorie_entreprise"),
                    "est_societe_a_mission": ent.get("est_societe_mission"),
                    "matching_etablissements": [
                        {
                            "siret": e.get("siret"),
                            "adresse": e.get("adresse"),
                            "est_siege": e.get("est_siege"),
                            "enseigne": e.get("enseigne"),
                        }
                        for e in ent.get("matching_etablissements", [])[:3]
                    ],
                    "complements": ent.get("complements", {}),
                    "dirigeants": ent.get("dirigeants", [])[:5],
                    "societe_a_mission": ent.get("societe_a_mission"),
                    "annee_categorie": ent.get("annee_categorie"),
                    "annee_tranche_effectif": ent.get("annee_tranche_effectif"),
                },
            })
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# Provider : GitHub (API publique, sans auth pour les requêtes basiques)
# ---------------------------------------------------------------------------

async def fetch_github_org(company_name: str | None, official_domain: str | None = None) -> dict:
    """
    Recherche l'organisation GitHub publique associée à l'entreprise.
    Pas de scraping : utilisation de l'API GitHub publique.
    """
    result = {"source": "github", "status": "unknown", "data": {}, "error": None}
    if not company_name:
        result["status"] = "skipped"
        return result

    # Heuristique : nom d'org probable (minuscule, sans espaces)
    base_name = re.sub(r"[^\w]", "", str(company_name).lower())
    candidates = [base_name]
    if official_domain:
        root = official_domain.lower().replace("www.", "", 1).split(".")[0]
        if root and root != base_name:
            candidates.append(root)

    try:
        async with _http_client() as client:
            for org in candidates:
                url = f"https://api.github.com/orgs/{org}"
                resp = await client.get(url)
                if resp.status_code == 200:
                    org_data = resp.json()
                    repos_url = org_data.get("repos_url")
                    repos = []
                    if repos_url:
                        r = await client.get(repos_url, params={"per_page": "10", "sort": "updated"})
                        if r.status_code == 200:
                            repos = [
                                {
                                    "name": repo.get("name"),
                                    "language": repo.get("language"),
                                    "description": repo.get("description"),
                                    "stargazers": repo.get("stargazers_count"),
                                    "updated_at": repo.get("updated_at"),
                                    "url": repo.get("html_url"),
                                }
                                for repo in r.json()
                            ]

                    languages = {}
                    for repo in repos:
                        lang = repo.get("language")
                        if lang:
                            languages[lang] = languages.get(lang, 0) + 1

                    result.update({
                        "status": "ok",
                        "data": {
                            "org": org,
                            "url": org_data.get("html_url"),
                            "public_repos": org_data.get("public_repos"),
                            "followers": org_data.get("followers"),
                            "blog": org_data.get("blog"),
                            "location": org_data.get("location"),
                            "repos": repos,
                            "top_languages": sorted(languages.items(), key=lambda x: -x[1])[:5],
                        },
                    })
                    return result
                if resp.status_code == 403:
                    # Rate limit atteint, on arrête
                    break

        result["status"] = "not_found"
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# Provider : Offres d'emploi (via moteur de recherche)
# ---------------------------------------------------------------------------

async def fetch_job_openings(company: str | None, role: str | None = None, serper_api_key: str | None = None) -> dict:
    """
    Détecte les offres d'emploi actives via Serper (moteur de recherche).
    Permet d'identifier les métiers recrutés, les technologies recherchées,
    les localisations et les signaux de croissance.
    """
    result = {"source": "job_openings", "status": "unknown", "data": {"openings": []}, "error": None}
    if not company or not serper_api_key:
        result["status"] = "skipped"
        return result

    safe_company = str(company).strip()
    queries = [
        f'"{safe_company}" offres d\'emploi',
        f'"{safe_company}" recrutement',
        f'"{safe_company}" site:linkedin.com/jobs',
        f'"{safe_company}" site:welcometothejungle.com',
    ]
    if role:
        queries.insert(0, f'"{safe_company}" "{role}" offre d\'emploi')

    try:
        all_items = []
        for query in queries[:5]:
            data = await search_web(query, api_key=serper_api_key)
            if data and isinstance(data, dict):
                for key in ("organic", "jobs", "results"):
                    items = data.get(key, [])
                    if isinstance(items, list):
                        all_items.extend(items)

        seen = set()
        openings = []
        for item in all_items:
            url = item.get("link") or item.get("url") or ""
            title = item.get("title") or ""
            snippet = item.get("snippet") or item.get("description") or ""
            if not url or url in seen:
                continue
            seen.add(url)
            openings.append({
                "title": title,
                "url": url,
                "snippet": snippet,
                "source": urlparse(url).netloc.lower().replace("www.", "", 1),
                "retrieval_method": "search_engine",
            })

        result.update({
            "status": "ok",
            "data": {
                "openings": openings[:15],
                "count": len(openings),
            },
        })
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


# ---------------------------------------------------------------------------
# Provider : Avis salariés et clients (via moteur de recherche uniquement)
# ---------------------------------------------------------------------------

async def fetch_reputation_signals(company: str | None, serper_api_key: str | None = None) -> dict:
    """
    Récupère des signaux de réputation (avis salariés, avis clients) via moteur.
    Jamais de scraping direct de Glassdoor, Indeed, Trustpilot, etc.
    """
    result = {"source": "reputation", "status": "unknown", "data": {"snippets": []}, "error": None}
    if not company or not serper_api_key:
        result["status"] = "skipped"
        return result

    queries = [
        f'"{company}" avis salariés Glassdoor Indeed',
        f'"{company}" avis employés',
        f'"{company}" Trustpilot avis clients',
        f'"{company}" Google Reviews avis',
    ]

    try:
        snippets = []
        seen = set()
        for query in queries[:4]:
            data = await search_web(query, api_key=serper_api_key)
            if data and isinstance(data, dict):
                for item in data.get("organic", []):
                    url = item.get("link") or item.get("url") or ""
                    title = item.get("title") or ""
                    text = item.get("snippet") or ""
                    key = f"{url}|{text}"
                    if not text or key in seen:
                        continue
                    seen.add(key)
                    host = urlparse(url).netloc.lower().replace("www.", "", 1)
                    snippets.append({
                        "title": title,
                        "url": url,
                        "snippet": text,
                        "source": host,
                        "source_type": _classify_reputation_source(host),
                        "retrieval_method": "search_engine",
                    })

        result.update({
            "status": "ok",
            "data": {"snippets": snippets[:12]},
        })
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)

    return result


def _classify_reputation_source(host: str) -> str:
    if "glassdoor" in host:
        return "glassdoor_search_result"
    if "indeed" in host:
        return "indeed_search_result"
    if "trustpilot" in host:
        return "trustpilot_search_result"
    if "google" in host:
        return "google_review_search_result"
    return "web_review_search_result"


# ---------------------------------------------------------------------------
# Orchestrateur multi-sources
# ---------------------------------------------------------------------------

async def gather_company_intelligence(
    company_name: str | None,
    industry: str | None = None,
    role: str | None = None,
    official_domain: str | None = None,
    siren: str | None = None,
    task_id: str | None = None,
) -> dict:
    """
    Lance en parallèle toutes les collectes de sources pertinentes.
    Retourne un dict structuré prêt à être injecté dans le contexte IA.
    """
    serper_key = os.getenv("SERPER_API_KEY")

    # Si un SIREN n'est pas fourni, on tente de le trouver via SIRENE
    sirene_identity = None
    if not siren and company_name:
        sirene_identity = await fetch_sirene_data(company_name=company_name)
        if sirene_identity.get("status") == "ok":
            siren = sirene_identity["data"].get("siren")

    # On récupère aussi les données SIRENE par SIREN si on l'a trouvé
    if not sirene_identity and siren:
        sirene_identity = await fetch_sirene_data(siren=siren)

    # Parallélisation des collectes indépendantes
    tasks = [
        fetch_annuaire_entreprises(siren),
        fetch_sirene_etablissements(siren),
        fetch_github_org(company_name, official_domain),
        fetch_job_openings(company_name, role, serper_key),
        fetch_reputation_signals(company_name, serper_key),
    ]
    if sirene_identity:
        results = [sirene_identity] + await asyncio.gather(*tasks)
    else:
        results = await asyncio.gather(*tasks)

    return {
        "siren": siren,
        "collected_at": datetime.now().isoformat(),
        "sources": [r for r in results if r.get("status") in {"ok", "error"}],
        "summary": _build_raw_summary(results),
    }


def _build_raw_summary(results: list[dict]) -> dict:
    """Construit un résumé rapide exploitable par le prompt IA."""
    summary = {
        "identity": {},
        "etablissements": {},
        "github": {},
        "jobs": {},
        "reputation": {},
    }
    for r in results:
        if r.get("status") != "ok":
            continue
        src = r.get("source")
        data = r.get("data", {})
        if src == "sirene":
            summary["identity"].update(data)
        elif src == "sirene_etablissements":
            summary["etablissements"].update(data)
        elif src == "annuaire_entreprises":
            summary["identity"].update(data)
            summary["identity"]["dirigeants"] = data.get("dirigeants", [])
        elif src == "github":
            summary["github"].update(data)
        elif src == "job_openings":
            summary["jobs"].update(data)
        elif src == "reputation":
            summary["reputation"].update(data)
    return summary


# ---------------------------------------------------------------------------
# Génération des "Signaux détectés" par IA
# ---------------------------------------------------------------------------

async def generate_detected_signals(
    intelligence: dict,
    company_name: str | None,
    role: str | None,
    target_lang: str = "French",
    provider: str | None = None,
) -> dict:
    """
    Transforme les données brutes multi-sources en signaux stratégiques
    orientés entretien.
    """
    prompt_template = load_prompt("detected_signals.md")
    if not prompt_template:
        prompt_template = _DEFAULT_SIGNALS_PROMPT

    context_json = json.dumps(intelligence, ensure_ascii=False, indent=2, default=str)
    final_prompt = prompt_template \
        .replace("{company}", company_name or "Entreprise ciblée") \
        .replace("{role}", role or "Poste visé") \
        .replace("{target_lang}", target_lang) \
        .replace("{intelligence_json}", context_json)

    try:
        result = await ai_call(
            feature="detected_signals",
            prompt=final_prompt,
            system_instruction=f"You are a strategic intelligence analyst. Output STRICT JSON only. Language: {target_lang}.",
            json_mode=True,
            provider=provider,
        )
        if isinstance(result, dict) and "error" not in result:
            return result
        return {"signals": [], "interview_takeaways": [], "error": result.get("error") if isinstance(result, dict) else "empty_response"}
    except Exception as e:
        return {"signals": [], "interview_takeaways": [], "error": str(e)}


_DEFAULT_SIGNALS_PROMPT = """# SIGNALS DÉTECTÉS — ANALYSE MULTI-SOURCES

Tu es un analyste stratégique chargé de transformer des données brutes multi-sources en **signaux actionnables** pour un candidat en préparation d'entretien.

Entreprise : {company}
Poste visé : {role}
Langue : {target_lang}

DONNÉES BRUTES COLLECTÉES :
{intelligence_json}

OBJECTIF :
Produire entre 5 et 8 signaux pertinents pour l'entretien. Chaque signal doit être :
- Sourcé (pas d'invention)
- Classé par catégorie
- Expliqué en termes de "ce que cela signifie pour l'entretien"

FORMAT JSON STRICT :
```json
{
  "signals": [
    {
      "category": "Croissance|Transformation|Risque|Expansion|Culture|Innovation|Santé financière|Recrutement",
      "title": "Titre percutant du signal",
      "summary": "Phrase concise expliquant le signal, avec chiffres quand disponibles.",
      "sources": ["source 1", "source 2"],
      "interview_implication": "Ce que le candidat doit en déduire pour son entretien.",
      "confidence": "high|medium|low"
    }
  ],
  "interview_takeaways": [
    "Point actionnable 1",
    "Point actionnable 2"
  ]
}
```

RÈGLES :
- N'invente aucun chiffre.
- Si une source est faible, indique "low" et reste prudent.
- Si tu n'as pas assez de données pour un signal, ne le produis pas.
- Privilégie les signaux utiles pour le poste visé.
"""
