"""
Base de connaissance mutualisée et anonymisée des questions d'entretien réellement observées.

Séparation RGPD stricte :
- `interview_debriefs` reste la donnée privée du candidat (jamais lue en dehors du strict nécessaire).
- `interview_question_intelligence` ne contient que des questions anonymisées + métadonnées génériques
  (entreprise, secteur, métier, séniorité, étape de recrutement, thème, difficulté).

Effet réseau recherché : plus BTCV est utilisé, plus la base de questions observées devient pertinente
pour préparer les futurs candidats sur une même entreprise / un même secteur / un même type de poste.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from database import db
from .ai_generator import ai_service
from .utils import load_prompt

_SCHEMA_READY = False

VALID_THEMES = {
    "leadership", "management", "crise", "technique", "motivation", "salaire",
    "culture", "vision", "collaboration", "résilience", "adaptabilité",
}


async def _ensure_schema(conn) -> None:
    """Crée la table dédiée si elle n'existe pas encore (idempotent)."""
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return
    await db.execute(conn, """
        CREATE TABLE IF NOT EXISTS interview_question_intelligence (
            id TEXT PRIMARY KEY,
            normalized_question TEXT NOT NULL,
            raw_question TEXT,
            company_name TEXT,
            sector TEXT,
            job_family TEXT,
            seniority TEXT,
            interview_stage TEXT,
            themes JSONB DEFAULT '[]'::jsonb,
            difficulty INTEGER,
            candidate_struggled BOOLEAN DEFAULT FALSE,
            occurrence_count INTEGER DEFAULT 1,
            first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            source_debrief_id TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await db.execute(conn, "CREATE INDEX IF NOT EXISTS idx_qint_company ON interview_question_intelligence(company_name)")
    await db.execute(conn, "CREATE INDEX IF NOT EXISTS idx_qint_sector ON interview_question_intelligence(sector)")
    await db.execute(conn, "CREATE INDEX IF NOT EXISTS idx_qint_job_family ON interview_question_intelligence(job_family)")
    _SCHEMA_READY = True


async def _extract_questions_via_ai(debrief_dict: dict, candidate_context: dict) -> list:
    """Appelle l'IA pour extraire une liste de questions anonymisées + métadonnées à partir d'un débrief."""
    prompt_template = load_prompt("question_intelligence_extractor.md")
    if not prompt_template:
        return []

    # [RGPD] On ne transmet à l'IA que les champs strictement nécessaires : jamais le nom
    # de l'interlocuteur, ni tout autre champ pouvant contenir une identité personnelle.
    safe_debrief = {
        "company_name": debrief_dict.get("company_name"),
        "job_title": debrief_dict.get("job_title"),
        "interlocutor_type": debrief_dict.get("interlocutor_type"),
        "questions_asked": debrief_dict.get("questions_asked"),
        "difficult_questions": debrief_dict.get("difficult_questions"),
    }

    final_prompt = (
        prompt_template
        .replace("{{DEBRIEF_JSON}}", json.dumps(safe_debrief, ensure_ascii=False, indent=2, default=str))
        .replace("{{CANDIDATE_CONTEXT_JSON}}", json.dumps(candidate_context, ensure_ascii=False, indent=2, default=str))
    )

    result = await ai_service.generate_valid_json(
        final_prompt,
        provider="openai",
        system_instruction="You are a strict anonymized data extraction engine. Output STRICT JSON only.",
    )

    if not isinstance(result, dict) or "error" in result:
        print(f"[QUESTION-INTEL] Extraction IA échouée ou ignorée: {result}", flush=True)
        return []

    questions = result.get("questions")
    return questions if isinstance(questions, list) else []


def _clean_str(value) -> Optional[str]:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


async def _upsert_question(conn, question: dict, company_name: Optional[str], interview_stage: Optional[str], source_debrief_id: str) -> None:
    normalized = _clean_str(question.get("normalized_question"))
    if not normalized:
        return
    raw = _clean_str(question.get("raw_question")) or normalized
    sector = _clean_str(question.get("sector"))
    job_family = _clean_str(question.get("job_family"))
    seniority = _clean_str(question.get("seniority"))
    themes_raw = question.get("themes")
    themes = [t for t in themes_raw if isinstance(t, str) and t.strip()] if isinstance(themes_raw, list) else []
    try:
        difficulty = int(question.get("difficulty"))
        difficulty = max(1, min(5, difficulty))
    except (TypeError, ValueError):
        difficulty = None
    struggled = bool(question.get("candidate_struggled"))
    now = datetime.now()

    cursor = await db.execute(
        conn,
        """
        SELECT id, occurrence_count, difficulty, candidate_struggled, themes, sector, job_family, seniority
        FROM interview_question_intelligence
        WHERE lower(trim(normalized_question)) = lower(trim(?))
          AND lower(coalesce(company_name, '')) = lower(coalesce(?, ''))
        LIMIT 1
        """,
        (normalized, company_name or ""),
    )
    existing = await cursor.fetchone()

    if existing:
        existing = dict(existing)
        new_count = int(existing.get("occurrence_count") or 1) + 1

        prev_difficulty = existing.get("difficulty")
        if difficulty is not None and prev_difficulty is not None:
            merged_difficulty = round(((prev_difficulty * (new_count - 1)) + difficulty) / new_count)
        else:
            merged_difficulty = difficulty if difficulty is not None else prev_difficulty

        prev_themes = existing.get("themes")
        if isinstance(prev_themes, str):
            try:
                prev_themes = json.loads(prev_themes)
            except Exception:
                prev_themes = []
        merged_themes = list(dict.fromkeys([*(prev_themes or []), *themes]))

        await db.execute(
            conn,
            """
            UPDATE interview_question_intelligence
            SET occurrence_count = ?, difficulty = ?, themes = ?::jsonb,
                candidate_struggled = ?, last_seen_at = ?, updated_at = ?,
                sector = COALESCE(sector, ?), job_family = COALESCE(job_family, ?), seniority = COALESCE(seniority, ?)
            WHERE id = ?
            """,
            (
                new_count, merged_difficulty, json.dumps(merged_themes, ensure_ascii=False),
                bool(existing.get("candidate_struggled")) or struggled, now, now,
                sector, job_family, seniority, existing["id"],
            ),
        )
    else:
        await db.execute(
            conn,
            """
            INSERT INTO interview_question_intelligence (
                id, normalized_question, raw_question, company_name, sector, job_family,
                seniority, interview_stage, themes, difficulty, candidate_struggled,
                occurrence_count, first_seen_at, last_seen_at, source_debrief_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, 1, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()), normalized, raw, company_name, sector, job_family, seniority,
                interview_stage, json.dumps(themes, ensure_ascii=False), difficulty, struggled,
                now, now, source_debrief_id, now, now,
            ),
        )


