"""
Cache partagé cross-utilisateurs pour BeyondTheCV.

Niveaux implémentés :
  L1 – company_analysis_cache  : analyse entreprise, TTL 30 jours
  L2 – job_offer_cache         : analyse offre par SHA256(description), TTL 90 jours
  L3 – job_market_cache        : analyse marché par (titre, pays), TTL 30 jours
  L4 – user_profiles           : profil candidat parsé (table existante enrichie)

Économie : un même pipeline Serper + IA ne tourne qu'une seule fois
pour une entreprise ou un titre de poste donné, quel que soit l'utilisateur.
"""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from database import db

COMPANY_TTL_DAYS  = 30
MARKET_TTL_DAYS   = 30
JOB_OFFER_TTL_DAYS = 90


# ─────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────

def _key(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()

def _company_key(company: str, industry: str = "") -> str:
    return _key(f"{company.strip().lower()}|{(industry or '').strip().lower()}")

def _market_key(job_title: str, country: str = "") -> str:
    return _key(f"{job_title.strip().lower()}|{(country or '').strip().lower()}")

def _offer_key(description: str) -> str:
    return _key(description.strip())

def _parse_json(raw) -> dict | None:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return None

def _is_expired(cached_at, ttl_days: int) -> bool:
    if cached_at is None:
        return True
    if isinstance(cached_at, str):
        try:
            cached_at = datetime.fromisoformat(cached_at)
        except Exception:
            return True
    if cached_at.tzinfo is None:
        cached_at = cached_at.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - cached_at > timedelta(days=ttl_days)

async def _safe_fetchone(conn, sql: str, params: tuple):
    try:
        cursor = await db.execute(conn, sql, params)
        return await cursor.fetchone()
    except Exception as e:
        print(f"[CACHE] DB read error: {e}", flush=True)
        return None


# ─────────────────────────────────────────────
#  L1 – Cache entreprise
# ─────────────────────────────────────────────

async def get_company_cache(company: str, industry: str = "") -> dict | None:
    """Retourne l'analyse entreprise depuis le cache partagé, ou None si absente/expirée."""
    if not company or company.strip().lower() in ("", "unknown", "none", "non spécifiée"):
        return None
    cache_key = _company_key(company, industry)
    async with db.get_connection() as conn:
        row = await _safe_fetchone(
            conn,
            "SELECT result, cached_at FROM company_analysis_cache WHERE cache_key = %s",
            (cache_key,)
        )
    if not row:
        return None
    cached_at = row.get("cached_at") if isinstance(row, dict) else row[1]
    if _is_expired(cached_at, COMPANY_TTL_DAYS):
        return None
    return _parse_json(row.get("result") if isinstance(row, dict) else row[0])


async def set_company_cache(company: str, industry: str, result: dict) -> None:
    """Stocke l'analyse entreprise dans le cache partagé."""
    if not company or not result:
        return
    cache_key = _company_key(company, industry)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO company_analysis_cache (cache_key, company_name, industry, result, cached_at, hit_count)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, 0)
                ON CONFLICT (cache_key) DO UPDATE SET
                    result    = EXCLUDED.result,
                    cached_at = CURRENT_TIMESTAMP
            """, (cache_key, company.strip(), (industry or "").strip(), json.dumps(result, default=str)))
        print(f"[CACHE L1] ✅ Entreprise stockée : {company}", flush=True)
    except Exception as e:
        print(f"[CACHE L1] Erreur d'écriture : {e}", flush=True)


async def touch_company_cache(company: str, industry: str = "") -> None:
    """Incrémente le compteur de hits (stats)."""
    if not company:
        return
    cache_key = _company_key(company, industry)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn,
                "UPDATE company_analysis_cache SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP WHERE cache_key = %s",
                (cache_key,)
            )
    except Exception:
        pass


# ─────────────────────────────────────────────
#  L2 – Cache offre d'emploi (SHA256 description)
# ─────────────────────────────────────────────

async def get_job_offer_cache(description: str) -> dict | None:
    """Retourne l'analyse de l'offre depuis le cache, ou None si absente/expirée."""
    if not description or len(description.strip()) < 50:
        return None
    cache_key = _offer_key(description)
    async with db.get_connection() as conn:
        row = await _safe_fetchone(
            conn,
            "SELECT result, cached_at FROM job_offer_cache WHERE cache_key = %s",
            (cache_key,)
        )
    if not row:
        return None
    cached_at = row.get("cached_at") if isinstance(row, dict) else row[1]
    if _is_expired(cached_at, JOB_OFFER_TTL_DAYS):
        return None
    return _parse_json(row.get("result") if isinstance(row, dict) else row[0])


async def set_job_offer_cache(description: str, result: dict) -> None:
    """Stocke l'analyse de l'offre dans le cache partagé."""
    if not description or len(description.strip()) < 50 or not result:
        return
    cache_key = _offer_key(description)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO job_offer_cache (cache_key, result, cached_at, hit_count)
                VALUES (%s, %s, CURRENT_TIMESTAMP, 0)
                ON CONFLICT (cache_key) DO UPDATE SET
                    result    = EXCLUDED.result,
                    cached_at = CURRENT_TIMESTAMP
            """, (cache_key, json.dumps(result, default=str)))
        print(f"[CACHE L2] ✅ Offre stockée (key: {cache_key[:8]}…)", flush=True)
    except Exception as e:
        print(f"[CACHE L2] Erreur d'écriture : {e}", flush=True)


async def touch_job_offer_cache(description: str) -> None:
    if not description:
        return
    cache_key = _offer_key(description)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn,
                "UPDATE job_offer_cache SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP WHERE cache_key = %s",
                (cache_key,)
            )
    except Exception:
        pass


