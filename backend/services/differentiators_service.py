from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime

from security import get_current_user
from database import db
from .ai_generator import ai_service
from .utils import load_prompt, normalize_language

router = APIRouter(
    prefix="/differentiators",
    tags=["Differentiators"],
    dependencies=[Depends(get_current_user)]
)


class DifferentiatorItem(BaseModel):
    id: Optional[str] = None
    fact: str
    proof: str
    interpretation: str
    interview_usage: str
    oral_phrasing: Optional[str] = ""
    source: Optional[str] = "manual"
    raw_user_story: Optional[str] = ""
    category: Optional[str] = "general"


class ExtractDifferentiatorsRequest(BaseModel):
    off_cv_text: Optional[str] = ""
    cv_data: Optional[Dict[str, Any]] = None
    target_language: Optional[str] = "fr"


class DeepenDifferentiatorRequest(BaseModel):
    user_story: str
    previous_answers: Optional[Dict[str, Any]] = None
    target_language: Optional[str] = "fr"


class SelectKeyMessagesRequest(BaseModel):
    application_id: str
    target_language: Optional[str] = "fr"


@router.get("/me", response_model=Dict[str, Any])
async def get_my_differentiators(current_user: dict = Depends(get_current_user)):
    """Retrieves candidate's permanent differentiators library and off-CV text."""
    user_id = current_user["id"]
    
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            "SELECT id, fact, proof, interpretation, interview_usage, oral_phrasing, source, raw_user_story, category FROM candidate_differentiators WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        rows = await cursor.fetchall()

        # Fetch off_cv_text from candidate_behavioral_data or profile
        cursor_beh = await db.execute(
            conn,
            "SELECT off_cv_text FROM candidate_behavioral_data WHERE user_id = ?",
            (user_id,)
        )
        beh_row = await cursor_beh.fetchone()
        off_cv_text = beh_row["off_cv_text"] if beh_row and beh_row["off_cv_text"] else ""

        if not off_cv_text:
            cursor_prof = await db.execute(
                conn,
                "SELECT profile_data FROM user_profiles WHERE user_id = ?",
                (user_id,)
            )
            prof_row = await cursor_prof.fetchone()
            if prof_row and prof_row["profile_data"]:
                prof_data = json.loads(prof_row["profile_data"]) if isinstance(prof_row["profile_data"], str) else prof_row["profile_data"]
                off_cv_text = prof_data.get("off_cv_text", "")

    items = [dict(row) for row in rows]
    return {
        "differentiators": items,
        "off_cv_text": off_cv_text
    }


