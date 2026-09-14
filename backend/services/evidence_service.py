"""
Service d'extraction et de gestion des preuves candidat.

Transforme chaque réponse d'entraînement en faits réutilisables
et maintient un profil de compétences évolutif.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from database import db


DEFAULT_COMPETENCIES = [
    "leadership",
    "communication_strategique",
    "gestion_de_crise",
    "management",
    "negociation",
    "resultats_chiffres",
    "vision_strategique",
    "adaptabilite",
    "anglais_professionnel",
    "influence",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def attach_source_to_evidence(
    evidence_items: list[dict[str, Any]],
    source_answer_id: str,
) -> list[dict[str, Any]]:
    """
    Associe chaque preuve à son identifiant de réponse source sans muter l'original.
    """
    return [
        {**item, "source_answer_id": source_answer_id}
        for item in evidence_items
        if isinstance(item, dict)
    ]


async def _upsert_evidence_items(
    user_id: str,
    evidence_items: list[dict[str, Any]],
    source_answer_id: str | None = None,
) -> None:
    """
    Insère ou met à jour les preuves candidates. Associe source_answer_id quand il est fourni.
    """
    if not user_id or not evidence_items:
        return

    async with db.get_connection() as conn:
        for item in evidence_items:
            if not isinstance(item, dict):
                continue
            competency = str(item.get("competency") or item.get("competence") or "general").lower().strip()
            title = str(item.get("title") or item.get("titre") or "").strip()
            description = str(item.get("description") or "").strip()
            if not title and not description:
                continue

            evidence_id = str(uuid.uuid4())
            metric_value = str(item.get("metric_value") or "")[:50]
            metric_unit = str(item.get("metric_unit") or "")[:30]
            scope = str(item.get("scope") or "")[:80]
            duration = str(item.get("duration") or "")[:80]
            context = str(item.get("context") or "")[:500]
            confidence = _safe_float(item.get("confidence_score"), 0.7)
            verification_status = str(item.get("verification_status") or "ai_extracted").lower().strip()
            item_source_answer_id = item.get("source_answer_id") or source_answer_id

            await db.execute(
                conn,
                """
                INSERT INTO candidate_evidence (
                    id, user_id, source_answer_id, source_type, evidence_type, competency,
                    title, description, metric_value, metric_unit, scope, duration, context,
                    confidence_score, verification_status, first_detected_at, last_confirmed_at, usage_count
                )
                VALUES (?, ?, ?, 'training', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
                ON CONFLICT DO NOTHING
                """,
                (
                    evidence_id, user_id, item_source_answer_id,
                    str(item.get("evidence_type") or "achievement")[:50],
                    competency[:80],
                    title[:300],
                    description[:2000],
                    metric_value,
                    metric_unit,
                    scope,
                    duration,
                    context,
                    confidence,
                    verification_status,
                ),
            )


async def save_evidence_extraction(
    user_id: str,
    source_answer_id: str,
    extraction: dict[str, Any],
) -> None:
    """
    Persiste les faits extraits d'une réponse et met à jour le profil stratégique.
    """
    if not user_id or not source_answer_id:
        return

    evidence_items = extraction.get("evidence") or extraction.get("evidence_items") or []
    if not isinstance(evidence_items, list):
        evidence_items = []

    await _upsert_evidence_items(user_id, evidence_items, source_answer_id)
    await update_competency_profile(user_id)


async def update_competency_profile(
    user_id: str,
    evidence_items: list[dict[str, Any]] | None = None,
) -> None:
    """
    Recalcule les scores de compétences à partir de l'ensemble des preuves.
    Distinction : compétence potentielle / capacité à démontrer / force des preuves.
    Accepte une liste de preuves déjà extraites pour éviter un appel IA supplémentaire.
    """
    if evidence_items is None:
        evidence_items = []

    # Si l'appelant fournit directement les preuves, les persister d'abord
    if evidence_items:
        await _upsert_evidence_items(user_id, evidence_items)

    async with db.get_connection() as conn:
        cur = await db.execute(
            conn,
            """
            SELECT competency,
                   COUNT(*) AS evidence_count,
                   AVG(confidence_score) AS avg_confidence,
                   SUM(CASE WHEN confidence_score >= 0.8 THEN 1 ELSE 0 END) AS strong_count,
                   SUM(CASE WHEN confidence_score < 0.5 THEN 1 ELSE 0 END) AS weak_count
            FROM candidate_evidence
            WHERE user_id = ? AND verification_status != 'rejected'
            GROUP BY competency
            """,
            (user_id,),
        )
        rows = await cur.fetchall()

        for row in rows:
            competency = row["competency"] or "general"
            evidence_count = int(row["evidence_count"] or 0)
            strong_count = int(row["strong_count"] or 0)
            weak_count = int(row["weak_count"] or 0)
            avg_confidence = _safe_float(row["avg_confidence"], 0.5)

            # Estimation de la compétence potentielle (présence + confiance)
            score = min(100, int(40 + (evidence_count * 8) + (avg_confidence * 30)))
            # Force des preuves (quantité et qualité)
            evidence_strength = min(100, int(
                (strong_count * 25) + (evidence_count * 5) + (avg_confidence * 20)
            ))
            # Capacité à démontrer : liée à la qualité des preuves et à leur forme
            demonstration_score = min(100, int(
                (evidence_strength * 0.5) + (score * 0.3) + (avg_confidence * 20)
            ))

            confidence_label = "forte" if avg_confidence >= 0.75 else "moyenne" if avg_confidence >= 0.5 else "faible"

            await db.execute(
                conn,
                """
                INSERT INTO candidate_competency_scores (
                    user_id, competency, score, demonstration_score, evidence_strength,
                    evidence_count, strong_evidence_count, weak_evidence_count,
                    trend, confidence, last_updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stable', ?, NOW())
                ON CONFLICT (user_id, competency) DO UPDATE SET
                    score = EXCLUDED.score,
                    demonstration_score = EXCLUDED.demonstration_score,
                    evidence_strength = EXCLUDED.evidence_strength,
                    evidence_count = EXCLUDED.evidence_count,
                    strong_evidence_count = EXCLUDED.strong_evidence_count,
                    weak_evidence_count = EXCLUDED.weak_evidence_count,
                    confidence = EXCLUDED.confidence,
                    last_updated_at = NOW()
                """,
                (
                    user_id, competency, score, demonstration_score, evidence_strength,
                    evidence_count, strong_count, weak_count, confidence_label,
                ),
            )


async def get_candidate_evidence(user_id: str, competency: str | None = None) -> list[dict[str, Any]]:
    async with db.get_connection() as conn:
        if competency:
            cur = await db.execute(
                conn,
                "SELECT * FROM candidate_evidence WHERE user_id = ? AND competency = ? ORDER BY last_confirmed_at DESC",
                (user_id, competency),
            )
        else:
            cur = await db.execute(
                conn,
                "SELECT * FROM candidate_evidence WHERE user_id = ? ORDER BY last_confirmed_at DESC",
                (user_id,),
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_competency_profile(user_id: str) -> list[dict[str, Any]]:
    async with db.get_connection() as conn:
        cur = await db.execute(
            conn,
            """
            SELECT * FROM candidate_competency_scores
            WHERE user_id = ?
            ORDER BY score DESC, evidence_strength DESC
            """,
            (user_id,),
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


def build_evidence_extraction_prompt(
    question_text: str,
    user_answer: str,
    question_category: str,
    exercise_type: str,
    target_lang: str = "French",
) -> str:
    """
    Construit le prompt demandant à l'IA d'extraire les faits réutilisables.
    Ce prompt est conçu pour être appelé DANS LA MÊME requête que l'évaluation.
    """
    return f"""
Tu es un extracteur de preuves factuelles pour un coaching de carrière.
À partir de la réponse du candidat, identifie les faits exploitables : réalisations, périmètres, résultats, compétences démontrées.

QUESTION POSÉE :
{question_text}

CATÉGORIE / TYPE :
{question_category} ({exercise_type})

RÉPONSE DU CANDIDAT :
{user_answer}

RÈGLES STRICTES :
- N'invente JAMAIS de chiffre, de périmètre ou de résultat qui n'est pas explicitement présent ou clairement déductible.
- Si le candidat dit "j'ai considérablement amélioré", ne crée pas de "+35 %".
- Utilise verification_status = "candidate_declared" pour les faits déclarés, "ai_extracted" pour les déductions raisonnables.
- Privilégie les compétences parmi : leadership, communication_strategique, gestion_de_crise, management, negociation, resultats_chiffres, vision_strategique, adaptabilite, anglais_professionnel, influence, general.

OUTPUT STRICT JSON :
{{
  "evidence": [
    {{
      "evidence_type": "achievement | skill_signal | context | weakness_signal",
      "competency": "nom de la compétence",
      "title": "titre court de la preuve",
      "description": "description factuelle",
      "metric_value": "valeur chiffrée si présente, sinon vide",
      "metric_unit": "unité si présente, sinon vide",
      "scope": "périmètre (équipe, projet, national, etc.)",
      "duration": "durée si mentionnée",
      "context": "contexte du poste ou de l'expérience",
      "confidence_score": 0.85
    }}
  ],
  "evaluation_scores": {{
    "overall_score": 72,
    "relevance_score": 8,
    "specificity_score": 5,
    "evidence_score": 4,
    "structure_score": 8,
    "credibility_score": 8,
    "impact_score": 6,
    "clarity_score": 9
  }}
}}
LANGUAGE: {target_lang}
"""


async def extract_and_save_evidence(
    ai_call_func,
    user_id: str,
    source_answer_id: str,
    question_text: str,
    user_answer: str,
    question_category: str,
    exercise_type: str,
    target_lang: str = "French",
) -> dict[str, Any]:
    """
    Appelle l'IA pour extraire les preuves ET met à jour le profil.
    Retourne le dictionnaire d'extraction pour être stocké dans training_sessions.
    """
    prompt = build_evidence_extraction_prompt(
        question_text=question_text,
        user_answer=user_answer,
        question_category=question_category,
        exercise_type=exercise_type,
        target_lang=target_lang,
    )
    try:
        result = await ai_call_func(
            feature="evidence_extraction",
            prompt=prompt,
            system_instruction=f"You extract factual evidence from interview answers. Output STRICT JSON only. Language: {target_lang}.",
            json_mode=True,
        )
        if not isinstance(result, dict):
            result = {}
        await save_evidence_extraction(user_id, source_answer_id, result)
        return result
    except Exception as e:
        print(f"[EVIDENCE EXTRACTION] Error: {e}", flush=True)
        return {}
