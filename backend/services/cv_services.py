import io
import json
import re
import asyncio
import uuid
import hashlib
import html
import ipaddress
import socket
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Tuple
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import aiohttp
from fastapi import APIRouter, Depends, Body, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from pypdf import PdfReader

try:
    from docx import Document
except ImportError:
    Document = None

from security import get_current_user
from database import db
from .utils import _get_sortable_date_tuple, load_prompt, normalize_language, _sanitize_data_for_ai, _sanitize_data_for_recruiter_view, consume_quota, refund_quota, TESTER_SESSION_CAP
from .ai_generator import ai_service

TRAINING_THEME_LABELS = {
    "management": "Management",
    "gestion_de_crise": "Gestion de crise",
    "negociation": "Négociation",
    "leadership": "Leadership",
    "communication": "Communication",
}
TRAINING_THEME_ORDER = ["Management", "Gestion de crise", "Négociation", "Leadership", "Communication"]
TRAINING_POOL_SIZE = 5
INTERVIEW_DYNAMIC_MIN_COUNT = 10
INTERVIEW_DYNAMIC_MAX_COUNT = 13
INTERVIEW_QUESTIONS_MAX_COUNT = 13

# [FIX] Centralisation de toute la logique /cv dans un seul routeur
router = APIRouter(
    prefix="/cv",
    tags=["User Profile & CV Data"]
)

STATIC_TRAINING_BANK_PATH = Path(__file__).with_name("static_training_bank.json")
_STATIC_TRAINING_BANK_CACHE: dict | None = None
JOB_IMPORT_MAX_BYTES = 1_500_000
JOB_IMPORT_TIMEOUT_SECONDS = 12
JOB_IMPORT_MAX_REDIRECTS = 3
JOB_IMPORT_USER_AGENT = "BeyondTheCVJobImporter/1.0 (+https://beyondthecv.app)"
JOB_IMPORT_BROWSER_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
DASHBOARD_SUMMARY_GAP_TIMEOUT_SECONDS = 12
DASHBOARD_SUMMARY_AI_TIMEOUT_SECONDS = 12


def _normalize_job_import_url(raw_url: str) -> str:
    parsed = urlparse((raw_url or "").strip())
    if not parsed.scheme or not parsed.netloc:
        return (raw_url or "").strip()

    filtered_query = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key.lower().startswith("utm_"):
            continue
        filtered_query.append((key, value))

    normalized = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
        query=urlencode(filtered_query, doseq=True),
        fragment="",
    )
    return urlunparse(normalized)


def _detect_job_offer_provider(url: str) -> str | None:
    hostname = (urlparse(url).hostname or "").lower()
    if hostname.endswith("boards.greenhouse.io"):
        return "greenhouse"
    if hostname.endswith("jobs.lever.co") or hostname.endswith("lever.co"):
        return "lever"
    return None


def _build_provider_api_url(url: str) -> str | None:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    path = (parsed.path or "").strip("/")
    if not path:
        return None

    if hostname.endswith("boards.greenhouse.io"):
        if path.endswith(".json"):
            return f"https://{parsed.netloc}{parsed.path}"
        return f"https://{parsed.netloc}/{path}.json"

    if hostname.endswith("jobs.lever.co") or hostname.endswith("lever.co"):
        segments = [segment for segment in path.split("/") if segment]
        if len(segments) >= 2:
            return f"https://api.lever.co/v0/postings/{segments[0]}?mode=json"

    return None


def _parse_provider_payload(provider: str, payload: object) -> dict | None:
    if provider == "greenhouse" and isinstance(payload, dict):
        title = _pick_first_non_empty(payload.get("title"), payload.get("name"))
        description = _strip_html_fragment(str(payload.get("content") or payload.get("description") or ""))
        location = ""
        location_payload = payload.get("location")
        if isinstance(location_payload, dict):
            location = _pick_first_non_empty(location_payload.get("name"), location_payload.get("city"), location_payload.get("state"))
        company = _pick_first_non_empty(payload.get("company"), payload.get("company_name"))
        employment_type = _pick_first_non_empty(payload.get("employment_type"), payload.get("employmentType"))
        return {
            "title": title,
            "company": company,
            "location": location,
            "industry": _pick_first_non_empty(payload.get("industry")),
            "description": description,
            "employment_type": employment_type,
            "date_posted": _pick_first_non_empty(payload.get("datePosted"), payload.get("updatedAt")),
        }

    if provider == "lever" and isinstance(payload, (list, tuple)):
        for item in payload:
            if not isinstance(item, dict):
                continue
            title = _pick_first_non_empty(item.get("text"), item.get("title"), item.get("name"))
            description = _strip_html_fragment(str(item.get("description") or item.get("content") or ""))
            if title or description:
                company = _pick_first_non_empty(item.get("company"), item.get("org"), item.get("company_name"))
                location = _pick_first_non_empty(item.get("location"), item.get("locationName"))
                return {
                    "title": title,
                    "company": company,
                    "location": location,
                    "industry": _pick_first_non_empty(item.get("industry")),
                    "description": description,
                    "employment_type": _pick_first_non_empty(item.get("employmentType")),
                    "date_posted": _pick_first_non_empty(item.get("createdAt"), item.get("updatedAt")),
                }

    if provider == "lever" and isinstance(payload, dict):
        return _parse_provider_payload("lever", [payload])

    return None


async def _try_provider_specific_extraction(url: str) -> tuple[dict | None, str | None]:
    provider = _detect_job_offer_provider(url)
    if not provider:
        return None, None

    api_url = _build_provider_api_url(url)
    if not api_url:
        return None, None

    try:
        payload_text, _ = await _download_job_page(api_url, allow_json=True)
    except HTTPException:
        return None, None

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError:
        return None, None

    parsed_payload = _parse_provider_payload(provider, payload)
    if parsed_payload and (parsed_payload.get("title") or parsed_payload.get("description")):
        return parsed_payload, provider
    return None, None


async def _get_cached_job_offer_preview(normalized_url: str) -> dict | None:
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(
                conn,
                """
                SELECT preview_json FROM job_offer_imports
                WHERE normalized_url = %s
                LIMIT 1
                """,
                (normalized_url,),
            )
            row = await cursor.fetchone()
    except Exception as exc:
        print(f"[JOB IMPORT CACHE] Unable to read cache by URL: {exc}", flush=True)
        return None

    if not row:
        return None

    preview_json = row.get("preview_json") if isinstance(row, dict) else None
    if isinstance(preview_json, dict):
        return preview_json
    if isinstance(preview_json, str):
        try:
            return json.loads(preview_json)
        except json.JSONDecodeError:
            return None
    return None


async def _get_cached_job_offer_preview_by_hash(content_hash: str) -> dict | None:
    if not content_hash:
        return None
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(
                conn,
                """
                SELECT preview_json, source_url FROM job_offer_imports
                WHERE content_hash = %s
                ORDER BY updated_at DESC NULLS LAST
                LIMIT 1
                """,
                (content_hash,),
            )
            row = await cursor.fetchone()
    except Exception as exc:
        print(f"[JOB IMPORT CACHE] Unable to read cache by hash: {exc}", flush=True)
        return None

    if not row:
        return None

    preview_json = row.get("preview_json") if isinstance(row, dict) else None
    if isinstance(preview_json, dict):
        cached_preview = dict(preview_json)
        if row.get("source_url"):
            cached_preview["source_url"] = row.get("source_url")
        return cached_preview
    if isinstance(preview_json, str):
        try:
            cached_preview = json.loads(preview_json)
            if row.get("source_url"):
                cached_preview["source_url"] = row.get("source_url")
            return cached_preview
        except json.JSONDecodeError:
            return None
    return None


async def _upsert_cached_job_offer_preview(normalized_url: str, source_url: str, provider: str, content_hash: str, preview: dict) -> None:
    if not normalized_url or not content_hash:
        return
    try:
        async with db.get_connection() as conn:
            await db.execute(
                conn,
                """
                INSERT INTO job_offer_imports (
                    normalized_url,
                    source_url,
                    provider,
                    content_hash,
                    title,
                    company,
                    location,
                    industry,
                    employment_type,
                    date_posted,
                    description,
                    preview_json,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (normalized_url) DO UPDATE SET
                    source_url = EXCLUDED.source_url,
                    provider = EXCLUDED.provider,
                    content_hash = EXCLUDED.content_hash,
                    title = EXCLUDED.title,
                    company = EXCLUDED.company,
                    location = EXCLUDED.location,
                    industry = EXCLUDED.industry,
                    employment_type = EXCLUDED.employment_type,
                    date_posted = EXCLUDED.date_posted,
                    description = EXCLUDED.description,
                    preview_json = EXCLUDED.preview_json,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    normalized_url,
                    source_url,
                    provider or "",
                    content_hash,
                    preview.get("title") or "",
                    preview.get("company") or "",
                    preview.get("location") or "",
                    preview.get("industry") or "",
                    preview.get("employment_type") or "",
                    preview.get("date_posted") or "",
                    preview.get("description") or "",
                    json.dumps(preview),
                ),
            )
    except Exception as exc:
        print(f"[JOB IMPORT CACHE] Unable to persist preview: {exc}", flush=True)


def _load_static_training_bank() -> dict:
    global _STATIC_TRAINING_BANK_CACHE
    if _STATIC_TRAINING_BANK_CACHE is None:
        try:
            with STATIC_TRAINING_BANK_PATH.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, dict):
                _STATIC_TRAINING_BANK_CACHE = data
            else:
                _STATIC_TRAINING_BANK_CACHE = {"items": []}
        except Exception as exc:
            print(f"[TRAINING BANK] Unable to load static bank: {exc}", flush=True)
            _STATIC_TRAINING_BANK_CACHE = {"items": []}
    return _STATIC_TRAINING_BANK_CACHE


def _serialize_static_training_item(item: dict, item_type: str) -> dict:
    item_text = str(item.get("text") or "").strip() or "Élément d'entraînement"
    return {
        "id": item.get("id"),
        "text": item_text,
        "advice": str(item.get("advice") or "Structurez votre réponse avec la méthode STAR.").strip(),
        "suggested_answer": str(item.get("suggested_answer") or "").strip(),
        "tags": _normalize_training_tags(item.get("tags"), fallback_text=f"{item.get('theme', '')} {item_text}"),
        "category": str(item.get("theme") or "Général").strip(),
        "difficulty": item.get("difficulty"),
        "theme": str(item.get("theme") or "Général").strip(),
        "type": item_type,
    }


def _get_requested_training_theme(payload: dict) -> str | None:
    theme_value = payload.get("theme") or payload.get("selected_theme") or payload.get("target_theme") or ""
    if not theme_value:
        return None
    normalized = str(theme_value).strip().lower()
    if normalized in {"management", "gestion de crise", "gestion_de_crise", "négociation", "negociation", "leadership", "communication"}:
        return TRAINING_THEME_LABELS.get(normalized, None)
    for label in TRAINING_THEME_ORDER:
        if normalized == label.lower():
            return label
    return None


def _build_static_training_pool_for_context(payload: dict, item_type: str, count: int = TRAINING_POOL_SIZE) -> list[dict]:
    bank = _load_static_training_bank()
    items = [
        item for item in bank.get("items", [])
        if isinstance(item, dict)
        and str(item.get("type") or "").strip().lower() == str(item_type).strip().lower()
    ]
    if not items:
        return []

    requested_theme = _get_requested_training_theme(payload)
    available_themes = [theme for theme in TRAINING_THEME_ORDER if any(str(item.get("theme") or "").strip() == theme for item in items)]
    theme_order = available_themes
    if requested_theme and requested_theme in theme_order:
        theme_order = [requested_theme] + [theme for theme in theme_order if theme != requested_theme]

    buckets = {theme: [item for item in items if str(item.get("theme") or "").strip() == theme] for theme in theme_order}
    if not buckets:
        return []

    context_signature = json.dumps({
        "type": item_type,
        "theme": payload.get("theme") or "",
        "company": payload.get("target_company") or payload.get("company") or "",
        "job": payload.get("target_job") or payload.get("target_role_primary") or "",
        "language": payload.get("target_language") or "French",
        "skills": payload.get("skills") or [],
    }, sort_keys=True, ensure_ascii=False)
    seed = int(hashlib.md5(context_signature.encode("utf-8")).hexdigest()[:8], 16)

    selected = []
    seen_ids = set()
    for offset in range(count):
        cycle_theme = theme_order[(seed + offset) % len(theme_order)]
        candidates = buckets.get(cycle_theme, [])
        if not candidates:
            continue
        index = (seed + offset) % len(candidates)
        candidate = candidates[index]
        while candidate.get("id") in seen_ids and len(candidates) > 1:
            index = (index + 1) % len(candidates)
            candidate = candidates[index]
        if candidate.get("id") in seen_ids:
            continue
        seen_ids.add(candidate.get("id"))
        selected.append(_serialize_static_training_item(candidate, item_type))
        if len(selected) >= count:
            break

    if len(selected) < count:
        for item in items:
            if item.get("id") in seen_ids:
                continue
            selected.append(_serialize_static_training_item(item, item_type))
            seen_ids.add(item.get("id"))
            if len(selected) >= count:
                break

    return selected


def _normalize_training_tags(raw_tags, fallback_text: str = "") -> list[str]:
    def normalize_tag(tag: str) -> str | None:
        cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", str(tag).strip().lower()).strip("_")
        if not cleaned:
            return None
        mapping = {
            "management": "management",
            "manager": "management",
            "managment": "management",
            "leadership": "leadership",
            "leader": "leadership",
            "lead": "leadership",
            "communication": "communication",
            "comm": "communication",
            "negociation": "negociation",
            "nego": "negociation",
            "salary": "negociation",
            "negociation_salariale": "negociation",
            "gestion_de_crise": "gestion_de_crise",
            "crise": "gestion_de_crise",
            "crisis": "gestion_de_crise",
            "incident": "gestion_de_crise",
            "stress": "gestion_de_crise",
            "urgence": "gestion_de_crise",
        }
        return mapping.get(cleaned, cleaned)

    if isinstance(raw_tags, str):
        values = [part.strip() for part in re.split(r"[,;/|]+", raw_tags) if part.strip()]
    elif isinstance(raw_tags, (list, tuple, set)):
        values = [str(item).strip() for item in raw_tags if str(item).strip()]
    else:
        values = []

    normalized = []
    for value in values:
        tag = normalize_tag(value)
        if tag and tag in TRAINING_THEME_LABELS and tag not in normalized:
            normalized.append(tag)

    if not normalized and fallback_text:
        text = str(fallback_text).lower()
        if any(word in text for word in ["négociation", "negociation", "salaire", "compensation", "pretention"]):
            normalized = ["negociation"]
        elif any(word in text for word in ["crise", "incident", "urgence", "stress", "conflit"]):
            normalized = ["gestion_de_crise"]
        elif any(word in text for word in ["leadership", "manager", "équipe", "direction", "lead"]):
            normalized = ["leadership"]
        elif any(word in text for word in ["communication", "stakeholder", "présentation", "argumentation"]):
            normalized = ["communication"]
        elif any(word in text for word in ["management", "organisation", "priorisation", "delivery"]):
            normalized = ["management"]

    return normalized[:3]


def _theme_to_tag(theme: str) -> str | None:
    if not theme:
        return None
    theme_lower = str(theme).strip().lower()
    mapping = {
        "management": "management",
        "gestion de crise": "gestion_de_crise",
        "gestion_de_crise": "gestion_de_crise",
        "négociation": "negociation",
        "negociation": "negociation",
        "leadership": "leadership",
        "communication": "communication",
    }
    return mapping.get(theme_lower)


def _build_training_prompt_context(candidate_data: dict) -> str:
    theme_history = candidate_data.get("theme_history") if isinstance(candidate_data.get("theme_history"), dict) else None
    if not theme_history:
        return ""
    history_summary = ", ".join(f"{k}: {v}" for k, v in theme_history.items())
    return (
        "DIVERSIFICATION THÉMATIQUE: priorisez les thématiques moins travaillées quand la pertinence le permet. "
        f"Historique actuel: {history_summary}."
    )


async def require_active_subscription(current_user: dict = Depends(get_current_user)):
    """
    [FIX] Création de la dépendance manquante.
    Ce "garde" vérifie si l'utilisateur a un abonnement actif.
    Il peut être utilisé pour protéger des routes spécifiques.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentification requise.")

    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT is_premium, subscription_expiration_date FROM users WHERE id = ?", (user_id,))
            user_status = await cursor.fetchone()

        if not user_status:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

        is_premium = user_status.get("is_premium")
        expiration_date = user_status.get("subscription_expiration_date")

        if not is_premium or (expiration_date and expiration_date < datetime.now(timezone.utc)):
            raise HTTPException(status_code=402, detail="Un abonnement actif est requis pour cette fonctionnalité.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de vérification de l'abonnement : {e}")


def _extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text_chunks = []
        for page in reader.pages:
            try:
                page_text = page.extract_text() or ""
                if page_text.strip():
                    text_chunks.append(page_text)
            except Exception:
                continue
        return "\n".join(text_chunks).strip()
    except Exception as e:
        print(f"[CV PARSER] Erreur d'extraction PDF : {e}", flush=True)
        return ""


def _extract_text_from_docx_bytes(file_bytes: bytes) -> str:
    if Document is None:
        print("[CV PARSER] python-docx non installé : impossible d'extraire un fichier DOCX.", flush=True)
        return ""

    try:
        document = Document(io.BytesIO(file_bytes))
        return "\n".join([paragraph.text for paragraph in document.paragraphs if paragraph.text]).strip()
    except Exception as e:
        print(f"[CV PARSER] Erreur d'extraction DOCX : {e}", flush=True)
        return ""


def _sanitize_cv_text(text: str) -> str:
    return re.sub(r"\r\n?", "\n", text or "").strip()


def _collapse_whitespace(text: str) -> str:
    normalized = re.sub(r"\r\n?", "\n", text or "")
    normalized = re.sub(r"[ \t\f\v]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _strip_html_fragment(fragment: str) -> str:
    if not fragment:
        return ""
    cleaned = re.sub(r"(?is)<(script|style|noscript|svg|iframe).*?>.*?</\1>", " ", fragment)
    cleaned = re.sub(r"(?i)<br\s*/?>", "\n", cleaned)
    cleaned = re.sub(r"(?i)</(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr)>", "\n", cleaned)
    cleaned = re.sub(r"(?is)<[^>]+>", " ", cleaned)
    cleaned = html.unescape(cleaned)
    return _collapse_whitespace(cleaned)


def _truncate_preview_text(text: str, max_chars: int = 12000) -> str:
    content = (text or "").strip()
    if len(content) <= max_chars:
        return content
    return content[:max_chars].rsplit(" ", 1)[0].strip() + "…"


def _pick_first_non_empty(*values) -> str:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _extract_location_text(job_location) -> str:
    locations = job_location if isinstance(job_location, list) else [job_location]
    formatted = []
    for location in locations:
        if isinstance(location, dict):
            address = location.get("address") if isinstance(location.get("address"), dict) else {}
            pieces = [
                address.get("addressLocality"),
                address.get("addressRegion"),
                address.get("addressCountry"),
            ]
            label = ", ".join([str(piece).strip() for piece in pieces if str(piece).strip()])
            if not label and location.get("name"):
                label = str(location.get("name")).strip()
            if label:
                formatted.append(label)
        elif isinstance(location, str) and location.strip():
            formatted.append(location.strip())
    return " | ".join(dict.fromkeys(formatted))


def _iter_job_posting_nodes(node):
    if isinstance(node, dict):
        node_type = node.get("@type")
        if node_type == "JobPosting" or (isinstance(node_type, list) and "JobPosting" in node_type):
            yield node
        for value in node.values():
            yield from _iter_job_posting_nodes(value)
    elif isinstance(node, list):
        for item in node:
            yield from _iter_job_posting_nodes(item)


def _extract_job_posting_from_json_ld(html_content: str) -> tuple[dict | None, str | None]:
    script_pattern = re.compile(
        r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        flags=re.IGNORECASE | re.DOTALL
    )
    for raw_script in script_pattern.findall(html_content or ""):
        payload = html.unescape(raw_script).strip()
        if not payload:
            continue
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            continue
        for job_posting in _iter_job_posting_nodes(parsed):
            title = _pick_first_non_empty(job_posting.get("title"), job_posting.get("name"))
            description = _strip_html_fragment(str(job_posting.get("description") or ""))
            company = ""
            hiring_org = job_posting.get("hiringOrganization")
            if isinstance(hiring_org, dict):
                company = _pick_first_non_empty(hiring_org.get("name"))
            location_text = _extract_location_text(job_posting.get("jobLocation"))
            industry = _pick_first_non_empty(
                job_posting.get("industry"),
                job_posting.get("occupationalCategory")
            )
            if title or description:
                return ({
                    "title": title,
                    "company": company,
                    "location": location_text,
                    "industry": industry,
                    "description": description,
                    "employment_type": _pick_first_non_empty(job_posting.get("employmentType")),
                    "date_posted": _pick_first_non_empty(job_posting.get("datePosted")),
                }, "json_ld")
    return None, None


def _extract_meta_content(html_content: str, attr_name: str, attr_value: str) -> str:
    pattern = re.compile(
        rf"<meta[^>]+{attr_name}=[\"']{re.escape(attr_value)}[\"'][^>]+content=[\"'](.*?)[\"'][^>]*>",
        flags=re.IGNORECASE | re.DOTALL
    )
    match = pattern.search(html_content or "")
    if match:
        return _collapse_whitespace(html.unescape(match.group(1)))
    reverse_pattern = re.compile(
        rf"<meta[^>]+content=[\"'](.*?)[\"'][^>]+{attr_name}=[\"']{re.escape(attr_value)}[\"'][^>]*>",
        flags=re.IGNORECASE | re.DOTALL
    )
    reverse_match = reverse_pattern.search(html_content or "")
    if reverse_match:
        return _collapse_whitespace(html.unescape(reverse_match.group(1)))
    return ""


def _extract_title_from_html(html_content: str) -> str:
    og_title = _extract_meta_content(html_content, "property", "og:title")
    if og_title:
        return og_title
    title_match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html_content or "")
    if title_match:
        title = _strip_html_fragment(title_match.group(1))
        title = re.split(r"\s+[|\-–:]\s+", title)[0].strip()
        return title
    h1_match = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", html_content or "")
    if h1_match:
        return _strip_html_fragment(h1_match.group(1))
    return ""


def _extract_html_candidate_block(html_content: str) -> tuple[str, str]:
    block_patterns = [
        ("main", re.compile(r"(?is)<main[^>]*>(.*?)</main>")),
        ("article", re.compile(r"(?is)<article[^>]*>(.*?)</article>")),
        (
            "job_container",
            re.compile(
                r"(?is)<(?:section|div)[^>]+(?:id|class)=[\"'][^\"']*(job|posting|offer|description|details|vacancy)[^\"']*[\"'][^>]*>(.*?)</(?:section|div)>"
            ),
        ),
    ]
    for source, pattern in block_patterns:
        matches = pattern.findall(html_content or "")
        if not matches:
            continue
        selected = max(matches, key=lambda match: len(match if isinstance(match, str) else match[-1]))
        fragment = selected if isinstance(selected, str) else selected[-1]
        text = _strip_html_fragment(fragment)
        if len(text.split()) >= 80:
            return text, source
    body_match = re.search(r"(?is)<body[^>]*>(.*?)</body>", html_content or "")
    body_fragment = body_match.group(1) if body_match else html_content
    return _strip_html_fragment(body_fragment), "body"


def _extract_company_from_html(html_content: str) -> str:
    company = _extract_meta_content(html_content, "property", "og:site_name")
    if company:
        return company
    for pattern in [
        re.compile(r"(?is)<meta[^>]+name=[\"']author[\"'][^>]+content=[\"'](.*?)[\"']"),
        re.compile(r"(?is)<span[^>]+class=[\"'][^\"']*(company|employer)[^\"']*[\"'][^>]*>(.*?)</span>"),
    ]:
        match = pattern.search(html_content or "")
        if match:
            candidate = match.group(1) if len(match.groups()) == 1 else match.group(2)
            candidate_text = _strip_html_fragment(candidate)
            if candidate_text:
                return candidate_text
    return ""


async def _resolve_hostname_ips(hostname: str) -> list[str]:
    def _resolve():
        resolved = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        return list(dict.fromkeys([entry[4][0] for entry in resolved if entry and entry[4]]))
    try:
        return await asyncio.to_thread(_resolve)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail=f"Hôte introuvable: {hostname}") from exc