@router.post("/me", response_model=Dict[str, Any])
async def save_differentiators(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Saves off_cv_text and/or differentiators list for the logged-in candidate."""
    user_id = current_user["id"]
    off_cv_text = payload.get("off_cv_text", "")
    items = payload.get("differentiators", [])

    async with db.get_connection() as conn:
        # Save off_cv_text in candidate_behavioral_data
        await db.execute(
            conn,
            """
            INSERT INTO candidate_behavioral_data (user_id, off_cv_text, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET off_cv_text = EXCLUDED.off_cv_text, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, off_cv_text)
        )

        # Save differentiators in candidate_differentiators
        saved_differentiators = []
        if isinstance(items, list):
            for item in items:
                diff_id = item.get("id") or str(uuid.uuid4())
                item_obj = {
                    "id": diff_id,
                    "fact": item.get("fact", ""),
                    "proof": item.get("proof", ""),
                    "interpretation": item.get("interpretation", ""),
                    "interview_usage": item.get("interview_usage", ""),
                    "oral_phrasing": item.get("oral_phrasing", ""),
                    "source": item.get("source", "manual"),
                    "raw_user_story": item.get("raw_user_story", ""),
                    "category": item.get("category", "general")
                }
                saved_differentiators.append(item_obj)
                await db.execute(
                    conn,
                    """
                    INSERT INTO candidate_differentiators (
                        id, user_id, fact, proof, interpretation, interview_usage,
                        oral_phrasing, source, raw_user_story, category, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET
                        fact = EXCLUDED.fact,
                        proof = EXCLUDED.proof,
                        interpretation = EXCLUDED.interpretation,
                        interview_usage = EXCLUDED.interview_usage,
                        oral_phrasing = EXCLUDED.oral_phrasing,
                        source = EXCLUDED.source,
                        raw_user_story = EXCLUDED.raw_user_story,
                        category = EXCLUDED.category,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (
                        diff_id, user_id,
                        item_obj["fact"], item_obj["proof"], item_obj["interpretation"],
                        item_obj["interview_usage"], item_obj["oral_phrasing"],
                        item_obj["source"], item_obj["raw_user_story"], item_obj["category"]
                    )
                )

        # Update profile_data in user_profiles to keep in sync
        cursor_prof = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (user_id,))
        prof_row = await cursor_prof.fetchone()
        if prof_row and prof_row["profile_data"]:
            prof_data = json.loads(prof_row["profile_data"]) if isinstance(prof_row["profile_data"], str) else prof_row["profile_data"]
            prof_data["off_cv_text"] = off_cv_text
            prof_data["differentiators"] = saved_differentiators
            await db.execute(
                conn,
                "UPDATE user_profiles SET profile_data = ?::jsonb WHERE user_id = ?",
                (json.dumps(prof_data, ensure_ascii=False), user_id)
            )

    return {"status": "saved", "off_cv_text": off_cv_text, "differentiators": saved_differentiators}


@router.delete("/{diff_id}", response_model=Dict[str, Any])
async def delete_differentiator(diff_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a differentiator by ID."""
    user_id = current_user["id"]
    async with db.get_connection() as conn:
        await db.execute(
            conn,
            "DELETE FROM candidate_differentiators WHERE id = ? AND user_id = ?",
            (diff_id, user_id)
        )
        cursor_prof = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (user_id,))
        prof_row = await cursor_prof.fetchone()
        if prof_row and prof_row["profile_data"]:
            prof_data = json.loads(prof_row["profile_data"]) if isinstance(prof_row["profile_data"], str) else prof_row["profile_data"]
            diffs = prof_data.get("differentiators", [])
            prof_data["differentiators"] = [d for d in diffs if d.get("id") != diff_id]
            await db.execute(
                conn,
                "UPDATE user_profiles SET profile_data = ?::jsonb WHERE user_id = ?",
                (json.dumps(prof_data, ensure_ascii=False), user_id)
            )
    return {"status": "deleted", "id": diff_id}