async def process_debrief_for_intelligence(debrief_id: str, user_id: str) -> None:
    """
    Tâche de fond déclenchée après la création/mise à jour d'un débrief.
    Extrait les questions réellement posées, les anonymise, puis les fusionne dans la base mutualisée.
    Ne coûte rien de plus qu'un enrichissement du JSON déjà généré : n'échoue jamais bruyamment
    (le débrief privé du candidat reste sauvegardé même si cette étape échoue).
    """
    try:
        async with db.get_connection() as conn:
            await _ensure_schema(conn)
            cursor = await db.execute(conn, "SELECT * FROM interview_debriefs WHERE id = ? AND user_id = ?", (debrief_id, user_id))
            row = await cursor.fetchone()
            if not row:
                return
            debrief_dict = dict(row)

            candidate_context = {}
            try:
                profile_cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (user_id,))
                profile_row = await profile_cursor.fetchone()
                if profile_row:
                    profile_row = dict(profile_row)
                    profile_data = profile_row.get("profile_data")
                    if isinstance(profile_data, str):
                        profile_data = json.loads(profile_data)
                    if isinstance(profile_data, dict):
                        candidate_context = {
                            "target_job": profile_data.get("target_job"),
                            "target_industry": profile_data.get("target_industry"),
                            "seniority_level": profile_data.get("seniority_level"),
                        }
            except Exception as e:
                print(f"[QUESTION-INTEL] Impossible de charger le contexte candidat: {e}", flush=True)

        has_content = bool((debrief_dict.get("questions_asked") or "").strip() or (debrief_dict.get("difficult_questions") or "").strip())
        if not has_content:
            return

        questions = await _extract_questions_via_ai(debrief_dict, candidate_context)
        if not questions:
            return

        company_name = _clean_str(debrief_dict.get("company_name"))
        interview_stage = _clean_str(debrief_dict.get("interlocutor_type"))

        async with db.get_connection() as conn:
            await _ensure_schema(conn)
            for question in questions:
                if isinstance(question, dict):
                    await _upsert_question(conn, question, company_name, interview_stage, debrief_id)
    except Exception as e:
        # [RÉSILIENCE] Cette tâche est un enrichissement best-effort : elle ne doit jamais
        # impacter la création/mise à jour du débrief lui-même.
        print(f"[QUESTION-INTEL] Échec du traitement en arrière-plan pour le débrief {debrief_id}: {e}", flush=True)