def _is_public_ip_address(ip_value: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip_value)
    except ValueError:
        return False
    return not (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
    )


async def _validate_public_job_url(raw_url: str) -> str:
    parsed = urlparse((raw_url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Seules les URLs HTTP et HTTPS sont autorisées.")
    if not parsed.netloc:
        raise HTTPException(status_code=400, detail="URL invalide.")

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        raise HTTPException(status_code=400, detail="URL invalide.")
    if hostname in {"localhost"} or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise HTTPException(status_code=400, detail="Cette URL n'est pas autorisée.")

    resolved_ips = await _resolve_hostname_ips(hostname)
    if not resolved_ips or any(not _is_public_ip_address(ip_addr) for ip_addr in resolved_ips):
        raise HTTPException(status_code=400, detail="Cette URL pointe vers une adresse non publique.")

    sanitized = parsed._replace(fragment="")
    return urlunparse(sanitized)


async def _download_job_page(url: str, redirect_count: int = 0, allow_json: bool = False) -> tuple[str, str]:
    if redirect_count > JOB_IMPORT_MAX_REDIRECTS:
        raise HTTPException(status_code=400, detail="Trop de redirections pour cette URL.")

    safe_url = await _validate_public_job_url(url)
    timeout = aiohttp.ClientTimeout(total=JOB_IMPORT_TIMEOUT_SECONDS, connect=4, sock_read=8)
    default_headers = {
        "User-Agent": JOB_IMPORT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
    }
    browser_like_headers = {
        "User-Agent": JOB_IMPORT_BROWSER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }
    parsed = urlparse(safe_url)
    if parsed.scheme and parsed.netloc:
        browser_like_headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"

    header_candidates = [default_headers, browser_like_headers]

    try:
        last_status = None
        for idx, headers in enumerate(header_candidates):
            async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
                async with session.get(safe_url, allow_redirects=False) as response:
                    if response.status in {301, 302, 303, 307, 308}:
                        location = response.headers.get("Location")
                        if not location:
                            raise HTTPException(status_code=400, detail="Redirection invalide.")
                        return await _download_job_page(urljoin(safe_url, location), redirect_count + 1, allow_json=allow_json)

                    if response.status in {403, 406} and idx < len(header_candidates) - 1:
                        last_status = response.status
                        continue

                    if response.status != 200:
                        raise HTTPException(status_code=400, detail=f"Impossible de récupérer l'annonce (HTTP {response.status}).")

                    content_type = (response.headers.get("Content-Type") or "").lower()
                    accepted_content_types = ["text/html", "application/xhtml+xml", "text/plain"]
                    if allow_json:
                        accepted_content_types.extend(["application/json", "application/javascript"])
                    if not any(token in content_type for token in accepted_content_types):
                        raise HTTPException(status_code=400, detail="Cette URL ne renvoie pas un contenu exploitable.")

                    body = bytearray()
                    async for chunk in response.content.iter_chunked(32_768):
                        body.extend(chunk)
                        if len(body) > JOB_IMPORT_MAX_BYTES:
                            raise HTTPException(status_code=400, detail="La page est trop volumineuse pour être importée automatiquement.")

                    encoding = response.charset or "utf-8"
                    return body.decode(encoding, errors="ignore"), safe_url

        if last_status is not None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Le site a refuse l'acces automatique (HTTP {last_status}). "
                    "Essayez une URL publique de l'annonce ou copiez-collez le texte de l'offre."
                ),
            )

        raise HTTPException(status_code=400, detail="Impossible de télécharger cette annonce automatiquement.")
    except HTTPException:
        raise
    except aiohttp.ClientError as exc:
        raise HTTPException(status_code=400, detail="Impossible de télécharger cette annonce automatiquement.") from exc
    except asyncio.TimeoutError as exc:
        raise HTTPException(status_code=400, detail="Le téléchargement de l'annonce a expiré.") from exc


async def _extract_job_offer_preview_from_url(raw_url: str) -> dict:
    normalized_url = _normalize_job_import_url(raw_url)
    cached_preview = await _get_cached_job_offer_preview(normalized_url)
    if cached_preview:
        cached_preview = dict(cached_preview)
        cached_preview.setdefault("status", "extracted")
        cached_preview["is_cached"] = True
        return cached_preview

    # Tenter d'abord les APIs provider (Greenhouse/Lever), utile si la page HTML bloque en 403.
    provider_preview, provider = await _try_provider_specific_extraction(raw_url)
    if provider_preview:
        job_posting = {
            "title": _pick_first_non_empty(provider_preview.get("title")),
            "company": _pick_first_non_empty(provider_preview.get("company")),
            "location": _pick_first_non_empty(provider_preview.get("location")),
            "industry": _pick_first_non_empty(provider_preview.get("industry")),
            "description": _collapse_whitespace(provider_preview.get("description") or ""),
            "employment_type": _pick_first_non_empty(provider_preview.get("employment_type")),
            "date_posted": _pick_first_non_empty(provider_preview.get("date_posted")),
        }
        source = provider or "html"
        description = _collapse_whitespace(job_posting.get("description") or "")
        if len(description.split()) >= 30:
            content_hash = hashlib.sha256(description.encode("utf-8")).hexdigest()
            cached_by_hash = await _get_cached_job_offer_preview_by_hash(content_hash)
            preview = {
                "status": "extracted",
                "source_url": raw_url,
                "source": source,
                "title": _pick_first_non_empty(job_posting.get("title")),
                "company": _pick_first_non_empty(job_posting.get("company")),
                "location": _pick_first_non_empty(job_posting.get("location")),
                "industry": _pick_first_non_empty(job_posting.get("industry")),
                "employment_type": _pick_first_non_empty(job_posting.get("employment_type")),
                "date_posted": _pick_first_non_empty(job_posting.get("date_posted")),
                "description": _truncate_preview_text(description),
                "content_hash": content_hash,
                "word_count": len(description.split()),
                "confidence": 0.92 if source in {"greenhouse", "lever"} else 0.72,
                "warnings": [],
                "is_cached": False,
            }

            if cached_by_hash:
                preview["is_cached"] = True
                preview["source_url"] = cached_by_hash.get("source_url") or raw_url
                preview["warnings"] = [
                    "Annonce déjà importée précédemment ; nous l'avons réutilisée depuis le cache."
                ]
                await _upsert_cached_job_offer_preview(normalized_url, preview["source_url"], source, content_hash, preview)
                return preview

            await _upsert_cached_job_offer_preview(normalized_url, raw_url, source, content_hash, preview)
            return preview

    html_content, final_url = await _download_job_page(raw_url)
    warnings = []

    provider_preview, provider = await _try_provider_specific_extraction(final_url)
    if provider_preview:
        job_posting = {
            "title": _pick_first_non_empty(provider_preview.get("title")),
            "company": _pick_first_non_empty(provider_preview.get("company")),
            "location": _pick_first_non_empty(provider_preview.get("location")),
            "industry": _pick_first_non_empty(provider_preview.get("industry")),
            "description": _collapse_whitespace(provider_preview.get("description") or ""),
            "employment_type": _pick_first_non_empty(provider_preview.get("employment_type")),
            "date_posted": _pick_first_non_empty(provider_preview.get("date_posted")),
        }
        source = provider or "html"
    else:
        job_posting, source = _extract_job_posting_from_json_ld(html_content)
        if job_posting:
            extracted_description = job_posting.get("description") or ""
            if len(extracted_description.split()) < 60:
                warnings.append("Le balisage structuré semble partiel ; vérifiez le contenu avant analyse.")
        else:
            extracted_description, source = _extract_html_candidate_block(html_content)
            job_posting = {
                "title": _extract_title_from_html(html_content),
                "company": _extract_company_from_html(html_content),
                "location": "",
                "industry": "",
                "description": extracted_description,
                "employment_type": "",
                "date_posted": "",
            }
            if len(extracted_description.split()) < 60:
                warnings.append("Extraction partielle détectée : complétez l'annonce si nécessaire.")

    description = _collapse_whitespace(job_posting.get("description") or "")
    if len(description.split()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Nous n'avons pas pu extraire suffisamment de contenu. Veuillez copier-coller l'annonce."
        )

    content_hash = hashlib.sha256(description.encode("utf-8")).hexdigest()
    cached_by_hash = await _get_cached_job_offer_preview_by_hash(content_hash)
    preview = {
        "status": "extracted",
        "source_url": final_url,
        "source": source or "html",
        "title": _pick_first_non_empty(job_posting.get("title")),
        "company": _pick_first_non_empty(job_posting.get("company")),
        "location": _pick_first_non_empty(job_posting.get("location")),
        "industry": _pick_first_non_empty(job_posting.get("industry")),
        "employment_type": _pick_first_non_empty(job_posting.get("employment_type")),
        "date_posted": _pick_first_non_empty(job_posting.get("date_posted")),
        "description": _truncate_preview_text(description),
        "content_hash": content_hash,
        "word_count": len(description.split()),
        "confidence": 0.92 if source in {"greenhouse", "lever"} else 0.94 if source == "json_ld" else 0.72 if source in {"main", "article", "job_container"} else 0.55,
        "warnings": warnings,
        "is_cached": False,
    }

    if cached_by_hash:
        preview["is_cached"] = True
        preview["source_url"] = cached_by_hash.get("source_url") or final_url
        preview["warnings"] = list(dict.fromkeys([*preview["warnings"], "Annonce déjà importée précédemment ; nous l'avons réutilisée depuis le cache."]))
        await _upsert_cached_job_offer_preview(normalized_url, preview["source_url"], source or "html", content_hash, preview)
        return preview

    await _upsert_cached_job_offer_preview(normalized_url, final_url, source or "html", content_hash, preview)
    return preview