@router.post("/extract", response_model=Dict[str, Any])
async def extract_differentiators(
    request: ExtractDifferentiatorsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    AI extraction of candidate differentiating markers from CV, achievements, and off-CV text.
    """
    user_id = current_user["id"]
    target_lang = normalize_language(request.target_language or "fr")

    # Fetch candidate profile if not passed in request
    cv_data = request.cv_data
    off_cv_text = request.off_cv_text or ""

    if not cv_data:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (user_id,))
            row = await cursor.fetchone()
            if row and row["profile_data"]:
                cv_data = json.loads(row["profile_data"]) if isinstance(row["profile_data"], str) else row["profile_data"]

    if not cv_data:
        cv_data = {}

    if not off_cv_text:
        off_cv_text = cv_data.get("off_cv_text", "")

    prompt_template = load_prompt("differentiators_extract.md")
    final_prompt = (
        prompt_template
        .replace("{{CANDIDATE_DATA_JSON}}", json.dumps(cv_data, indent=2, ensure_ascii=False, default=str))
        .replace("{{OFF_CV_TEXT}}", off_cv_text)
        .replace("{{TARGET_LANGUAGE}}", target_lang)
    )

    try:
        res = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are a top Executive Interview Coach. Output STRICT JSON in {target_lang}."
        )

        differentiators = res.get("differentiators", [])
        saved_items = []

        async with db.get_connection() as conn:
            # Save extracted off_cv_text
            if off_cv_text:
                await db.execute(
                    conn,
                    """
                    INSERT INTO candidate_behavioral_data (user_id, off_cv_text, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id) DO UPDATE SET off_cv_text = EXCLUDED.off_cv_text, updated_at = CURRENT_TIMESTAMP
                    """,
                    (user_id, off_cv_text)
                )

            for item in differentiators:
                diff_id = str(uuid.uuid4())
                item_obj = {
                    "id": diff_id,
                    "fact": item.get("fact", ""),
                    "proof": item.get("proof", ""),
                    "interpretation": item.get("interpretation", ""),
                    "interview_usage": item.get("interview_usage", ""),
                    "oral_phrasing": item.get("oral_phrasing", ""),
                    "source": "ai_extraction",
                    "raw_user_story": off_cv_text,
                    "category": item.get("category", "general")
                }
                saved_items.append(item_obj)

                await db.execute(
                    conn,
                    """
                    INSERT INTO candidate_differentiators (
                        id, user_id, fact, proof, interpretation, interview_usage,
                        oral_phrasing, source, raw_user_story, category
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        diff_id, user_id,
                        item_obj["fact"], item_obj["proof"], item_obj["interpretation"],
                        item_obj["interview_usage"], item_obj["oral_phrasing"],
                        "ai_extraction", off_cv_text, item_obj["category"]
                    )
                )

        return {
            "differentiators": saved_items,
            "count": len(saved_items)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Differentiator extraction failed: {str(e)}")


@router.post("/deepen", response_model=Dict[str, Any])
async def deepen_differentiator(
    request: DeepenDifferentiatorRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Asks clarifying questions or completes proof validation for off-CV candidate input.
    """
    target_lang = normalize_language(request.target_language or "fr")
    prompt_template = load_prompt("differentiators_deepen.md")
    
    final_prompt = (
        prompt_template
        .replace("{{USER_STORY}}", request.user_story)
        .replace("{{PREVIOUS_ANSWERS_JSON}}", json.dumps(request.previous_answers or {}, ensure_ascii=False))
        .replace("{{TARGET_LANGUAGE}}", target_lang)
    )

    try:
        res = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are an interview proof verification coach. Output STRICT JSON in {target_lang}."
        )

        if not res.get("needs_clarification") and res.get("differentiator"):
            # Automatically save verified differentiator to DB
            user_id = current_user["id"]
            diff = res["differentiator"]
            diff_id = str(uuid.uuid4())
            diff["id"] = diff_id
            diff["source"] = "ai_deepening"
            diff["raw_user_story"] = request.user_story

            async with db.get_connection() as conn:
                await db.execute(
                    conn,
                    """
                    INSERT INTO candidate_differentiators (
                        id, user_id, fact, proof, interpretation, interview_usage,
                        oral_phrasing, source, raw_user_story, category
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        diff_id, user_id,
                        diff.get("fact", ""), diff.get("proof", ""), diff.get("interpretation", ""),
                        diff.get("interview_usage", ""), diff.get("oral_phrasing", ""),
                        "ai_deepening", request.user_story, diff.get("category", "general")
                    )
                )

        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deepening failed: {str(e)}")


@router.post("/applications/{application_id}/select", response_model=Dict[str, Any])
async def select_application_key_messages(
    application_id: str,
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Selects 3 to 6 top key messages for a specific application from candidate differentiators library.
    """
    user_id = current_user["id"]
    target_lang = normalize_language(payload.get("target_language", "fr"))

    async with db.get_connection() as conn:
        # Fetch candidate differentiators
        cursor_diff = await db.execute(
            conn,
            "SELECT * FROM candidate_differentiators WHERE user_id = ?",
            (user_id,)
        )
        diff_rows = await cursor_diff.fetchall()
        candidate_differentiators = [dict(r) for r in diff_rows]

        # Fetch job application context
        cursor_app = await db.execute(
            conn,
            "SELECT * FROM job_applications WHERE id = ? AND user_id = ?",
            (application_id, user_id)
        )
        app_row = await cursor_app.fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Job application not found")
        
        job_app_context = dict(app_row)

    if not candidate_differentiators:
        # Auto-extract differentiators first if none exist
        extract_res = await extract_differentiators(
            ExtractDifferentiatorsRequest(target_language=target_lang),
            current_user=current_user
        )
        candidate_differentiators = extract_res.get("differentiators", [])

    prompt_template = load_prompt("differentiators_select.md")
    final_prompt = (
        prompt_template
        .replace("{{CANDIDATE_DIFFERENTIATORS_JSON}}", json.dumps(candidate_differentiators, indent=2, ensure_ascii=False, default=str))
        .replace("{{JOB_APPLICATION_CONTEXT_JSON}}", json.dumps(job_app_context, indent=2, ensure_ascii=False, default=str))
        .replace("{{TARGET_LANGUAGE}}", target_lang)
    )

    try:
        res = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are a top executive coach selecting interview key messages. Output STRICT JSON in {target_lang}."
        )

        key_messages = res.get("key_messages", [])
        saved_messages = []

        async with db.get_connection() as conn:
            # Clear old key messages for this application
            await db.execute(conn, "DELETE FROM application_key_messages WHERE application_id = ?", (application_id,))

            for km in key_messages:
                km_id = str(uuid.uuid4())
                priority = km.get("priority_level", "priority")
                if priority not in ["priority", "opportunistic", "reserve"]:
                    priority = "priority"

                msg_obj = {
                    "id": km_id,
                    "application_id": application_id,
                    "user_id": user_id,
                    "differentiator_id": km.get("differentiator_id"),
                    "priority_level": priority,
                    "headline": km.get("headline", ""),
                    "supporting_fact": km.get("supporting_fact", ""),
                    "oral_pitch": km.get("oral_pitch", ""),
                    "target_situation": km.get("target_situation", "")
                }
                saved_messages.append(msg_obj)

                await db.execute(
                    conn,
                    """
                    INSERT INTO application_key_messages (
                        id, application_id, user_id, differentiator_id,
                        priority_level, headline, supporting_fact, oral_pitch, target_situation
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        km_id, application_id, user_id, km_id,
                        priority, msg_obj["headline"], msg_obj["supporting_fact"],
                        msg_obj["oral_pitch"], msg_obj["target_situation"]
                    )
                )

        return {
            "key_messages": saved_messages,
            "application_id": application_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Key messages selection failed: {str(e)}")


@router.get("/applications/{application_id}/key-messages", response_model=Dict[str, Any])
async def get_application_key_messages(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retrieves key messages selected for a specific application."""
    user_id = current_user["id"]
    async with db.get_connection() as conn:
        cursor = await db.execute(
            conn,
            """
            SELECT * FROM application_key_messages
            WHERE application_id = ? AND user_id = ?
            ORDER BY 
                CASE priority_level 
                    WHEN 'priority' THEN 1 
                    WHEN 'opportunistic' THEN 2 
                    ELSE 3 
                END, created_at ASC
            """,
            (application_id, user_id)
        )
        rows = await cursor.fetchall()

    return {"key_messages": [dict(r) for r in rows]}


class AnalyzeSensitiveSituationsRequest(BaseModel):
    sensitive_text: str
    target_language: Optional[str] = "fr"


@router.post("/sensitive-situations/analyze", response_model=Dict[str, Any])
async def analyze_sensitive_situations(
    request: AnalyzeSensitiveSituationsRequest,
    current_user: dict = Depends(get_current_user)
):
    """AI analysis & 3-tier action plan for candidate sensitive situations (fears/fragilities)."""
    user_id = current_user["id"]
    target_lang = normalize_language(request.target_language or "fr")

    cv_data = {}
    async with db.get_connection() as conn:
        cursor = await db.execute(conn, "SELECT profile_data FROM user_profiles WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        if row and row["profile_data"]:
            cv_data = json.loads(row["profile_data"]) if isinstance(row["profile_data"], str) else row["profile_data"]

    prompt_template = load_prompt("sensitive_situations.md")
    final_prompt = (
        prompt_template
        .replace("{{SENSITIVE_SITUATIONS_TEXT}}", request.sensitive_text)
        .replace("{{JOB_CONTEXT_JSON}}", json.dumps(cv_data, indent=2, ensure_ascii=False, default=str))
        .replace("{{TARGET_LANGUAGE}}", target_lang)
    )

    try:
        res = await ai_service.generate_valid_json(
            final_prompt,
            provider="openai",
            system_instruction=f"You are a top executive coach. Output STRICT JSON in {target_lang}."
        )

        situations = res.get("situations", [])
        async with db.get_connection() as conn:
            await db.execute(
                conn,
                """
                INSERT INTO candidate_behavioral_data (user_id, fears, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET fears = EXCLUDED.fears, updated_at = CURRENT_TIMESTAMP
                """,
                (user_id, request.sensitive_text)
            )

        return {
            "situations": situations,
            "raw_text": request.sensitive_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensitive situations analysis failed: {str(e)}")