# ─────────────────────────────────────────────
#  L3 – Cache marché par titre de poste
# ─────────────────────────────────────────────

async def get_market_cache(job_title: str, country: str = "") -> dict | None:
    """Retourne le market_report depuis le cache, ou None si absent/expiré."""
    if not job_title or len(job_title.strip()) < 3:
        return None
    cache_key = _market_key(job_title, country)
    async with db.get_connection() as conn:
        row = await _safe_fetchone(
            conn,
            "SELECT result, cached_at FROM job_market_cache WHERE cache_key = %s",
            (cache_key,)
        )
    if not row:
        return None
    cached_at = row.get("cached_at") if isinstance(row, dict) else row[1]
    if _is_expired(cached_at, MARKET_TTL_DAYS):
        return None
    return _parse_json(row.get("result") if isinstance(row, dict) else row[0])


async def set_market_cache(job_title: str, country: str, market_report: dict) -> None:
    """Stocke le market_report dans le cache partagé."""
    if not job_title or not market_report:
        return
    cache_key = _market_key(job_title, country)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO job_market_cache (cache_key, job_title, country, result, cached_at, hit_count)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, 0)
                ON CONFLICT (cache_key) DO UPDATE SET
                    result    = EXCLUDED.result,
                    cached_at = CURRENT_TIMESTAMP
            """, (cache_key, job_title.strip(), (country or "").strip(), json.dumps(market_report, default=str)))
        print(f"[CACHE L3] ✅ Marché stocké : {job_title} / {country}", flush=True)
    except Exception as e:
        print(f"[CACHE L3] Erreur d'écriture : {e}", flush=True)


async def touch_market_cache(job_title: str, country: str = "") -> None:
    if not job_title:
        return
    cache_key = _market_key(job_title, country)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn,
                "UPDATE job_market_cache SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP WHERE cache_key = %s",
                (cache_key,)
            )
    except Exception:
        pass


# ─────────────────────────────────────────────
#  L4 – Cache profil utilisateur (CV parsé)
# ─────────────────────────────────────────────

def _cv_signature(profile_data: dict) -> str:
    """Signature MD5 du profil pour détecter les modifications."""
    try:
        key_fields = {
            "experiences": profile_data.get("experiences", []),
            "educations":  profile_data.get("educations", []),
            "skills":      profile_data.get("skills", ""),
        }
        return hashlib.md5(json.dumps(key_fields, sort_keys=True, default=str).encode()).hexdigest()
    except Exception:
        return ""


async def get_user_profile_cache(user_id: str, current_signature: str = "") -> dict | None:
    """Retourne le profil parsé depuis le cache, ou None si absent/signature différente."""
    if not user_id:
        return None
    try:
        async with db.get_connection() as conn:
            row = await _safe_fetchone(
                conn,
                "SELECT profile_data, cv_signature FROM user_profiles WHERE user_id = %s",
                (user_id,)
            )
    except Exception:
        return None
    if not row:
        return None
    stored_sig = row.get("cv_signature") if isinstance(row, dict) else (row[1] if len(row) > 1 else "")
    if current_signature and stored_sig and stored_sig != current_signature:
        return None  # Profil modifié, le cache est périmé
    return _parse_json(row.get("profile_data") if isinstance(row, dict) else row[0])


async def set_user_profile_cache(user_id: str, profile_data: dict) -> None:
    """Stocke le profil parsé dans user_profiles."""
    if not user_id or not profile_data:
        return
    sig = _cv_signature(profile_data)
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, """
                INSERT INTO user_profiles (user_id, profile_data, cv_signature, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    profile_data  = EXCLUDED.profile_data,
                    cv_signature  = EXCLUDED.cv_signature,
                    updated_at    = CURRENT_TIMESTAMP
            """, (user_id, json.dumps(profile_data, default=str), sig))
        print(f"[CACHE L4] ✅ Profil stocké pour user {user_id}", flush=True)
    except Exception as e:
        print(f"[CACHE L4] Erreur d'écriture : {e}", flush=True)


# ─────────────────────────────────────────────
#  Stats admin
# ─────────────────────────────────────────────

async def get_cache_stats() -> dict:
    """Statistiques des caches pour le dashboard admin."""
    stats: dict = {
        "company_analysis": {"entries": 0, "total_hits": 0, "estimated_savings_eur": 0.0},
        "job_offer":        {"entries": 0, "total_hits": 0, "estimated_savings_eur": 0.0},
        "job_market":       {"entries": 0, "total_hits": 0, "estimated_savings_eur": 0.0},
        "user_profiles":    {"entries": 0},
    }
    # Coûts IA estimés par pipeline (entreprise ≈ 0.25 €, offre ≈ 0.10 €, marché ≈ 0.08 €)
    cost_map = {"company_analysis": 0.25, "job_offer": 0.10, "job_market": 0.08}
    try:
        async with db.get_connection() as conn:
            for table, key in [
                ("company_analysis_cache", "company_analysis"),
                ("job_offer_cache",        "job_offer"),
                ("job_market_cache",       "job_market"),
            ]:
                cursor = await db.execute(conn,
                    f"SELECT COUNT(*), COALESCE(SUM(hit_count), 0) FROM {table}"
                )
                row = await cursor.fetchone()
                if row:
                    entries   = int(row[0])
                    hits      = int(row[1])
                    stats[key]["entries"]             = entries
                    stats[key]["total_hits"]          = hits
                    stats[key]["estimated_savings_eur"] = round(hits * cost_map[key], 2)

            cursor = await db.execute(conn, "SELECT COUNT(*) FROM user_profiles")
            row = await cursor.fetchone()
            if row:
                stats["user_profiles"]["entries"] = int(row[0])

    except Exception as e:
        print(f"[CACHE] Stats error: {e}", flush=True)
    return stats