def _extract_email(text: str) -> str:
    match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    return match.group(0).strip() if match else ""


def _extract_phone(text: str) -> str:
    match = re.search(r"(?:\+?\d[\d .\-/]{6,}\d)", text)
    return match.group(0).strip() if match else ""


def _extract_linkedin(text: str) -> str:
    match = re.search(r"(https?://)?(www\.)?linkedin\.com/[\w\-_/]+", text, flags=re.I)
    if match:
        return match.group(0).strip()
    match = re.search(r"linkedin\.[^\s,;]+", text, flags=re.I)
    return match.group(0).strip() if match else ""


def _extract_name(text: str) -> Tuple[str, str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:12]:
        low = line.lower()
        if any(keyword in low for keyword in ["email", "tel", "tél", "phone", "linkedin", "www", "http", "experience", "expérience", "formation", "compétences", "skills", "profil", "summary", "curriculum"]):
            continue
        parts = [part for part in re.split(r"\s+", line) if part]
        if 2 <= len(parts) <= 4:
            first_name = parts[0]
            last_name = " ".join(parts[1:])
            return first_name, last_name
    return "", ""


def _normalize_context_field(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""

    normalized = unicodedata.normalize("NFD", raw.lower())
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"\s+", " ", normalized)

    placeholders = {
        "non defini",
        "non specifie",
        "non renseigne",
        "poste vise",
        "le poste vise",
        "unknown position",
        "unknown",
        "n/a",
        "na",
        "none",
    }

    if normalized in placeholders:
        return ""
    return raw


def _infer_target_job_from_job_description(job_description: str) -> str:
    text = str(job_description or "").strip()
    if not text:
        return ""

    patterns = [
        r"(?:intitule du poste|intitule poste|titre du poste|titre poste|poste|fonction|job title|position)\s*[:\-]\s*(.+)",
        r"nous recrutons\s+(?:un|une)\s+(.+)",
        r"recherche\s+(?:un|une)\s+(.+)",
    ]

    def _clean_candidate(value: str) -> str:
        candidate = re.sub(r"\s+", " ", str(value or "").strip(" -:\t"))
        if not candidate:
            return ""
        lowered = candidate.lower()
        banned_fragments = {
            "description du poste",
            "a propos",
            "à propos",
            "missions",
            "responsabilites",
            "responsabilités",
            "profil recherche",
            "profil recherché",
            "candidat ideal",
            "candidat idéal",
        }
        if lowered in banned_fragments:
            return ""
        if len(candidate) > 120:
            return ""
        if any(punct in candidate for punct in [".", ";", "?", "!"]) and len(candidate.split()) > 8:
            return ""
        return candidate

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            candidate = _clean_candidate(match.group(1))
            if candidate:
                return candidate

    lines = [re.sub(r"^[\-•#*\s]+", "", line).strip() for line in text.splitlines()]
    significant_lines = [line for line in lines if line]
    for line in significant_lines[:10]:
        candidate = _clean_candidate(line)
        if not candidate:
            continue
        word_count = len(candidate.split())
        if 2 <= word_count <= 10:
            return candidate

    return ""


def _extract_skills(text: str) -> list[str]:
    section = re.search(r"(?:compétences|skills)\s*[:\n]+([\s\S]+?)(?=\n\s*\n|$)", text, flags=re.I)
    if section:
        raw_skills = re.split(r"[\n,;]+", section.group(1))
        skills = [item.strip() for item in raw_skills if item.strip()]
        return skills[:15]

    keyword_matches = re.findall(r"\b(Python|JavaScript|TypeScript|React|Node\.js|SQL|Docker|Kubernetes|AWS|GCP|Git|CI/CD|Terraform|HTML|CSS|Java|C\+\+|C#|Ruby|Go|Scala|PHP)\b", text, flags=re.I)
    return list(dict.fromkeys([item.strip() for item in keyword_matches]))


def _extract_experiences(text: str) -> list[dict]:
    experiences = []
    for line in text.splitlines():
        if len(experiences) >= 5:
            break
        if re.search(r"\b(19|20)\d{2}\b", line) and len(line.strip()) > 20:
            cleaned = line.strip()
            experiences.append({
                "id": len(experiences) + 1,
                "role": cleaned,
                "company": "",
                "start_date": "",
                "end_date": "",
                "description": ""
            })
    return experiences


def _extract_educations(text: str) -> list[dict]:
    educations = []
    for line in text.splitlines():
        if len(educations) >= 3:
            break
        if re.search(r"\b(Bachelor|Master|Licence|Dipl[oô]me|MBA|BTS|DUT|Doctorat|PhD|Ing[eé]nieur|Universit[eé]|École)\b", line, flags=re.I):
            educations.append({
                "id": len(educations) + 1,
                "degree": line.strip(),
                "school": "",
                "year": ""
            })
    return educations


def _extract_bio(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and not re.search(r"\b(email|tel|tél|phone|linkedin|www|http|experience|formation|compétences|skills|profil|summary|curriculum)\b", stripped, flags=re.I):
            if len(stripped.split()) > 4:
                return stripped
    return ""


def _fallback_parse_text(text: str, current_user: dict) -> dict:
    first_name, last_name = _extract_name(text)
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": _extract_email(text) or current_user.get("email", ""),
        "phone": _extract_phone(text),
        "linkedin": _extract_linkedin(text),
        "bio": _extract_bio(text),
        "city": "",
        "country": "",
        "experiences": _extract_experiences(text),
        "educations": _extract_educations(text),
        "skills": _extract_skills(text)
    }


async def _parse_cv_text(text: str, current_user: dict) -> dict:
    text = _sanitize_cv_text(text)
    parsed = None
    if (ai_service.openai_client or ai_service.gemini_client) and text:
        prompt_template = load_prompt("cv_parser.md")
        if prompt_template:
            prompt = f"{prompt_template}\n\nCV_TEXT:\n{text}"
            try:
                parsed = await ai_service.generate_valid_json(prompt)
                if isinstance(parsed, dict) and parsed.get("first_name") is not None:
                    return parsed
            except Exception as e:
                print(f"[CV PARSER] L'IA a échoué : {e}", flush=True)

    return _fallback_parse_text(text, current_user)


@router.post("/parse-cv")
async def parse_cv_endpoint(
    file: UploadFile = File(None),
    raw_text: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Parse un CV envoyé en PDF, DOCX ou texte brut.
    """
    if not file and not raw_text:
        raise HTTPException(status_code=400, detail="Aucun fichier ou texte fourni.")

    text = _sanitize_cv_text(raw_text or "")
    if file:
        file_bytes = await file.read()
        if file.filename.lower().endswith(".pdf") or file.content_type == "application/pdf":
            text = _extract_text_from_pdf_bytes(file_bytes) or text
        elif file.filename.lower().endswith(".docx") or file.content_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
            text = _extract_text_from_docx_bytes(file_bytes) or text
        else:
            try:
                text = file_bytes.decode("utf-8", errors="ignore").strip() or text
            except Exception:
                text = text

    if not text or len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Impossible de lire le contenu du CV ou le texte est trop court.")

    parsed_form = await _parse_cv_text(text, current_user)

    # [CACHE L4] Stocker le profil parsé pour éviter de re-parser à chaque analyse
    try:
        from .cache_service import set_user_profile_cache
        user_id = current_user.get("id", "")
        if user_id:
            await set_user_profile_cache(user_id, parsed_form)
    except Exception as e:
        print(f"[CACHE L4] Warning: could not store profile: {e}", flush=True)

    return {"form": parsed_form}


@router.post("/job-offer/import-url")
async def import_job_offer_from_url(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Importe une annonce depuis une URL publique sans consommer de quota.
    Le frontend présente ensuite un aperçu avant d'appliquer le contenu extrait.
    """
    source_url = str(payload.get("url") or "").strip()
    if not source_url:
        raise HTTPException(status_code=400, detail="Veuillez fournir une URL d'annonce.")

    return await _extract_job_offer_preview_from_url(source_url)


@router.get("/interview/history")
async def get_interview_history(current_user: dict = Depends(get_current_user)):
    """Récupère l'historique des questions d'entretien de l'utilisateur."""
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT id, application_id, question_text, user_answer, score, feedback, created_at FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
            (current_user["id"],)
        )
        rows = await cursor.fetchall()

    history = []
    for row in rows:
        item = dict(row)
        if isinstance(item.get("feedback"), str):
            try:
                item["feedback"] = json.loads(item["feedback"])
            except Exception:
                pass
        history.append(item)

    return {"history": history}


# ---------------------------------------------------------------------------
# FEEDBACK UTILISATEUR (pouces haut / bas)
# ---------------------------------------------------------------------------

class FeedbackPayload(BaseModel):
    feature: str
    is_positive: bool
    comments: str = ""

@router.post("/feedback")
async def submit_feedback(
    payload: FeedbackPayload,
    current_user: dict = Depends(get_current_user)
):
    """Enregistre un feedback utilisateur (pouce haut ou bas) depuis l'interface candidate."""
    user_id = current_user.get("id")
    async with db.get_connection() as conn:
        await db.execute(
            conn,
            """
            INSERT INTO feedbacks (user_id, feature, is_positive, comments, created_at)
            VALUES (?, ?, ?, ?, NOW())
            """,
            (user_id, payload.feature, payload.is_positive, payload.comments or "")
        )
    return {"status": "ok"}


@router.get("/feedbacks")
async def get_my_feedbacks(current_user: dict = Depends(get_current_user)):
    """Retourne les feedbacks soumis par l'utilisateur connecté."""
    user_id = current_user.get("id")
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT id, feature, is_positive, comments, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        )
        rows = await cursor.fetchall()
    return {"feedbacks": [dict(row) for row in rows]}


@router.get("/training/history")
async def get_training_history(current_user: dict = Depends(get_current_user)):
    """Récupère l'historique des sessions de préparation à l'entretien de l'utilisateur."""
    rows = []
    include_tags = True
    async with db.get_connection() as conn:
        try:
            cursor = await db.execute(
                conn,
                "SELECT id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, tags, created_at FROM training_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
                (current_user["id"],)
            )
            rows = await cursor.fetchall()
        except Exception as exc:
            print(f"[TRAINING_HISTORY] Falling back from full schema query: {exc}", flush=True)
            include_tags = False
            try:
                cursor = await db.execute(
                    conn,
                    "SELECT id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, created_at FROM training_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
                    (current_user["id"],)
                )
                rows = await cursor.fetchall()
            except Exception as legacy_exc:
                print(f"[TRAINING_HISTORY] Falling back to minimal schema: {legacy_exc}", flush=True)
                cursor = await db.execute(
                    conn,
                    "SELECT id, theme, question_text, user_answer, score, created_at FROM training_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
                    (current_user["id"],)
                )
                rows = await cursor.fetchall()

    history = [dict(row) for row in rows]
    for item in history:
        item.setdefault("question_type", "QA")
        item.setdefault("strengths", [])
        item.setdefault("weaknesses", [])
        item.setdefault("improved_answer", "")
        item["tags"] = _normalize_training_tags(item.get("tags") if include_tags else None, fallback_text=item.get("theme") or "")
    return {"history": history}


@router.get("/training/balance")
async def get_training_balance(current_user: dict = Depends(get_current_user)):
    """Retourne les quotas réels de l'utilisateur pour chaque type d'entraînement."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(
                conn,
                """SELECT credits, quota_entreprises, quota_offres
                   FROM users WHERE id = ?""",
                (current_user["id"],)
            )
            row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        data = dict(row) if hasattr(row, 'keys') else {
            "credits": row[0],
            "quota_entreprises": row[1] if len(row) > 1 else 5,
            "quota_offres": row[2] if len(row) > 2 else 15,
        }

        def _effective_session_balance(raw_value: int | None) -> int:
            try:
                val = int(raw_value or 0)
            except Exception:
                val = 0
            # Le moteur recharge automatiquement les quotas d'entraînement à 30
            # lorsqu'ils tombent à 0: l'UI doit refléter ce solde effectif.
            return TESTER_SESSION_CAP if val <= 0 else val

        effective_credits = _effective_session_balance(data.get("credits", 0))
        return {
            "credits":       effective_credits,
            "pitch":         effective_credits,
            "qa":            effective_credits,
            "mes":           effective_credits,
            "negotiation":   effective_credits,
            "regeneration":  effective_credits,
            "update":        effective_credits,
            "quota_pitch":   effective_credits,
            "quota_qa":      effective_credits,
            "quota_mes":     effective_credits,
            "quota_negotiation": effective_credits,
            "quota_regeneration": effective_credits,
            "quota_update":  effective_credits,
            "entreprises":   data.get("quota_entreprises", 5),
            "offres":        data.get("quota_offres", 15),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BALANCE] Error: {e}", flush=True)
        return {"credits": 30, "pitch": 30, "qa": 30, "mes": 30,
                "negotiation": 30, "regeneration": 30, "update": 30,
                "quota_pitch": 30, "quota_qa": 30, "quota_mes": 30,
                "quota_negotiation": 30, "quota_regeneration": 30, "quota_update": 30,
                "entreprises": 5, "offres": 15}


async def _build_training_pool_for_context(user_id: str | None, payload: dict) -> dict:
    context_payload = dict(payload or {})
    qa_items = _build_static_training_pool_for_context(context_payload, item_type="question", count=TRAINING_POOL_SIZE)
    mes_items = _build_static_training_pool_for_context(context_payload, item_type="mes", count=TRAINING_POOL_SIZE)

    if not qa_items:
        qa_result = await generate_interview_questions({
            **context_payload,
            "count": TRAINING_POOL_SIZE,
            "target_language": context_payload.get("target_language", "French"),
        })
        qa_items = []
        for q in (qa_result.get("questions") or [])[:TRAINING_POOL_SIZE]:
            qa_items.append({
                "text": q.get("question") or q.get("text") or "Question d'entraînement",
                "advice": q.get("advice") or "Structurez votre réponse avec la méthode STAR.",
                "suggested_answer": q.get("suggested_answer") or "",
                "tags": _normalize_training_tags(q.get("tags") or [], fallback_text=f"{q.get('category', '')} {q.get('question') or q.get('text', '')}"),
                "category": q.get("category") or "Général",
            })

    if not mes_items:
        mes_result = await generate_custom_scenarios({
            **context_payload,
            "count": TRAINING_POOL_SIZE,
            "target_language": context_payload.get("target_language", "French"),
        })
        mes_items = []
        for scenario in (mes_result.get("scenarios") or [])[:TRAINING_POOL_SIZE]:
            mes_items.append({
                "text": scenario.get("title") or scenario.get("scenario") or scenario.get("question") or "Décrivez votre approche.",
                "advice": scenario.get("description") or "Structurez votre réponse en Situation, Décision, Impact.",
                "suggested_answer": scenario.get("suggested_answer") or "Commencez par clarifier les enjeux, expliciter vos critères de priorisation, puis concluez sur l'impact mesurable.",
                "tags": _normalize_training_tags(scenario.get("tags") or [], fallback_text=f"{scenario.get('category', '')} {scenario.get('title') or scenario.get('scenario') or ''}"),
                "category": scenario.get("category") or "Gestion de crise",
            })

    return {
        "status": "READY",
        "qa": qa_items,
        "mes": mes_items,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "static_bank" if qa_items and mes_items else "fallback",
    }


@router.post("/training/prewarm-pool")
async def prewarm_training_pool(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Pré-génère un lot de 5 questions et 5 MES pour un contexte candidat donné."""
    user_id = current_user.get("id")
    existing = await _get_training_pool(user_id, payload)
    if existing and isinstance(existing.get("qa"), list) and isinstance(existing.get("mes"), list) and (existing.get("qa") or existing.get("mes")):
        return {"status": "already_ready", "pool": {"qa": len(existing.get("qa", [])), "mes": len(existing.get("mes", []))}}

    try:
        pool_data = await _build_training_pool_for_context(user_id, payload)
        await _upsert_training_pool(user_id, payload, pool_data)
        return {"status": "ready", "pool": {"qa": len(pool_data.get("qa", [])), "mes": len(pool_data.get("mes", []))}}
    except Exception as e:
        print(f"[TRAINING POOL] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la préparation du pool d'entraînement.")