def _match_score(row: dict, company_name, sector, job_family, seniority, interview_stage) -> int:
    score = 0
    row_company = (row.get("company_name") or "").lower()
    row_sector = (row.get("sector") or "").lower()
    row_job_family = (row.get("job_family") or "").lower()
    row_seniority = (row.get("seniority") or "").lower()

    if company_name and row_company:
        if row_company == company_name.lower():
            score += 100
        elif company_name.lower() in row_company or row_company in company_name.lower():
            score += 60
    if job_family and row_job_family and job_family.lower() in row_job_family:
        score += 40
    if sector and row_sector and sector.lower() in row_sector:
        score += 20
    if seniority and row_seniority and seniority.lower() in row_seniority:
        score += 10
    if interview_stage and row.get("interview_stage") == interview_stage:
        score += 5
    return score


def _confidence_label(score: int, occurrence_count: int) -> str:
    if score >= 100 and occurrence_count >= 2:
        return "very_likely"
    if score >= 60 or (score >= 20 and occurrence_count >= 3):
        return "likely"
    return "to_prepare"


def _rationale(confidence: str, row: dict, sector: Optional[str]) -> str:
    if confidence == "very_likely":
        return "Sujet régulièrement rencontré dans les retours d'entretien disponibles pour cette entreprise et des postes comparables."
    if confidence == "likely":
        sector_label = row.get("sector") or sector
        if sector_label:
            return f"Thème fréquent dans le secteur {sector_label} pour ce niveau de responsabilité."
        return "Thème fréquent parmi les retours d'entretien disponibles pour ce type de poste."
    return "Sujet identifié dans plusieurs retours liés à cette entreprise ou ce secteur."


async def get_observed_questions(
    company_name: Optional[str] = None,
    sector: Optional[str] = None,
    job_family: Optional[str] = None,
    seniority: Optional[str] = None,
    interview_stage: Optional[str] = None,
    limit: int = 8,
) -> list:
    """
    Retourne une liste priorisée de thèmes/questions déjà observés, avec un niveau de confiance
    volontairement prudent (very_likely / likely / to_prepare) plutôt qu'une fausse certitude.

    Priorité : même entreprise > même famille de métier > même secteur > même séniorité.
    """
    clauses, params = [], []
    if company_name:
        clauses.append("company_name ILIKE ?")
        params.append(f"%{company_name}%")
    if job_family:
        clauses.append("job_family ILIKE ?")
        params.append(f"%{job_family}%")
    if sector:
        clauses.append("sector ILIKE ?")
        params.append(f"%{sector}%")
    if seniority:
        clauses.append("seniority ILIKE ?")
        params.append(f"%{seniority}%")

    if not clauses:
        return []

    query = f"""
        SELECT normalized_question, raw_question, company_name, sector, job_family,
               seniority, interview_stage, themes, difficulty, candidate_struggled, occurrence_count
        FROM interview_question_intelligence
        WHERE {' OR '.join(clauses)}
        ORDER BY occurrence_count DESC
        LIMIT 300
    """

    async with db.get_connection() as conn:
        await _ensure_schema(conn)
        cursor = await db.execute(conn, query, tuple(params))
        rows = await cursor.fetchall()

    scored = []
    for row in rows:
        row = dict(row)
        themes = row.get("themes")
        if isinstance(themes, str):
            try:
                themes = json.loads(themes)
            except Exception:
                themes = []
        row["themes"] = themes if isinstance(themes, list) else []

        score = _match_score(row, company_name, sector, job_family, seniority, interview_stage)
        if score <= 0:
            continue
        confidence = _confidence_label(score, int(row.get("occurrence_count") or 1))
        scored.append({
            "theme": row["normalized_question"],
            "confidence": confidence,
            "rationale": _rationale(confidence, row, sector),
            "occurrence_count": row.get("occurrence_count"),
            "themes": row["themes"],
            "difficulty": row.get("difficulty"),
            "candidate_struggled": bool(row.get("candidate_struggled")),
            "_score": score,
        })

    confidence_rank = {"very_likely": 0, "likely": 1, "to_prepare": 2}
    scored.sort(key=lambda x: (confidence_rank[x["confidence"]], -x["_score"], -(x["occurrence_count"] or 0)))

    seen_themes = set()
    deduped = []
    for item in scored:
        key = item["theme"].strip().lower()
        if key in seen_themes:
            continue
        seen_themes.add(key)
        item.pop("_score", None)
        deduped.append(item)
        if len(deduped) >= limit:
            break

    return deduped