@router.post("/training/generate-question")
async def generate_training_question(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Génère un défi d'entraînement (question QA ou scénario MES) pour TrainingTab.
    """
    user_id = current_user.get("id")
    raw_question_type = str(payload.get("question_type") or "QA").strip().upper()
    if raw_question_type in {"QA", "CLASSIQUE", "CLASSIQUES", "QUESTION", "QUESTIONS"}:
        question_type = "QA"
    elif raw_question_type in {"MES", "SCENARIO", "SCENARIOS", "MISE_EN_SITUATION", "MISES_EN_SITUATION"}:
        question_type = "MES"
    else:
        question_type = "QA"
    theme = payload.get("theme") or "Général"
    quota_type = "mes" if question_type == "MES" else "qa"

    try:
        context_payload = dict(payload or {})
        context_payload["theme"] = theme

        pool_item = await _consume_training_pool_item(user_id, context_payload, question_type)
        if pool_item:
            return {
                "questions": [{
                    "text": pool_item.get("text") or "Question d'entraînement",
                    "advice": pool_item.get("advice") or "Structurez votre réponse avec la méthode STAR.",
                    "suggested_answer": pool_item.get("suggested_answer") or "",
                    "tags": _normalize_training_tags(pool_item.get("tags"), fallback_text=f"{pool_item.get('text', '')} {pool_item.get('category', '')}")
                }]
            }

        await consume_quota(user_id, quota_type, cost=1)

        if question_type == "MES":
            scenarios_result = await generate_custom_scenarios(context_payload)
            categories = scenarios_result.get("categories") if isinstance(scenarios_result, dict) else []
            first = None
            if isinstance(categories, list):
                for cat in categories:
                    if isinstance(cat, dict) and isinstance(cat.get("scenarios"), list) and cat["scenarios"]:
                        first = cat["scenarios"][0]
                        break

            if not first:
                first = {
                    "title": "Situation de priorisation sous pression",
                    "description": "Deux demandes critiques arrivent en même temps avec des contraintes opposées.",
                    "tags": ["gestion_de_crise", "leadership"]
                }

            q_text = first.get("title") or first.get("scenario") or first.get("question") or "Décrivez votre approche."
            q_desc = first.get("description") or "Structurez votre réponse en Situation, Décision, Impact."
            return {
                "questions": [{
                    "text": q_text,
                    "advice": q_desc,
                    "suggested_answer": "Commencez par clarifier les enjeux, expliciter vos critères de priorisation, puis concluez sur l'impact mesurable.",
                    "tags": _normalize_training_tags(first.get("tags"), fallback_text=f"{q_text} {q_desc}")
                }]
            }

        questions_result = await generate_interview_questions({
            **context_payload,
            "count": 1
        })
        questions = questions_result.get("questions") if isinstance(questions_result, dict) else []
        if not isinstance(questions, list) or not questions:
            questions = [{
                "question": "Parlez d'une réalisation dont l'impact est objectivement mesurable.",
                "advice": "Le recruteur évalue votre capacité à quantifier votre contribution.",
                "suggested_answer": ""
            }]

        q = questions[0] if isinstance(questions[0], dict) else {"question": str(questions[0])}
        return {
            "questions": [{
                "text": q.get("question") or q.get("text") or "Question d'entraînement",
                "advice": q.get("advice") or "Structurez votre réponse avec la méthode STAR.",
                "suggested_answer": q.get("suggested_answer") or "",
                "tags": _normalize_training_tags(q.get("tags"), fallback_text=f"{q.get('question') or q.get('text', '')} {q.get('category', '')}")
            }]
        }

    except HTTPException:
        raise
    except Exception as e:
        await refund_quota(user_id, quota_type, cost=1)
        print(f"[TRAINING GENERATE] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du défi.")


@router.post("/training/evaluate")
async def evaluate_training_answer(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Évalue la réponse utilisateur d'un défi TrainingTab et enregistre la session.
    """
    user_id = current_user.get("id")
    raw_question_type = str(payload.get("question_type") or "QA").strip().upper()
    if raw_question_type in {"QA", "CLASSIQUE", "CLASSIQUES", "QUESTION", "QUESTIONS"}:
        question_type = "QA"
    elif raw_question_type in {"MES", "SCENARIO", "SCENARIOS", "MISE_EN_SITUATION", "MISES_EN_SITUATION"}:
        question_type = "MES"
    else:
        question_type = "QA"
    quota_type = "mes" if question_type == "MES" else "qa"
    question_text = str(payload.get("question_text") or "").strip()
    user_answer = str(payload.get("user_answer") or "").strip()
    theme = str(payload.get("theme") or "Général").strip()
    target_lang = normalize_language(payload.get("target_language", "French"))
    session_tags = _normalize_training_tags(payload.get("tags"), fallback_text=f"{question_text} {theme}")

    if not user_answer:
        raise HTTPException(status_code=400, detail="Réponse vide.")

    await consume_quota(user_id, quota_type, cost=1)

    try:
        prompt_template = load_prompt("evaluate_interview_answer.md")
        final_prompt = f"""
{prompt_template}

QUESTION POSÉE:
{question_text}

CATÉGORIE / ATTENTE:
{theme} ({question_type})

RÉPONSE DU CANDIDAT:
{user_answer}

OUTPUT LANGUAGE: {target_lang}
"""
        result = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are a strict interview evaluator. Output STRICT JSON only. Language: {target_lang}."
        )

        if not isinstance(result, dict):
            result = {}

        score = result.get("score", 0)
        try:
            score = int(score)
        except Exception:
            score = 0
        score = max(0, min(100, score))

        strengths = result.get("strengths") if isinstance(result.get("strengths"), list) else []
        weaknesses = result.get("weaknesses") if isinstance(result.get("weaknesses"), list) else []
        improved_answer = result.get("improved_answer") if isinstance(result.get("improved_answer"), str) else ""

        if not strengths:
            strengths = ["Réponse pertinente au sujet posé."]
        if not weaknesses:
            weaknesses = ["Ajoutez des résultats chiffrés et une structure STAR plus explicite."]
        if not improved_answer:
            improved_answer = "Je structure ma réponse avec la méthode STAR et j'illustre l'impact avec un KPI concret."

        feedback = {
            "score": score,
            "strengths": [str(s) for s in strengths[:4]],
            "weaknesses": [str(w) for w in weaknesses[:4]],
            "improved_answer": improved_answer
        }

        session_id = f"train_{user_id}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        async with db.get_connection() as conn:
            await db.execute(
                conn,
                """
                INSERT INTO training_sessions (id, user_id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, NOW())
                """,
                (
                    session_id, user_id, theme, question_type, question_text, user_answer, score,
                    json.dumps(feedback["strengths"], ensure_ascii=False),
                    json.dumps(feedback["weaknesses"], ensure_ascii=False),
                    improved_answer,
                    json.dumps(session_tags, ensure_ascii=False)
                )
            )

            await db.execute(
                conn,
                """
                INSERT INTO interview_sessions (id, user_id, question_text, user_answer, score, feedback, created_at)
                VALUES (?, ?, ?, ?, ?, ?::jsonb, NOW())
                """,
                (
                    f"iv_{session_id}", user_id, question_text, user_answer, score,
                    json.dumps(feedback, ensure_ascii=False)
                )
            )

        return {"feedback": feedback}

    except HTTPException:
        raise
    except Exception as e:
        await refund_quota(user_id, quota_type, cost=1)
        print(f"[TRAINING EVALUATE] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Erreur lors de l'évaluation de la réponse.")


@router.post("/training/evaluate-vocal-pitch")
async def evaluate_vocal_pitch(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Évalue un pitch oral à partir d'une retranscription et renvoie un feedback structuré.
    """
    user_id = current_user.get("id")
    transcript = str(payload.get("transcript") or payload.get("user_answer") or "").strip()
    raw_target_job = _normalize_context_field(payload.get("target_job") or payload.get("target_role_primary"))
    target_company = _normalize_context_field(payload.get("target_company")) or "l'entreprise ciblée"
    job_description = str(payload.get("job_description") or payload.get("job_description_text") or "").strip()
    inferred_target_job = _infer_target_job_from_job_description(job_description)
    target_job = raw_target_job or inferred_target_job or "ce poste"
    target_lang = normalize_language(payload.get("target_language", "French"))
    duration_seconds = payload.get("duration_seconds") or payload.get("duration") or 0
    transcript_words = [word for word in re.split(r"\s+", transcript.lower()) if word]
    filler_word_bank = {"euh", "heu", "bah", "voilà", "genre", "en fait", "du coup"}
    negative_word_bank = {"impossible", "difficile", "hésite", "peur", "problème", "problèmes", "stress"}

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcription vide.")

    try:
        duration_seconds = int(duration_seconds)
    except Exception:
        duration_seconds = 0

    await consume_quota(user_id, "pitch", cost=2)

    def _build_metrics() -> dict:
        duration_minutes = max(duration_seconds, 1) / 60.0
        wpm = round(len(transcript_words) / duration_minutes) if transcript_words else 0
        pace_status = "à calibrer"
        if 90 <= wpm <= 160:
            pace_status = "bon"
        elif wpm < 90:
            pace_status = "lent"
        elif wpm > 160:
            pace_status = "rapide"

        filler_words_detected = [word for word in filler_word_bank if word in transcript.lower()]
        negative_words_detected = [word for word in negative_word_bank if word in transcript.lower()]

        return {
            "wpm": wpm,
            "pace_status": pace_status,
            "filler_words_detected": filler_words_detected,
            "negative_words_detected": negative_words_detected,
        }

    def _fallback_feedback() -> dict:
        word_count = len([w for w in re.split(r"\s+", transcript) if w])
        duration_label = max(duration_seconds, 1)
        pace = word_count / max(duration_label / 60.0, 1 / 60.0)
        score = 55
        if word_count >= 60:
            score += 10
        if 90 <= pace <= 180:
            score += 10
        if len(transcript) >= 240:
            score += 10
        if len(transcript) < 120:
            score -= 10
        score = max(0, min(100, score))

        strengths = [
            "Le pitch existe et peut être amélioré avec davantage de preuves concrètes.",
            f"Le discours cible le poste de {target_job}.",
        ]
        weaknesses = [
            "Ajoutez une accroche plus mémorable et un bénéfice clair pour l'entreprise.",
            "Introduisez un exemple chiffré ou un résultat mesurable.",
        ]
        if pace < 80:
            weaknesses.append("Le débit semble trop lent pour un pitch de 3 minutes.")
        elif pace > 200:
            weaknesses.append("Le débit semble trop rapide pour laisser respirer les idées.")

        improved_pitch = (
            f"Bonjour, je candidate pour {target_job} chez {target_company}. "
            "Je combine impact, clarté et résultats mesurables. "
            "J'ai déjà obtenu des résultats concrets que je peux relier directement à vos enjeux."
        )

        return {
            "score": score,
            "strengths": strengths[:3],
            "weaknesses": weaknesses[:3],
            "analysis": {
                "hook": "Votre accroche doit dire en une phrase pourquoi vous êtes crédible.",
                "structure": "Structurez en Qui je suis / Ce que j'ai fait / Ce que j'apporte.",
                "delivery": "Parlez clairement, avec des pauses, et gardez un rythme stable."
            },
            "improved_pitch": improved_pitch,
        }

    def _normalize_weaknesses(items) -> list[str]:
        if not isinstance(items, list):
            return []
        normalized: list[str] = []
        for item in items:
            if isinstance(item, str):
                text = item.strip()
                if text:
                    normalized.append(text)
                continue
            if isinstance(item, dict):
                issue = str(item.get("issue") or "").strip()
                recommendation = str(item.get("recommendation") or "").strip()
                evidence = str(item.get("evidence") or "").strip()
                if issue and recommendation:
                    normalized.append(f"{issue} -> {recommendation}")
                elif issue and evidence:
                    normalized.append(f"{issue} ({evidence})")
                elif issue:
                    normalized.append(issue)
                elif recommendation:
                    normalized.append(recommendation)
        return normalized[:4]

    try:
        prompt_template = load_prompt("evaluate_pitch_v2.md")
        if not prompt_template:
            raise ValueError("Prompt introuvable: evaluate_pitch_v2.md")

        metrics = _build_metrics()
        context_payload = {
            "POSTE_CIBLE": target_job,
            "ENTREPRISE_CIBLE": target_company,
            "JOB_DESCRIPTION": job_description or None,
            "PITCH_TYPE": str(payload.get("pitch_type") or "three_minutes"),
            "REFERENCE_PITCH": payload.get("reference_pitch") or payload.get("pitch_reference") or None,
            "CANDIDATE_CONTEXT": payload.get("candidate_context") or {
                "target_job": target_job,
                "target_company": target_company,
                "job_description": job_description,
            },
            "TRANSCRIPTION_PITCH": transcript,
            "AUDIO_METRICS": payload.get("audio_metrics") or {
                "duration_seconds": duration_seconds,
                "words_per_minute": metrics.get("wpm"),
            },
            "TARGET_LANGUAGE": target_lang,
        }

        prompt = (
            f"{prompt_template}\n\n"
            "# INPUT DATA\n"
            f"{json.dumps(context_payload, ensure_ascii=False, indent=2, default=str)}\n\n"
            "Rappel: retourne STRICTEMENT un JSON valide conforme au schéma demandé."
        )

        result = await ai_service.generate_valid_json(
            prompt,
            provider="openai",
            system_instruction=f"You are a strict pitch evaluator. Output STRICT JSON only. Language: {target_lang}."
        )

        if not isinstance(result, dict):
            result = {}

        score = result.get("score", 0)
        try:
            score = int(score)
        except Exception:
            score = 0
        score = max(0, min(100, score))

        strengths = result.get("strengths") if isinstance(result.get("strengths"), list) else []
        analysis = result.get("analysis") if isinstance(result.get("analysis"), dict) else {}
        improved_pitch = result.get("improved_pitch") if isinstance(result.get("improved_pitch"), str) else ""
        subscores = result.get("subscores") if isinstance(result.get("subscores"), dict) else {}

        hook_analysis = analysis.get("hook") if isinstance(analysis.get("hook"), dict) else {}
        delivery_analysis = analysis.get("delivery") if isinstance(analysis.get("delivery"), dict) else {}
        normalized_weaknesses = _normalize_weaknesses(result.get("weaknesses"))

        feedback = {
            "score": score,
            "strengths": [str(s) for s in strengths[:4]] or ["Pitch compréhensible et exploitable."],
            "weaknesses": normalized_weaknesses,
            "subscores": {
                "hook": int(subscores.get("hook") or 0),
                "value": int(subscores.get("value") or 0),
                "proof": int(subscores.get("proof") or 0),
                "structure": int(subscores.get("structure") or 0),
                "projection": int(subscores.get("projection") or 0),
            },
            "analysis": {
                "hook": str(hook_analysis.get("assessment") or analysis.get("hook") or "Soignez l'accroche initiale."),
                "alternative_hook": str(hook_analysis.get("alternative_hook") or "").strip() or None,
                "value_proposition": str(analysis.get("value_proposition") or "Rendez votre proposition de valeur explicite dès le début."),
                "proofs": str(analysis.get("proofs") or "Renforcez chaque affirmation clé par une preuve observable."),
                "structure": str(analysis.get("structure") or "Structurez le pitch en 3 blocs clairs."),
                "projection": str(analysis.get("projection") or "Faites le lien explicite avec le poste ciblé."),
                "delivery": str(delivery_analysis.get("assessment") or analysis.get("delivery") or "Travaillez la fluidité et la respiration si nécessaire."),
            },
            "improved_pitch": improved_pitch or _fallback_feedback()["improved_pitch"],
        }

        response = {
            "score": feedback["score"],
            "subscores": feedback["subscores"],
            "metrics": metrics,
            "feedback": {
                "pace_and_silences": feedback["analysis"]["delivery"],
                "structure_and_clarity": feedback["analysis"]["structure"],
                "impact_and_length": f"Votre pitch vise {target_job} chez {target_company}. Resserrez-le pour tenir dans le tempo attendu.",
                "relevance_to_target": f"Le message doit relier vos preuves au poste de {target_job}.",
                "examples_precision": feedback["analysis"].get("proofs"),
                "actionable_advice": feedback["weaknesses"][:4],
                "alternative_hook": feedback["analysis"].get("alternative_hook"),
            },
            "micro_exercises": [
                {"title": "Accroche en 1 phrase", "description": "Formulez votre valeur ajoutée en 15 secondes."},
                {"title": "Preuve chiffrée", "description": "Ajoutez un résultat concret ou un KPI."},
                {"title": "Conclusion nette", "description": "Terminez par une phrase d'ouverture vers l'échange."},
            ],
            "strengths": feedback["strengths"],
            "weaknesses": feedback["weaknesses"],
            "analysis": feedback["analysis"],
            "improved_pitch": feedback["improved_pitch"],
        }

    except HTTPException:
        await refund_quota(user_id, "pitch", cost=2)
        raise
    except Exception as e:
        await refund_quota(user_id, "pitch", cost=2)
        print(f"[VOCAL PITCH] Error: {e}", flush=True)
        feedback = _fallback_feedback()
        metrics = _build_metrics()
        response = {
            "score": feedback["score"],
            "metrics": metrics,
            "feedback": {
                "pace_and_silences": feedback["analysis"]["delivery"],
                "structure_and_clarity": feedback["analysis"]["structure"],
                "impact_and_length": f"Votre pitch vise {target_job} chez {target_company}. Resserrez-le pour tenir dans le tempo attendu.",
                "relevance_to_target": f"Le message doit relier vos preuves au poste de {target_job}.",
                "examples_precision": feedback["analysis"]["hook"],
                "actionable_advice": feedback["weaknesses"][:4],
            },
            "micro_exercises": [
                {"title": "Accroche en 1 phrase", "description": "Formulez votre valeur ajoutée en 15 secondes."},
                {"title": "Preuve chiffrée", "description": "Ajoutez un résultat concret ou un KPI."},
                {"title": "Conclusion nette", "description": "Terminez par une phrase d'ouverture vers l'échange."},
            ],
            "strengths": feedback["strengths"],
            "weaknesses": feedback["weaknesses"],
            "analysis": feedback["analysis"],
            "improved_pitch": feedback["improved_pitch"],
        }

    session_id = f"pitch_{user_id}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    try:
        async with db.get_connection() as conn:
            await db.execute(
                conn,
                """
                INSERT INTO training_sessions (id, user_id, theme, question_type, question_text, user_answer, score, strengths, weaknesses, improved_answer, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, NOW())
                """,
                (
                    session_id,
                    user_id,
                    target_job,
                    "PITCH",
                    target_company or job_description or "Pitch oral",
                    transcript,
                    int(feedback.get("score") or 0),
                    json.dumps(feedback.get("strengths") or [], ensure_ascii=False),
                    json.dumps(feedback.get("weaknesses") or [], ensure_ascii=False),
                    str(feedback.get("improved_pitch") or ""),
                    json.dumps(["pitch", "oral"], ensure_ascii=False),
                )
            )
    except Exception as e:
        print(f"[VOCAL PITCH] History save failed: {e}", flush=True)

    return response


@router.get("/cache/company-check")
async def check_company_cache(
    company: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Vérifie si une analyse entreprise existe déjà dans le cache partagé.
    Retourne { cached: bool } — utilisé par le front pour afficher le coût réel avant lancement.
    """
    try:
        return {"cached": await _is_company_analysis_cached(company)}
    except Exception as e:
        print(f"[CACHE CHECK] {e}", flush=True)
        return {"cached": False}


async def _is_company_analysis_cached(company: str, industry: str = "") -> bool:
    from .cache_service import _company_key, COMPANY_TTL_DAYS, _is_expired

    normalized_company = (company or "").strip()
    normalized_industry = (industry or "").strip()
    if not normalized_company and not normalized_industry:
        return True

    key = _company_key(normalized_company, normalized_industry)
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT cached_at FROM company_analysis_cache WHERE cache_key = %s",
            (key,)
        )
        row = await cursor.fetchone()

    if not row:
        return False

    cached_at = row[0] if not hasattr(row, "keys") else row.get("cached_at")
    return not _is_expired(cached_at, COMPANY_TTL_DAYS)


async def _is_job_offer_analysis_cached(job_description: str) -> bool:
    from .cache_service import _offer_key, JOB_OFFER_TTL_DAYS, _is_expired

    normalized_description = str(job_description or "").strip()
    if len(normalized_description) <= 50:
        return True

    key = _offer_key(normalized_description)
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT cached_at FROM job_offer_cache WHERE cache_key = %s",
            (key,)
        )
        row = await cursor.fetchone()

    if not row:
        return False

    cached_at = row[0] if not hasattr(row, "keys") else row.get("cached_at")
    return not _is_expired(cached_at, JOB_OFFER_TTL_DAYS)


@router.post("/cache/analysis-preview")
async def get_analysis_preview(
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Prévisualise le coût réel d'une analyse cible en se basant sur le même cache
    que les tâches backend. Permet au frontend d'éviter une confirmation inutile
    quand l'entreprise et l'offre sont déjà couvertes.
    """
    try:
        company = str(payload.get("target_company") or payload.get("company") or "").strip()
        industry = str(payload.get("target_industry") or payload.get("industry") or "").strip()
        job_description = str(payload.get("job_description") or "").strip()

        company_cached = await _is_company_analysis_cached(company, industry)
        offer_cached = await _is_job_offer_analysis_cached(job_description)

        async with db.get_connection() as conn:
            cursor = await db.execute(
                conn,
                "SELECT credits, quota_entreprises, quota_offres FROM users WHERE id = ?",
                (current_user["id"],)
            )
            row = await cursor.fetchone()

        quotas = {
            "credits": 30,
            "entreprises": 5,
            "offres": 15,
        }
        if row:
            data = dict(row) if hasattr(row, "keys") else {
                "credits": row[0],
                "quota_entreprises": row[1] if len(row) > 1 else 5,
                "quota_offres": row[2] if len(row) > 2 else 15,
            }
            def _effective_session_balance(raw_value: int | None) -> int:
                try:
                    val = int(raw_value or 0)
                except Exception:
                    val = 0
                return TESTER_SESSION_CAP if val <= 0 else val

            quotas = {
                "credits": _effective_session_balance(data.get("credits")),
                "entreprises": int(data.get("quota_entreprises") or 0),
                "offres": int(data.get("quota_offres") or 0),
            }

        costs = {
            "entreprises": 0 if company_cached else 1,
            "offres": 0 if offer_cached else 1,
        }

        return {
            "company_cached": company_cached,
            "offer_cached": offer_cached,
            "costs": costs,
            "should_confirm": (costs["entreprises"] + costs["offres"]) > 0,
            "quotas": quotas,
        }
    except Exception as e:
        print(f"[ANALYSIS PREVIEW] {e}", flush=True)
        return {
            "company_cached": False,
            "offer_cached": False,
            "costs": {"entreprises": 1, "offres": 1},
            "should_confirm": True,
            "quotas": {"credits": 30, "entreprises": 5, "offres": 15},
        }


@router.get("/training/stats")
async def get_training_stats(current_user: dict = Depends(get_current_user)):
    """Retourne des statistiques agrégées pour les sessions de training de l'utilisateur.
    - global_score: moyenne des scores (arrondie)
    - total_sessions: nombre total de sessions
    - theme_scores: moyenne par thème
    - theme_counts: nombre de sessions par thème
    """
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(
                conn,
                "SELECT COUNT(*) as total_sessions, AVG(score) as avg_score FROM training_sessions WHERE user_id = ?",
                (current_user["id"],)
            )
            row = await cursor.fetchone()

            total_sessions = int(row.get("total_sessions") or 0)
            avg_score = float(row.get("avg_score") or 0)

            include_tags = True
            try:
                cursor2 = await db.execute(
                    conn,
                    "SELECT theme, score, tags FROM training_sessions WHERE user_id = ?",
                    (current_user["id"],)
                )
                rows = await cursor2.fetchall()
            except Exception as exc:
                print(f"[TRAINING_STATS] Falling back to legacy schema without tags: {exc}", flush=True)
                include_tags = False
                cursor2 = await db.execute(
                    conn,
                    "SELECT theme, score FROM training_sessions WHERE user_id = ?",
                    (current_user["id"],)
                )
                rows = await cursor2.fetchall()

            theme_scores = {label: 0.0 for label in TRAINING_THEME_ORDER}
            theme_counts = {label: 0 for label in TRAINING_THEME_ORDER}

            for r in rows:
                score = float(r.get("score") or 0)
                theme = r.get("theme") or ""
                raw_tags = r.get("tags") if include_tags else None
                tags = _normalize_training_tags(raw_tags, fallback_text=theme)
                if not tags:
                    fallback_tag = _theme_to_tag(theme)
                    if fallback_tag:
                        tags = [fallback_tag]
                if not tags:
                    continue

                for tag in tags:
                    label = TRAINING_THEME_LABELS.get(tag, tag)
                    if label not in theme_scores:
                        theme_scores[label] = 0.0
                        theme_counts[label] = 0
                    theme_scores[label] += score
                    theme_counts[label] += 1

            for label in theme_scores:
                count = theme_counts.get(label) or 0
                if count > 0:
                    theme_scores[label] = round(theme_scores[label] / count, 1)
                else:
                    theme_scores[label] = 0.0

        return {
            "global_score": round(avg_score, 0),
            "total_sessions": total_sessions,
            "theme_scores": theme_scores,
            "theme_counts": theme_counts
        }
    except Exception as e:
        print(f"[CV STATS] Error computing training stats: {e}")
        return {"global_score": 0, "total_sessions": 0, "theme_scores": {}, "theme_counts": {}}


@router.get("/me/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Récupère le profil complet (JSON) de l'utilisateur connecté."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (current_user["id"],))
            row = await cursor.fetchone()
            if row and row.get("profile_data"):
                data = row.get("profile_data")
                if isinstance(data, str):
                    try:
                        return json.loads(data)
                    except Exception:
                        return {"form": {"email": current_user.get("email", "")}}
                return data
        # Fallback si aucun profil n'est trouvé
        return {"form": {"email": current_user.get("email", "")}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de base de données: {e}")


@router.post("/me/profile")
async def update_my_profile(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Met à jour (écrase) le profil complet du candidat dans la base de données."""
    try:
        if 'experiences' in payload and isinstance(payload['experiences'], list):
            normalized_experiences = []
            for exp in payload['experiences']:
                if isinstance(exp, dict):
                    normalized_experiences.append(exp)
            normalized_experiences.sort(key=lambda exp: _get_sortable_date_tuple(exp.get('end_date') or exp.get('endDate') or exp.get('date') or ''), reverse=True)
            payload['experiences'] = normalized_experiences
        if 'educations' in payload and isinstance(payload['educations'], list):
            normalized_educations = []
            for edu in payload['educations']:
                if isinstance(edu, dict):
                    normalized_educations.append(edu)
            normalized_educations.sort(key=lambda edu: _get_sortable_date_tuple(edu.get('end_date') or edu.get('endDate') or edu.get('date') or ''), reverse=True)
            payload['educations'] = normalized_educations

        # Behavioral fields saved separately
        _BEHAVIORAL_FIELDS = {
            'flaws', 'motivations', 'work_style', 'relational_style',
            'professional_approach', 'coaching_style', 'fears',
            'clarification_insights', 'stress_level', 'current_situation',
            'salary_expectations', 'remote_preference',
        }
        behavioral = {k: payload.get(k) for k in _BEHAVIORAL_FIELDS if k in payload}

        async with db.get_connection() as conn:
            profile_json = json.dumps(payload)
            await db.execute(conn, "INSERT INTO user_profiles (user_id, profile_data) VALUES (?, ?::jsonb) ON CONFLICT (user_id) DO UPDATE SET profile_data = EXCLUDED.profile_data", (current_user["id"], profile_json))
            if behavioral:
                try:
                    await db.execute(
                        conn,
                        """INSERT INTO candidate_behavioral_data
                            (user_id, flaws, motivations, work_style, relational_style,
                             professional_approach, coaching_style, fears, clarification_insights,
                             stress_level, current_situation, salary_expectations, remote_preference,
                             updated_at)
                           VALUES (?, ?::jsonb, ?, ?::jsonb, ?::jsonb, ?::jsonb, ?, ?, ?::jsonb, ?, ?, ?, ?, NOW())
                           ON CONFLICT (user_id) DO UPDATE SET
                             flaws = EXCLUDED.flaws,
                             motivations = EXCLUDED.motivations,
                             work_style = EXCLUDED.work_style,
                             relational_style = EXCLUDED.relational_style,
                             professional_approach = EXCLUDED.professional_approach,
                             coaching_style = EXCLUDED.coaching_style,
                             fears = EXCLUDED.fears,
                             clarification_insights = EXCLUDED.clarification_insights,
                             stress_level = EXCLUDED.stress_level,
                             current_situation = EXCLUDED.current_situation,
                             salary_expectations = EXCLUDED.salary_expectations,
                             remote_preference = EXCLUDED.remote_preference,
                             updated_at = NOW()
                        """,
                        (
                            current_user["id"],
                            json.dumps(behavioral.get('flaws') or []),
                            behavioral.get('motivations') or None,
                            json.dumps(behavioral.get('work_style') or []),
                            json.dumps(behavioral.get('relational_style') or []),
                            json.dumps(behavioral.get('professional_approach') or []),
                            behavioral.get('coaching_style') or None,
                            behavioral.get('fears') or None,
                            json.dumps(behavioral.get('clarification_insights') or []),
                            behavioral.get('stress_level') or None,
                            behavioral.get('current_situation') or None,
                            behavioral.get('salary_expectations') or None,
                            behavioral.get('remote_preference') or None,
                        )
                    )
                except Exception as behavioral_err:
                    print(f"[PROFILE WARNING] Behavioral data not saved: {behavioral_err}", flush=True)
        return {"status": "success", "message": "Profil sauvegardé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de sauvegarde du profil: {e}")

@router.post("/analyze-completeness")
async def analyze_completeness(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Generate clarification questions through IA with strict relevance guardrails.
    Goal: extract actionable signals that improve downstream interview modules.
    """
    try:
        target_lang = normalize_language(payload.get("target_language", "French"))
        prompt_template = load_prompt("completeness_check_v1.md")
        safe_data = _sanitize_data_for_ai(payload, strict=True)

        # Deterministic fallback in case AI output is weak or malformed
        fallback = []
        experiences = payload.get('experiences') or []
        skills = payload.get('skills') or []
        target_company = (payload.get('target_company') or '').strip()
        target_job = (payload.get('target_job') or payload.get('target_role_primary') or 'le poste visé').strip()
        target_industry = (payload.get('target_industry') or '').strip()

        context_label = target_job
        if target_company:
            context_label = f"{target_job} chez {target_company}"
        elif target_industry:
            context_label = f"{target_job} dans le secteur {target_industry}"

        # 1) Impact chiffré lié au poste cible
        if isinstance(experiences, list) and len(experiences) > 0:
            latest = experiences[0]
            role = latest.get('role') or latest.get('title') or ''
            company = latest.get('company') or ''
            if role or company:
                fallback_role = "responsable"
                q = f"Pour réussir en tant que {context_label}, quelle réalisation mesurable de votre expérience en tant que {role or fallback_role}{(' chez ' + company) if company else ''} démontre le mieux votre impact (KPI, périmètre, délai) ?"
            else:
                q = f"Quelle réalisation récente prouve votre adéquation au rôle {context_label}, avec résultats quantifiés (avant/après, KPI, horizon) ?"
            fallback.append({"id": 1, "field": "experiences", "question": q, "answer": ""})
        else:
            fallback.append({
                "id": 1,
                "field": "experiences",
                "question": f"Pour {context_label}, donnez un exemple de projet que vous avez piloté avec un résultat chiffré (KPI, coût, délai, qualité) et votre rôle exact.",
                "answer": ""
            })

        # 2) Motivations et adéquation contexte cible
        if target_company:
            q2 = f"Quelles priorités business de {target_company} vous semblent les plus critiques pour ce poste, et quelles preuves concrètes de votre parcours montrent que vous pouvez y répondre rapidement ?"
        else:
            q2 = f"Quelles sont les 2 attentes les plus importantes du poste de {target_job}, et quelles expériences précises démontrent que vous êtes déjà opérationnel ?"
        fallback.append({"id": 2, "field": "target_fit", "question": q2, "answer": ""})

        # 3) Objection probable et parade
        top_skill = None
        if isinstance(skills, list) and len(skills) > 0:
            top_skill = skills[0]
        elif isinstance(skills, str) and skills.strip():
            # comma separated string fallback
            parts = [s.strip() for s in skills.split(',') if s.strip()]
            if parts:
                top_skill = parts[0]

        if top_skill:
            q3 = f"Quelle objection un recruteur pourrait-il formuler sur votre capacité à livrer en {top_skill} dans le rôle {context_label}, et quelle preuve factuelle utiliseriez-vous pour la désamorcer ?"
        else:
            q3 = f"Quelle objection principale anticipez-vous pour le rôle {context_label}, et quelle réponse basée sur des résultats concrets préparerez-vous ?"
        fallback.append({"id": 3, "field": "objections", "question": q3, "answer": ""})

        if not prompt_template:
            return {"clarifications": fallback}

        final_prompt = (
            prompt_template
            .replace("{{CANDIDATE_DATA_JSON}}", json.dumps(safe_data, ensure_ascii=False, indent=2, default=str))
            .replace("{{TARGET_LANGUAGE}}", target_lang)
        )
        ai_result = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are a senior interview strategist. Output STRICT JSON only. Language: {target_lang}.",
            bypass_queue=True
        )

        raw_clarifications = []
        if isinstance(ai_result, dict):
            raw_clarifications = ai_result.get("clarifications") or []
        elif isinstance(ai_result, list):
            raw_clarifications = ai_result

        normalized = []
        for i, item in enumerate(raw_clarifications[:3]):
            if isinstance(item, dict):
                question = str(item.get("question") or "").strip()
                field = str(item.get("field") or "").strip() or "clarifications"
                if question:
                    normalized.append({
                        "id": i + 1,
                        "field": field,
                        "question": question,
                        "suggested_answer": str(item.get("suggested_answer") or "").strip(),
                        "why_it_matters": str(item.get("why_it_matters") or "").strip(),
                        "answer": ""
                    })
            elif isinstance(item, str) and item.strip():
                normalized.append({
                    "id": i + 1,
                    "field": "clarifications",
                    "question": item.strip(),
                    "suggested_answer": "",
                    "why_it_matters": "",
                    "answer": ""
                })

        def _looks_too_generic(question_text: str) -> bool:
            q = (question_text or "").strip().lower()
            if len(q) < 45:
                return True
            if "utilisé '" in q and "pour résoudre un problème" in q:
                return True
            strategic_markers = ["kpi", "impact", "résultat", "poste", "recruteur", "objection", "priorit", "business", "enjeu", "délai", "périmètre"]
            if not any(marker in q for marker in strategic_markers):
                return True
            return False

        if len(normalized) != 3 or any(_looks_too_generic(c.get("question", "")) for c in normalized):
            return {"clarifications": fallback}

        return {"clarifications": normalized}
    except Exception as e:
        print(f"[ANALYZE] Error building clarifications: {e}", flush=True)
        return {"clarifications": [
            {"id": 1, "field": "experiences", "question": "Quelle réalisation récente illustre le mieux votre impact avec un KPI concret (avant/après) ?", "answer": ""},
            {"id": 2, "field": "target_fit", "question": "Quelles attentes du poste cible pouvez-vous couvrir immédiatement avec des preuves précises de votre parcours ?", "answer": ""},
            {"id": 3, "field": "objections", "question": "Quelle objection principale anticipez-vous en entretien et quelle preuve factuelle préparerez-vous pour y répondre ?", "answer": ""}
        ]}

TRAINING_POOL_STORE: dict = {}
_TRAINING_POOL_LOCK = asyncio.Lock()
TRAINING_POOL_VERSION = "v1"
TRAINING_POOL_SIZE = 5


def _build_training_pool_key(user_id: str | None, candidate_data: dict) -> str:
    profile = candidate_data.get("profile") if isinstance(candidate_data.get("profile"), dict) else {}
    context = {
        "user_id": user_id or "",
        "version": TRAINING_POOL_VERSION,
        "target_company": candidate_data.get("target_company") or candidate_data.get("company") or "",
        "target_job": candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "",
        "target_language": candidate_data.get("target_language") or "French",
        "interview_format": candidate_data.get("interview_format") or "",
        "stress_level": candidate_data.get("stress_level") or "",
        "skills": candidate_data.get("skills") or profile.get("skills") or [],
        "theme": candidate_data.get("theme") or "",
    }
    return json.dumps(context, sort_keys=True, ensure_ascii=False)


async def _get_training_pool(user_id: str | None, candidate_data: dict) -> dict | None:
    key = _build_training_pool_key(user_id, candidate_data)
    async with _TRAINING_POOL_LOCK:
        return TRAINING_POOL_STORE.get(key)


async def _upsert_training_pool(user_id: str | None, candidate_data: dict, pool_data: dict) -> dict:
    key = _build_training_pool_key(user_id, candidate_data)
    async with _TRAINING_POOL_LOCK:
        TRAINING_POOL_STORE[key] = pool_data
        return pool_data


async def _consume_training_pool_item(user_id: str | None, candidate_data: dict, question_type: str) -> dict | None:
    pool_key = _build_training_pool_key(user_id, candidate_data)
    async with _TRAINING_POOL_LOCK:
        pool = TRAINING_POOL_STORE.get(pool_key)
        if not pool:
            pool_data = await _build_training_pool_for_context(user_id, candidate_data)
            await _upsert_training_pool(user_id, candidate_data, pool_data)
            pool = TRAINING_POOL_STORE.get(pool_key)

        if not pool:
            return None

        bucket = pool.get("mes") if question_type == "MES" else pool.get("qa")
        if not isinstance(bucket, list) or not bucket:
            pool_data = await _build_training_pool_for_context(user_id, candidate_data)
            await _upsert_training_pool(user_id, candidate_data, pool_data)
            pool = TRAINING_POOL_STORE.get(pool_key)
            bucket = pool.get("mes") if question_type == "MES" else pool.get("qa") if isinstance(pool, dict) else None

        if not isinstance(bucket, list) or not bucket:
            return None

        item = bucket.pop(0)
        if not bucket:
            pool["status"] = "EMPTY"
        else:
            pool["status"] = "READY"
        TRAINING_POOL_STORE[pool_key] = pool
        return item


def _default_pitch_matrix(candidate_data: dict) -> dict:
    fallback_name = candidate_data.get("first_name") or (candidate_data.get("personal_info") or {}).get("first_name") or "le candidat"
    fallback_job = candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "ce poste"
    base_30 = f"Ce qui me distingue pour {fallback_job}, c'est ma capacité à produire des résultats mesurables rapidement, avec une exécution fiable et un vrai sens des priorités."
    base_3m = f"Le fil rouge de mon parcours, c'est de transformer des objectifs stratégiques en résultats concrets. Pour {fallback_job}, j'apporte une combinaison de vision, d'exécution et d'alignement des parties prenantes, avec une approche orientée impact durable."
    return {
        "core_pitches": {
            "thirty_seconds": {
                "written": base_30,
                "oral": base_30,
                "goal": "Accrocher rapidement en début d'entretien.",
                "dominant_angle": "Impact immédiat",
                "word_count_target": "70-90"
            },
            "three_minutes": {
                "written": base_3m,
                "oral": base_3m,
                "goal": "Développer un narratif complet et convaincant.",
                "dominant_angle": "Trajectoire et impact",
                "word_count_target": "380-520"
            }
        },
        "audience_adaptations": {
            "role_fit_pitch": {
                "written": f"Pour {fallback_job}, je peux rapidement prendre en main les priorités opérationnelles et sécuriser l'exécution.",
                "oral": f"Concrètement, pour {fallback_job}, je peux prendre la main sur les priorités opérationnelles et livrer vite.",
                "angle": "Adéquation opérationnelle"
            },
            "business_impact_pitch": {
                "written": f"Je relie les décisions opérationnelles aux enjeux business et à la création de valeur sur {fallback_job}.",
                "oral": f"Mon approche, c'est d'aligner l'opérationnel avec les enjeux business pour créer de la valeur mesurable.",
                "angle": "Impact business"
            },
            "culture_fit_pitch": {
                "written": "Je m'intègre vite, je crée de la confiance et je maintiens une communication claire dans des environnements exigeants.",
                "oral": "Je m'intègre vite, je crée de la confiance, et je garde une communication claire, même dans des contextes exigeants.",
                "angle": "Compatibilité culturelle"
            },
            "objection_handling_pitch": {
                "written": f"Le principal risque perçu est transformé en atout par une progression concrète et des résultats observables sur {fallback_job}.",
                "oral": "L'objection principale existe, mais je la transforme en force avec des résultats concrets et une progression visible.",
                "angle": "Désamorçage de l'objection"
            }
        },
        "differentiation_check": {
            "manager_vs_hr": "Le manager cherche l'exécution, le RH cherche la cohérence comportementale.",
            "manager_vs_executive": "Le manager regarde l'opérationnel, le dirigeant regarde l'impact business.",
            "similarity_risk": "low"
        },
        "coaching_notes": {
            "strongest_angle": f"Mettre en avant la capacité de {fallback_name} à relier stratégie et exécution.",
            "main_risk": "Pitch trop générique si les preuves chiffrées sont absentes.",
            "phrases_to_avoid": ["Je suis passionné", "Je suis dynamique", "Je suis motivé"],
            "recommended_pitch_for_first_interview": "role_fit_pitch",
            "critique": "Le pitch doit intégrer des preuves chiffrées pour être mémorable."
        }
    }

def _ensure_pitch_matrix_shape(result: dict, candidate_data: dict) -> dict:
    base = _default_pitch_matrix(candidate_data)
    if not isinstance(result, dict):
        return base

    for top_key in ["core_pitches", "audience_adaptations", "differentiation_check", "coaching_notes"]:
        if isinstance(result.get(top_key), dict):
            if isinstance(base.get(top_key), dict):
                base[top_key].update(result[top_key])
            else:
                base[top_key] = result[top_key]

    for section in ["core_pitches", "audience_adaptations"]:
        sec = base.get(section, {})
        if not isinstance(sec, dict):
            continue
        for _, value in sec.items():
            if isinstance(value, dict):
                oral = value.get("oral")
                written = value.get("written")
                if isinstance(oral, str) and not isinstance(written, str):
                    value["written"] = oral
                if isinstance(written, str) and not isinstance(oral, str):
                    value["oral"] = written
    return base

async def generate_interview_questions(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("interview_questions.md")
    safe_data = _sanitize_data_for_ai(candidate_data, strict=True)
    theme_context = _build_training_prompt_context(candidate_data)
    requested_count_raw = candidate_data.get("count") or candidate_data.get("question_count")
    requested_count = None
    if requested_count_raw is not None and str(requested_count_raw).strip() != "":
        try:
            requested_count = max(1, min(INTERVIEW_QUESTIONS_MAX_COUNT, int(requested_count_raw)))
        except (TypeError, ValueError):
            requested_count = None

    quantity_rule = (
        f"- Return exactly {requested_count} interview questions as STRICT JSON.\n"
        if requested_count is not None
        else f"- Dynamic quantity is mandatory: generate one question per relevant domain from interview_questions.md and return between {INTERVIEW_DYNAMIC_MIN_COUNT} and {INTERVIEW_DYNAMIC_MAX_COUNT} questions.\n"
    )
    final_prompt = (
        f"{prompt_template}\n\n"
        f"CANDIDATE_CONTEXT:\n{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}\n\n"
        f"STRICT TAG RULES:\n"
        f"{quantity_rule}"
        f"- Each question MUST include a 'tags' array of 1 to 3 values chosen only from: management, gestion_de_crise, negotiation, leadership, communication.\n"
        f"- Never invent a new theme.\n"
        f"- Prefer tags that fit the offer and the candidate profile, and diversify toward less-used themes when relevance allows.\n"
        f"{theme_context}\n\n"
        f"OUTPUT LANGUAGE: {target_lang}"
    )
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are an expert interviewer. Output STRICT JSON only. Language: {target_lang}."
    )

    if isinstance(result, dict) and isinstance(result.get("questions"), list):
        clean = []
        for q in result["questions"]:
            if isinstance(q, dict) and isinstance(q.get("question"), str) and q.get("question").strip():
                tags = _normalize_training_tags(q.get("tags"), fallback_text=f"{q.get('question', '')} {q.get('category', '')}")
                clean.append({
                    **q,
                    "question": q.get("question", "").strip(),
                    "tags": tags,
                    "category": q.get("category") or "Général",
                    "score": q.get("score") or 3,
                    "suggested_answer": q.get("suggested_answer") or "",
                    "advice": q.get("advice") or "Structurez votre réponse avec la méthode STAR."
                })
                if requested_count is not None and len(clean) >= requested_count:
                    break
        if clean:
            if requested_count is None:
                clean = clean[:INTERVIEW_DYNAMIC_MAX_COUNT]
            recruiter_question = next(
                (
                    item for item in clean
                    if str(item.get("category") or "").strip().lower() in {"questions à poser au recruteur", "questions to ask recruiter"}
                    or str(item.get("question") or "").strip().lower() in {"avez-vous des questions pour nous ?", "do you have any questions for us?"}
                ),
                None
            )
            if recruiter_question:
                clean = [item for item in clean if item is not recruiter_question]
                recruiter_question["category"] = recruiter_question.get("category") or "Questions à poser au recruteur"
                recruiter_question["question"] = recruiter_question.get("question") or "Avez-vous des questions pour nous ?"
                recruiter_question["suggested_answer"] = recruiter_question.get("suggested_answer") or "Oui : 1) Quels sont les 2 enjeux business prioritaires sur les 6 prochains mois ? 2) Quels KPI définissent une réussite à 90 jours sur ce poste ? 3) Quelles erreurs coûtent le plus cher dans cette fonction ?"
                recruiter_question["advice"] = recruiter_question.get("advice") or "Le recruteur vérifie votre posture stratégique, votre niveau de préparation et votre compréhension des priorités business."

                # Inject mandatory "3 défauts" question if not already present
                has_flaw_question = any(
                    'défaut' in str(q.get('question', '')).lower() or
                    'défaut' in str(q.get('category', '')).lower() or
                    'faiblesse' in str(q.get('question', '')).lower()
                    for q in clean
                )
                if not has_flaw_question:
                    flaws_raw = candidate_data.get('flaws') or []
                    if isinstance(flaws_raw, list) and flaws_raw:
                        flaw_items = []
                        for f in flaws_raw[:3]:
                            if isinstance(f, dict):
                                flaw_items.append(f.get('flaw') or f.get('text') or f.get('value') or str(f))
                            elif isinstance(f, str):
                                flaw_items.append(f)
                        flaw_text = ', '.join(filter(None, flaw_items))
                        suggested = (
                            f"Préparez 3 vrais défauts travaillés avec la méthode STAR inversée : "
                            f"nommez-les clairement ({flaw_text}), montrez la prise de conscience, "
                            f"l'action corrective concrète et le résultat mesurable. "
                            f"Évitez les faux défauts ('je suis trop perfectionniste'). "
                            f"Le recruteur a déjà entendu tout ça."
                        )
                    else:
                        suggested = (
                            "Préparez 3 vrais défauts travaillés : nommez-les clairement, "
                            "montrez votre prise de conscience, l'action corrective engagée et le progrès mesuré. "
                            "Évitez impérativement les faux défauts ('je travaille trop') — le recruteur les détecte immédiatement. "
                            "Exemple de structure : 'J'avais tendance à X, ce qui causait Y. J'ai mis en place Z et depuis lors W.'"
                        )
                    flaw_question = {
                        "id": "mandatory_flaws",
                        "category": "Argent / Ego / Image de soi",
                        "question": "Quels sont vos trois principaux défauts ?",
                        "score": 3,
                        "tags": ["communication", "leadership"],
                        "advice": (
                            "Le recruteur teste la conscience de soi et la capacité à se remettre en question "
                            "sans se dévaloriser. Il cherche à savoir si vous avez réfléchi à vos axes de progrès, "
                            "si vous êtes authentique, et si votre autocritique est mature. "
                            "Une réponse générique ou défensive est éliminatoire."
                        ),
                        "suggested_answer": suggested,
                    }
                    clean.append(flaw_question)

                clean.append(recruiter_question)
            if requested_count is not None:
                return {"questions": clean}
            if len(clean) >= INTERVIEW_DYNAMIC_MIN_COUNT:
                return {"questions": clean}

    skills = safe_data.get("skills", [])
    top_skill = skills[0] if isinstance(skills, list) and skills else "votre domaine"
    fallback_questions = [
        {"category": "Motivation réelle", "question": "Pourquoi quitter votre poste actuel maintenant, et qu'est-ce qui vous manque structurellement dans votre environnement actuel ?", "score": 4, "suggested_answer": "", "advice": "Le recruteur teste si votre motivation repose sur une vision professionnelle durable plutôt que sur une fuite conjoncturelle.", "tags": ["leadership", "communication"]},
        {"category": "Compréhension Business / Secteur", "question": "Quels sont selon vous les deux risques business majeurs du secteur aujourd'hui, et comment influencent-ils les priorités du poste ?", "score": 4, "suggested_answer": "", "advice": "Le recruteur mesure votre capacité à relier les enjeux macro au terrain opérationnel.", "tags": ["management", "leadership"]},
        {"category": "Gestion de crise / conflit", "question": "Racontez-moi une fois où vous avez dû gérer une crise avec des parties prenantes en désaccord. Qu'avez-vous arbitré et avec quel impact ?", "score": 5, "suggested_answer": "", "advice": "Le recruteur observe votre solidité émotionnelle et votre capacité d'arbitrage sous pression.", "tags": ["gestion_de_crise", "communication"]},
        {"category": "Leadership / Management", "question": "Racontez-moi une fois où vous avez dû recadrer un collaborateur performant mais destructeur pour l'équipe.", "score": 5, "suggested_answer": "", "advice": "Le recruteur évalue votre courage managérial et votre sens de l'équilibre performance/culture.", "tags": ["leadership", "management"]},
        {"category": "Résistance à la pression", "question": "Racontez-moi une période de surcharge prolongée : comment avez-vous protégé la qualité de livraison sans épuiser l'équipe ?", "score": 4, "suggested_answer": "", "advice": "Le recruteur cherche des preuves de priorisation lucide et de gestion durable de la pression.", "tags": ["gestion_de_crise", "management"]},
        {"category": "Expertise Métier", "question": f"Racontez-moi un cas concret où votre expertise en {top_skill} a changé une décision importante.", "score": 4, "suggested_answer": "", "advice": "Le recruteur teste la profondeur métier réelle derrière le discours.", "tags": ["management"]},
        {"category": "Intelligence politique / Relationnelle", "question": "Racontez-moi une fois où vous étiez en désaccord avec une décision hiérarchique : comment avez-vous influencé sans vous opposer frontalement ?", "score": 5, "suggested_answer": "", "advice": "Le recruteur évalue votre diplomatie et votre capacité d'influence dans les zones de tension.", "tags": ["communication", "negotiation"]},
        {"category": "Projection / Ambition", "question": "Si nous vous recrutons, quel impact concret voulez-vous avoir dans 12 à 18 mois sur ce poste ?", "score": 3, "suggested_answer": "", "advice": "Le recruteur vérifie l'alignement entre ambition, réalisme et valeur attendue.", "tags": ["leadership"]},
        {"category": "Argent / Ego / Statut", "question": "Qu'est-ce qui compte le plus pour vous entre périmètre, rémunération, visibilité et marge de décision, et pourquoi ?", "score": 4, "suggested_answer": "", "advice": "Le recruteur sonde vos véritables moteurs et les risques de désalignement futur.", "tags": ["negotiation", "leadership"]},
        {"category": "Compatibilité Culturelle (Fit)", "question": "Dans quel type de culture vous devenez le plus performant, et dans quel contexte vous êtes moins efficace ?", "score": 3, "suggested_answer": "", "advice": "Le recruteur cherche à anticiper votre niveau d'adaptation à l'environnement réel de l'équipe.", "tags": ["communication"]},
        {"category": "Questions pièges / Déstabilisation", "question": "Pourquoi choisir votre profil plutôt qu'un candidat plus jeune ou moins cher ?", "score": 5, "suggested_answer": "", "advice": "Le recruteur teste votre capacité à défendre votre valeur sans arrogance ni justification défensive.", "tags": ["leadership", "communication"]},
        {"category": "Argent / Ego / Image de soi", "id": "mandatory_flaws", "question": "Quels sont vos trois principaux défauts ?", "score": 3, "suggested_answer": "Préparez 3 vrais défauts travaillés : nommez-les clairement, montrez votre prise de conscience, l'action corrective engagée et le progrès mesuré. Évitez les faux défauts ('je suis trop perfectionniste'). Exemple : 'J'avais tendance à X, ce qui causait Y. J'ai mis en place Z et depuis lors W.'", "advice": "Le recruteur teste la conscience de soi et la capacité à se remettre en question sans se dévaloriser. Une réponse générique est éliminatoire.", "tags": ["communication", "leadership"]},
        {"category": "Questions à poser au recruteur", "question": "Avez-vous des questions pour nous ?", "score": 2, "suggested_answer": "Oui : 1) Quelles sont les 2 priorités critiques à sécuriser dans les 90 prochains jours ? 2) Quels KPI feront dire objectivement que la prise de poste est un succès ? 3) Quels blocages internes risquent de freiner la mission et comment l'entreprise les traite ?", "advice": "Le recruteur évalue votre niveau stratégique, votre capacité d'anticipation et votre orientation résultats.", "tags": ["communication"]}
    ]

    if requested_count is not None:
        return {"questions": fallback_questions[:requested_count]}

    return {"questions": fallback_questions[:INTERVIEW_DYNAMIC_MAX_COUNT]}

async def generate_custom_scenarios(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("custom_scenarios.md")
    safe_data = _sanitize_data_for_ai(candidate_data, strict=True)
    theme_context = _build_training_prompt_context(candidate_data)
    requested_count = int(candidate_data.get("count") or candidate_data.get("scenario_count") or 1)
    requested_count = max(1, min(TRAINING_POOL_SIZE, requested_count))
    final_prompt = (
        f"{prompt_template}\n\n"
        f"CANDIDATE_CONTEXT:\n{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}\n\n"
        f"STRICT TAG RULES:\n"
        f"- Return enough scenarios to provide at least {requested_count} usable items.\n"
        f"- Each scenario MUST include a 'tags' array of 1 to 3 values chosen only from: management, gestion_de_crise, negotiation, leadership, communication.\n"
        f"- Never invent a new theme.\n"
        f"- Prefer tags that fit the offer and diversify toward less-used themes when relevance allows.\n"
        f"{theme_context}\n\n"
        f"OUTPUT LANGUAGE: {target_lang}"
    )
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are an expert interviewer. Output STRICT JSON only. Language: {target_lang}."
    )

    if isinstance(result, dict) and isinstance(result.get("categories"), list):
        valid_categories = []
        flattened = []
        for cat in result["categories"]:
            if isinstance(cat, dict) and isinstance(cat.get("scenarios"), list) and len(cat.get("scenarios")) > 0:
                scenarios = []
                for scenario in cat.get("scenarios"):
                    if isinstance(scenario, dict):
                        tags = _normalize_training_tags(
                            scenario.get("tags"),
                            fallback_text=f"{scenario.get('title', '')} {scenario.get('description', '')}"
                        )
                        normalized_scenario = {
                            **scenario,
                            "tags": tags,
                        }
                        scenarios.append(normalized_scenario)
                        if len(flattened) < requested_count:
                            flattened.append(normalized_scenario)
                valid_categories.append({
                    **cat,
                    "scenarios": scenarios,
                })
        if valid_categories:
            return {"categories": valid_categories, "scenarios": flattened[:requested_count]}

    fallback = [
        {"id": "crisis_01", "title": "Incident critique client", "description": "Un incident impacte un client stratégique à J-2 d'un comité de pilotage.", "tags": ["gestion_de_crise", "leadership"]},
        {"id": "crisis_02", "title": "Conflit priorité business", "description": "Le commercial demande une livraison risquée qui met en tension l'équipe opérationnelle.", "tags": ["management", "communication"]},
        {"id": "crisis_03", "title": "Priorisation en contexte de tension", "description": "Deux équipes exigent des réponses rapides avec des impacts opposés.", "tags": ["management", "negotiation"]},
        {"id": "crisis_04", "title": "Retour d'expérience après un échec", "description": "Une décision importante a été mal portée et vous devez reprendre la situation.", "tags": ["leadership", "communication"]},
        {"id": "crisis_05", "title": "Décision impopulaire mais nécessaire", "description": "Vous devez défendre une décision qui bouscule une partie de l'organisation.", "tags": ["leadership", "communication"]},
    ]
    return {
        "categories": [
            {
                "category": "Gestion de crise",
                "icon": "AlertTriangle",
                "scenarios": fallback[:requested_count]
            }
        ],
        "scenarios": fallback[:requested_count]
    }

async def generate_flaw_coaching(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("flaw_coach.md")
    flaws = candidate_data.get("flaws") or []
    if isinstance(flaws, str):
        flaws = [f.strip() for f in flaws.split(",") if f.strip()]
    payload = {
        "target_job": candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "",
        "flaws": flaws
    }
    final_prompt = f"{prompt_template}\n\nCONTEXT:\n{json.dumps(payload, ensure_ascii=False, indent=2, default=str)}\n\nOUTPUT LANGUAGE: {target_lang}"
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are a career interview coach. Output STRICT JSON only. Language: {target_lang}."
    )

    if isinstance(result, dict) and isinstance(result.get("coaching"), list):
        clean = [item for item in result["coaching"] if isinstance(item, dict)]
        if clean:
            return {"coaching": clean}

    fallback_flaws = flaws if flaws else ["Perfectionnisme"]
    return {
        "coaching": [
            {
                "flaw": flaw,
                "impact_level": "P2 (Vigilance)",
                "impact_justification": "Ce point doit être cadré pour démontrer une gestion mature en contexte professionnel.",
                "short_answer": "J'ai identifié ce point et j'ai mis en place des mécanismes concrets pour le canaliser efficacement.",
                "long_answer": "Ce trait m'a déjà exposé à des situations exigeantes, ce qui m'a poussé à structurer ma méthode. Aujourd'hui, je fixe des critères de décision clairs, je priorise mieux, et je communique plus tôt avec les parties prenantes. Cela transforme ce risque en discipline d'exécution.",
                "to_avoid": "Éviter de nier le défaut ou de blâmer l'environnement.",
                "coach_advice": "Ancrez votre réponse avec un exemple concret et un résultat observable."
            } for flaw in fallback_flaws
        ]
    }

async def generate_recruiter_view(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("recruiter_view.md")
    safe_data = _sanitize_data_for_recruiter_view(candidate_data)
    final_prompt = f"{prompt_template}\n\nCANDIDAT:\n{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}\n\nOUTPUT LANGUAGE: {target_lang}"
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are an experienced recruiter. Output STRICT JSON only. Language: {target_lang}."
    )

    persona = result.get("recruiter_persona") if isinstance(result, dict) else None
    if isinstance(persona, dict):
        if isinstance(persona.get("red_flags"), list) and isinstance(persona.get("reassurance_points"), list):
            return result

    target_job = candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "ce poste"
    return {
        "recruiter_persona": {
            "first_impression": f"Profil crédible pour {target_job}, mais la preuve d'impact chiffré doit être renforcée.",
            "red_flags": [
                "🚩 Impacts business pas assez quantifiés. 🛡️ Parade : préparer 3 résultats mesurables avant l'entretien.",
                "🚩 Positionnement parfois trop généraliste. 🛡️ Parade : relier chaque expérience à un enjeu concret du poste."
            ],
            "reassurance_points": [
                "Expérience cohérente avec le poste visé",
                "Capacité de communication et de coordination"
            ],
            "interview_probability": 68,
            "verdict": "Garder sous le coude",
            "brutal_truth": "Le niveau est bon, mais il faut transformer le discours en preuves chiffrées orientées résultats."
        }
    }

async def generate_reality_check(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("career_reality_check.md")
    safe_data = _sanitize_data_for_ai(candidate_data, strict=True)
    final_prompt = f"{prompt_template}\n\nCANDIDAT:\n{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}\n\nOUTPUT LANGUAGE: {target_lang}"
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are a personal branding expert. Output STRICT JSON only. Language: {target_lang}."
    )

    rc = result.get("reality_check") if isinstance(result, dict) else None
    if isinstance(rc, dict):
        ok = (
            isinstance(rc.get("archetype"), str)
            and isinstance(rc.get("tagline"), str)
            and isinstance(rc.get("top_3_skills"), list)
            and isinstance(rc.get("linkedin_post"), str)
        )
        if ok:
            return result

    target_job = candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "Professionnel"
    skills = safe_data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    if not isinstance(skills, list):
        skills = []
    top3 = (skills[:3] if skills else ["Leadership", "Communication", "Pilotage"])[:3]
    return {
        "reality_check": {
            "archetype": "The Strategist",
            "tagline": f"Un profil orienté impact pour {target_job}, capable d'aligner vision et exécution.",
            "market_position": "Top 20%",
            "score": 82,
            "top_3_skills": top3,
            "linkedin_post": "Je viens d'analyser mon profil avec un outil IA carrière.\\n\\n🎯 Archétype : The Strategist\\n📈 Score employabilité : 82/100\\n🚀 Position : Top 20%\\n\\nProchaine étape : renforcer encore les preuves d'impact business en entretien."
        }
    }

async def generate_action_plan(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("action_plan.md")
    safe_data = _sanitize_data_for_ai(candidate_data, strict=True)
    final_prompt = f"{prompt_template}\n\nPROFIL:\n{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}\n\nOUTPUT LANGUAGE: {target_lang}"
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are a pragmatic career coach. Output STRICT JSON only. Language: {target_lang}."
    )

    if isinstance(result, dict):
        valid = (
            isinstance(result.get("action_plan"), list)
            and isinstance(result.get("training_plan"), list)
            and isinstance(result.get("strategy_advice"), str)
        )
        if valid:
            return result

    target_job = candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "le poste visé"
    return {
        "action_plan": [
            {"task": "Préparer 3 preuves d'impact chiffrées", "advice": "Pour chaque mission clé, notez Situation, Action, Résultat avec un KPI avant/après.", "estimated_duration": "15 min"},
            {"task": "Aligner votre pitch au poste", "advice": f"Reliez explicitement vos expériences aux enjeux concrets de {target_job}.", "estimated_duration": "15 min"},
            {"task": "Préparer une parade aux objections", "advice": "Identifiez 2 objections probables du recruteur et formulez une réponse courte et factuelle.", "estimated_duration": "15 min"}
        ],
        "training_plan": [
            {"day": "Aujourd'hui", "stage": "current", "module": "Pitch oral 3 minutes", "duration_minutes": 20, "focus": "Répéter à voix haute avec chronomètre et transitions claires."},
            {"day": "J-1", "stage": "current", "module": "Simulation questions pièges", "duration_minutes": 20, "focus": "S'entraîner sur objections, leadership, résultats chiffrés."},
            {"day": "À venir", "stage": "upcoming", "module": "Anticipation : Négociation salariale", "duration_minutes": 15, "focus": "Préparer une fourchette cible et les arguments de valeur."}
        ],
        "strategy_advice": "Restez concret, orienté impact, et structurez vos réponses autour de preuves observables plutôt que de généralités."
    }

async def generate_gap_analysis(candidate_data: dict) -> dict:
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("gap_analysis.md")
    safe_data = _sanitize_data_for_ai(candidate_data, strict=True)
    target_job = candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "Poste visé"
    job_description = candidate_data.get("job_description") or ""

    final_prompt = f"""
{prompt_template}

POSTE VISÉ:
{target_job}

DESCRIPTION DU POSTE:
{job_description if job_description else "(Non fournie - utilise les standards marché pour ce poste)"}

PROFIL CANDIDAT:
{json.dumps(safe_data, ensure_ascii=False, indent=2, default=str)}

OUTPUT LANGUAGE: {target_lang}
"""
    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are a Career Coach. Output STRICT JSON only. Language: {target_lang}."
    )

    if isinstance(result, dict):
        has_shape = (
            isinstance(result.get("key_needs_from_job"), list)
            and isinstance(result.get("matching_skills"), list)
            and isinstance(result.get("missing_gaps"), list)
            and isinstance(result.get("recommended_adjustments"), list)
        )
        if has_shape:
            return result

    skills = safe_data.get("skills", [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]
    if not isinstance(skills, list):
        skills = []
    matching = skills[:3] if skills else ["Communication", "Gestion de projet"]
    return {
        "match_score": 62,
        "key_needs_from_job": [
            f"Capacité à délivrer des résultats mesurables sur {target_job}",
            "Priorisation et pilotage des parties prenantes",
            "Communication claire en contexte de pression"
        ],
        "matching_skills": matching,
        "missing_gaps": [
            {"skill": "Preuves chiffrées d'impact business", "estimated_time": "1 semaine"},
            {"skill": "Narratif structuré orienté poste cible", "estimated_time": "2 jours"}
        ],
        "recommended_adjustments": [
            {"action": "Préparer 3 cas STAR avec KPI avant/après", "estimated_time": "2 heures"},
            {"action": "Aligner le pitch sur les enjeux du poste et du secteur", "estimated_time": "1 heure"}
        ]
    }

async def generate_pitch(candidate_data: dict, quality: str = "smart") -> dict:
    """
    Génère une matrice de pitchs via le prompt stratégique v4.
    Cette fonction est aussi appelée par services.tasks._run_pitch_logic.
    """
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("strategic_pitch_v4.md")
    if not prompt_template:
        raise ValueError("Prompt introuvable: strategic_pitch_v4.md")

    profile_context = _sanitize_data_for_ai(candidate_data, strict=True)
    normalized_context = {
        "target": {
            "job": candidate_data.get("target_job") or candidate_data.get("target_role_primary") or "",
            "company": candidate_data.get("target_company") or "",
            "job_description": candidate_data.get("job_description") or ""
        },
        "profile": {
            "first_name": candidate_data.get("first_name") or (candidate_data.get("personal_info") or {}).get("first_name") or "",
            "last_name": candidate_data.get("last_name") or (candidate_data.get("personal_info") or {}).get("last_name") or "",
            "bio": candidate_data.get("bio") or "",
            "experiences": profile_context.get("experiences", []),
            "educations": profile_context.get("educations", []),
            "skills": profile_context.get("skills", []),
            "strengths": profile_context.get("strengths", []),
            "flaws": profile_context.get("flaws", [])
        },
        "clarifications": profile_context.get("clarifications", []),
        "research": candidate_data.get("research_data") or candidate_data.get("researchResult") or {}
    }

    final_prompt = (
        prompt_template
        .replace("{{CANDIDATE_DATA_JSON}}", json.dumps(normalized_context, ensure_ascii=False, indent=2, default=str))
        .replace("{{TARGET_LANGUAGE}}", target_lang)
    )
    print("[PITCH] Using prompt strategic_pitch_v4.md", flush=True)

    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction=f"You are an executive interview coach. Output STRICT JSON only. Language: {target_lang}."
    )

    return _ensure_pitch_matrix_shape(result, candidate_data)

async def generate_job_decoder(candidate_data: dict) -> dict:
    """
    Génère le décodeur d'annonce depuis le prompt job_decoder.md.
    Utilisé par le flux /cv/start-analysis (mode local task store).
    """
    target_lang = normalize_language(candidate_data.get("target_language", "French"))
    prompt_template = load_prompt("job_decoder.md")

    final_prompt = f"""
{prompt_template}

OFFRE D'EMPLOI :
Titre : {candidate_data.get('target_job', 'Non spécifié')}
Description : {candidate_data.get('job_description', 'Non fournie')}
Entreprise : {candidate_data.get('target_company', 'Non spécifiée')}

OUTPUT LANGUAGE: {target_lang}
"""

    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction="You are a Job Market Analyst. Output STRICT JSON."
    )

    if isinstance(result, dict) and "error" not in result:
        return result

    fallback_company = candidate_data.get('target_company') or "l'entreprise cible"
    return {
        "decoded": f"Points clés attendus par {fallback_company}: leadership, rigueur."
    }

@router.post("/start-analysis")
async def start_analysis(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Démarre une analyse complète en mode DB-only.
    Les tâches sont persistées dans la table `tasks` et exécutées en arrière-plan.
    """
    try:
        from .tasks import (
            process_pitch_in_background,
            process_questions_in_background,
            process_gap_analysis_in_background,
            process_job_decoder_in_background,
            process_recruiter_view_in_background,
            process_reality_check_in_background,
            process_flaw_coaching_in_background,
            process_action_plan_in_background,
            process_custom_scenarios_in_background,
        )

        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Utilisateur non authentifié")

        # Aligner sur /research/start, déjà validé en staging.
        now = datetime.now()
        application_id = payload.get("application_id") or str(uuid.uuid4())

        target_company = payload.get("target_company") or "Général"
        target_job = payload.get("target_job") or payload.get("target_role_primary") or "Poste non spécifié"

        # Convert answered clarifications into explicit engine-ready signals
        raw_clarifications = payload.get("clarifications") if isinstance(payload.get("clarifications"), list) else []
        clarification_insights = []
        for c in raw_clarifications:
            if not isinstance(c, dict):
                continue
            question = str(c.get("question") or "").strip()
            answer = str(c.get("answer") or "").strip()
            if answer:
                clarification_insights.append({
                    "question": question,
                    "answer": answer
                })

        candidate_data = {
            **payload,
            "user_id": user_id,
            "application_id": application_id,
            "clarification_insights": clarification_insights[:5],
        }

        task_workers = {
            "pitch": process_pitch_in_background,
            "questions": process_questions_in_background,
            "gap_analysis": process_gap_analysis_in_background,
            "recruiter_view": process_recruiter_view_in_background,
            "reality_check": process_reality_check_in_background,
            "flaw_coaching": process_flaw_coaching_in_background,
            "action_plan": process_action_plan_in_background,
            "custom_scenarios": process_custom_scenarios_in_background,
        }

        # Job decoder seulement si annonce disponible
        has_job_description = bool(str(payload.get("job_description") or "").strip())
        if has_job_description:
            task_workers["job_decoder"] = process_job_decoder_in_background

        tasks = {task_key: str(uuid.uuid4()) for task_key in task_workers.keys()}

        async with db.get_connection() as conn:
            await db.execute(
                conn,
                """
                INSERT INTO job_applications (id, user_id, target_company, target_job, created_at)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING
                """,
                (application_id, user_id, target_company, target_job, now),
            )

            for task_key, task_id in tasks.items():
                await db.execute(
                    conn,
                    "INSERT INTO tasks (id, user_id, status, task_type, result, created_at, application_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        task_id,
                        user_id,
                        "PENDING",
                        task_key,
                        None,
                        now,
                        application_id,
                        json.dumps({"task_name": task_key, "candidate_data": candidate_data}, default=str),
                    ),
                )

        for task_key, worker in task_workers.items():
            background_tasks.add_task(worker, tasks[task_key], candidate_data)

        return {
            "message": "Full analysis started (db-only)",
            "application_id": application_id,
            "tasks": tasks,
        }
    except Exception as e:
        print(f"[START_ANALYSIS][ERROR] {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to start analysis: {e}")


@router.get('/tasks/status/{task_id}')
async def tasks_status(task_id: str):
    """Alias DB-only pour le polling de statut des tâches."""
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT status, result, error_message FROM tasks WHERE id = ?", (task_id,))
        task = await cursor.fetchone()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    status = str(task.get("status", "PENDING")).upper()
    result_raw = task.get("result")
    error_message = task.get("error_message")

    result_data = None
    if isinstance(result_raw, str):
        try:
            result_data = json.loads(result_raw)
        except json.JSONDecodeError:
            result_data = result_raw
    else:
        result_data = result_raw

    if status in {"SUCCESS", "COMPLETED"}:
        return {"status": "SUCCESS", "result": result_data}

    if status == "FAILED":
        if not error_message and isinstance(result_data, dict):
            error_message = result_data.get("error")
        return {"status": "FAILED", "error": error_message, "result": result_data}

    return {"status": status, "result": result_data, "error": error_message}


@router.get("/analysis-status/{task_id}")
async def get_analysis_status(task_id: str):
    """
    Backwards-compatible alias for analysis status.
    """
    return await tasks_status(task_id)
@router.post("/dashboard/summary")
async def get_dashboard_summary(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Génère une synthèse cockpit personnalisée à partir de :
    - gap_analysis (prioritaire)
    - research_data (si disponible)
    avec fallback déterministe si la réponse IA est incomplète.
    """
    target_lang = normalize_language(payload.get("target_language", "French"))
    target_job = payload.get("target_job") or payload.get("target_role_primary") or "poste visé"
    target_company = payload.get("target_company") or "entreprise cible"

    research_data = payload.get("research_data") if isinstance(payload.get("research_data"), dict) else {}
    gap_analysis = payload.get("gap_analysis") if isinstance(payload.get("gap_analysis"), dict) else {}

    if not gap_analysis:
        try:
            gap_analysis = await asyncio.wait_for(
                generate_gap_analysis(payload),
                timeout=DASHBOARD_SUMMARY_GAP_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            print(
                f"[DASHBOARD SUMMARY] gap_analysis timed out after {DASHBOARD_SUMMARY_GAP_TIMEOUT_SECONDS}s; using deterministic fallback.",
                flush=True,
            )
            gap_analysis = {}
        except Exception as e:
            print(f"[DASHBOARD SUMMARY] gap_analysis fallback error: {e}", flush=True)
            gap_analysis = {}

    strengths_fallback = []
    if isinstance(gap_analysis.get("matching_skills"), list):
        strengths_fallback = [str(s) for s in gap_analysis.get("matching_skills", []) if str(s).strip()][:5]

    gaps_fallback = []
    missing_gaps = gap_analysis.get("missing_gaps") if isinstance(gap_analysis.get("missing_gaps"), list) else []
    adjustments = gap_analysis.get("recommended_adjustments") if isinstance(gap_analysis.get("recommended_adjustments"), list) else []
    for i, gap in enumerate(missing_gaps[:5]):
        skill = gap.get("skill") if isinstance(gap, dict) else str(gap)
        action = ""
        if i < len(adjustments) and isinstance(adjustments[i], dict):
            action = str(adjustments[i].get("action") or "").strip()
        if not action:
            action = "Préparer un exemple STAR ciblé pour compenser ce gap."
        gaps_fallback.append({
            "skill": skill or "Compétence à renforcer",
            "impact": "High" if i == 0 else ("Medium" if i < 3 else "Low"),
            "action": action
        })

    match_score_fallback = int(gap_analysis.get("match_score") or gap_analysis.get("matchScore") or 0)
    if match_score_fallback < 0:
        match_score_fallback = 0
    if match_score_fallback > 100:
        match_score_fallback = 100

    research_summary = ""
    if isinstance(research_data.get("executive_summary"), str):
        research_summary = research_data.get("executive_summary", "").strip()
    elif isinstance(research_data.get("summary"), str):
        research_summary = research_data.get("summary", "").strip()

    prompt_template = load_prompt("cockpit_summary.md")
    safe_profile = _sanitize_data_for_ai(payload, strict=True)
    prompt = f"""
{prompt_template}

POSTE CIBLE: {target_job}
ENTREPRISE CIBLE: {target_company}
OUTPUT LANGUAGE: {target_lang}

GAP_ANALYSIS_JSON:
{json.dumps(gap_analysis, ensure_ascii=False, indent=2, default=str)}

RESEARCH_DATA_JSON:
{json.dumps(research_data, ensure_ascii=False, indent=2, default=str)}

PROFIL_CANDIDAT_JSON:
{json.dumps(safe_profile, ensure_ascii=False, indent=2, default=str)}
"""

    try:
        ai_result = await asyncio.wait_for(
            ai_service.generate_valid_json(
                prompt,
                provider="openai",
                system_instruction=f"You are an executive interview strategist. Output STRICT JSON only. Language: {target_lang}."
            ),
            timeout=DASHBOARD_SUMMARY_AI_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        print(
            f"[DASHBOARD SUMMARY] summary AI timed out after {DASHBOARD_SUMMARY_AI_TIMEOUT_SECONDS}s; using fallback summary.",
            flush=True,
        )
        ai_result = {}
    except Exception as e:
        print(f"[DASHBOARD SUMMARY] AI call failed: {e}", flush=True)
        ai_result = {}

    if not isinstance(ai_result, dict):
        ai_result = {}

    ai_strengths = ai_result.get("strengths") if isinstance(ai_result.get("strengths"), list) else []
    ai_gaps = ai_result.get("gapsMatrix") if isinstance(ai_result.get("gapsMatrix"), list) else []
    ai_strategy = ai_result.get("recommendedStrategy") if isinstance(ai_result.get("recommendedStrategy"), str) else ""
    ai_summary = ai_result.get("summary") if isinstance(ai_result.get("summary"), str) else ""

    normalized_gaps = []
    for idx, item in enumerate((ai_gaps or gaps_fallback)[:5]):
        if isinstance(item, dict):
            normalized_gaps.append({
                "skill": str(item.get("skill") or item.get("name") or "Compétence à renforcer"),
                "impact": str(item.get("impact") or ("High" if idx == 0 else ("Medium" if idx < 3 else "Low"))),
                "action": str(item.get("action") or "Définir un plan d'entraînement ciblé.")
            })
        else:
            normalized_gaps.append({
                "skill": str(item),
                "impact": "Medium",
                "action": "Définir un plan d'entraînement ciblé."
            })

    summary_text = ai_summary.strip() if ai_summary else ""
    if not summary_text:
        summary_text = f"Votre profil présente un score d'adéquation estimé à {match_score_fallback}/100 pour le poste de {target_job}. " \
                       f"Concentrez la préparation sur les écarts prioritaires et les preuves d'impact chiffrées."
        if research_summary:
            summary_text += f" Contexte marché/entreprise : {research_summary[:220]}"

    strategy_text = ai_strategy.strip() if ai_strategy else ""
    if not strategy_text:
        strategy_text = (
            "Reliez chaque réponse à un impact business mesurable (KPI, coût, délai, qualité), "
            "puis adaptez vos exemples aux enjeux concrets de l'entreprise ciblée."
        )

    match_score = ai_result.get("matchScore", ai_result.get("match_score", match_score_fallback))
    try:
        match_score = int(match_score)
    except Exception:
        match_score = match_score_fallback
    match_score = min(100, max(0, match_score))

    return {
        "matchScore": match_score,
        "summary": summary_text,
        "strengths": [str(s) for s in (ai_strengths or strengths_fallback)[:6]],
        "gapsMatrix": normalized_gaps,
        "recommendedStrategy": strategy_text
    }