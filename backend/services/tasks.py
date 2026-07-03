import json
import asyncio
import re
from pathlib import Path
from database import db
from .ai_generator import ai_service
from .websocket_manager import manager
# Import de la vraie logique de recherche
from .market_research import perform_market_research
# Import des utilitaires pour éviter le cycle
from .utils import (
    load_prompt, clean_ai_json_response, normalize_language, 
    _generate_cache_key, get_cached_content, set_cached_content,
    _CACHE_LOCKS,
    _sanitize_data_for_ai
)

# --- CONFIGURATION DES CHEMINS ---
# Calcul robuste du dossier des prompts : backend/services/../ai/prompts -> backend/ai/prompts
CURRENT_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = CURRENT_DIR.parent / "ai" / "prompts"

def get_prompt_path(filename: str) -> str:
    """Retourne le chemin absolu vers un fichier prompt."""
    return str(PROMPTS_DIR / filename)

def update_task_status_sync(task_id: str, status: str, result: dict = None):
    """Mise à jour synchrone de la DB (pour exécution dans un thread)."""
    result_json = json.dumps(result, default=str) if result is not None else None
    try:
        import os
        with db.get_sync_connection() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE tasks SET status = %s, result = %s WHERE id = %s", (status, result_json, task_id))
            conn.commit()
            cur.close()
    except Exception as e:
        print(f"[DB CRITICAL ERROR] Failed to update task {task_id}: {e}", flush=True)

# --- TÂCHES ASYNCHRONES ---

async def _check_cache_and_broadcast(task_id: str, user_id: str, content_type: str, data: dict, message: str = "Récupéré en cache"):
    """Vérifie le cache et diffuse le résultat s'il est trouvé."""
    if not user_id or user_id == "unknown_user":
        return False, None
    cache_key = _generate_cache_key(user_id, content_type, data)
    cached = await get_cached_content(cache_key)
    if cached:
        # [FIX EXPERT] Préservation des éditions de l'utilisateur (ex: réponses éditées).
        # Si le CV n'a pas changé (Cache HIT), on privilégie les données déjà présentes dans le profil du Frontend
        # plutôt que de renvoyer le cache brut qui écraserait les modifications locales (comme suggested_answer).
        payload_to_broadcast = cached
        needs_cache_update = False
        
        if content_type == "interview_questions":
            qs = data.get("questions") or data.get("questions_list")
            if qs and isinstance(qs, list) and len(qs) > 0:
                # [FIX EXPERT] Fusion intelligente : on préserve les éditions du frontend
                # tout en ré-injectant les réponses du candidat stockées en cache.
                def extract_deep_questions(obj):
                    found = []
                    if isinstance(obj, dict):
                        if any(k in obj for k in ["question", "scenario", "situation", "text", "contexte", "description", "defi"]):
                            found.append(obj)
                        for v in obj.values():
                            found.extend(extract_deep_questions(v))
                    elif isinstance(obj, list):
                        for item in obj:
                            found.extend(extract_deep_questions(item))
                    return found
                
                cached_qs = extract_deep_questions(cached)
                cached_answers = {
                    re.sub(r'\W+', '', str(cq.get("question") or cq.get("scenario") or cq.get("situation") or cq.get("text") or cq.get("contexte") or cq.get("description") or cq.get("defi") or "")).lower(): cq 
                    for cq in cached_qs if isinstance(cq, dict) and "user_answer" in cq
                }
                for q in qs:
                    if isinstance(q, dict):
                        q_text = q.get("question") or q.get("scenario") or q.get("situation") or q.get("text") or q.get("contexte") or q.get("description") or q.get("defi") or ""
                        q_norm = re.sub(r'\W+', '', str(q_text)).lower()
                        if q_norm in cached_answers:
                            cq = cached_answers[q_norm]
                            q["user_answer"] = cq.get("user_answer")
                            if "evaluation" in cq:
                                q["evaluation"] = cq.get("evaluation")
                payload_to_broadcast = {"questions": qs}
                needs_cache_update = True
        elif content_type == "pitch" and data.get("pitch") and isinstance(data.get("pitch"), dict) and data.get("pitch").get("accroche"):
            payload_to_broadcast = data.get("pitch")
            needs_cache_update = True
        elif content_type == "action_plan" and data.get("action_plan"):
            payload_to_broadcast = data.get("action_plan")
            needs_cache_update = True
            
        if needs_cache_update:
            await set_cached_content(cache_key, user_id, content_type, payload_to_broadcast)
            
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", payload_to_broadcast)
        await manager.broadcast(task_id, message, status="COMPLETED", data=payload_to_broadcast)
        return True, cache_key
    return False, cache_key

async def process_research_in_background(task_id: str, request_data: dict):
    print(f"[Task {task_id}] 🚀 Starting research (Async)...")
    await _run_research_logic(task_id, request_data)

async def _run_research_logic(task_id: str, request_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = request_data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "research", request_data, "Analyse récupérée en cache")
        if is_cached: return

        # Normalisation de la langue pour la recherche
        if 'target_language' in request_data:
            request_data['target_language'] = normalize_language(request_data['target_language'])
        final_report = await perform_market_research(request_data, task_id=task_id) # Utilise déjà Serper si configuré
        
        await set_cached_content(cache_key, user_id, "research", final_report)
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", final_report)
        await manager.broadcast(task_id, "Analyse terminée avec succès !", status="COMPLETED", data=final_report)
    except Exception as e:
        print(f"[Task {task_id}] ❌ Research failed: {e}")
        # [FIX] Fallback gracieux pour ne jamais bloquer le frontend
        fallback = {
            "company": request_data.get('target_company', 'Unknown'),
            "market_report": {},
            "company_report": {},
            "sources": []
        }
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", fallback)
        await manager.broadcast(task_id, f"Erreur IA interceptée (Fallback activé).", status="COMPLETED", data=fallback)

async def process_salary_in_background(task_id: str, candidate_data: dict):
    print(f"[Task {task_id}] 💰 Starting Salary estimation (Async)...")
    await _run_salary_logic(task_id, candidate_data)

async def _run_salary_logic(task_id: str, candidate_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = candidate_data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "salary", candidate_data, "Estimation récupérée en cache")
        if is_cached: return

        await manager.broadcast(task_id, "Estimation du salaire en cours...")
        
        # [LOGIQUE REMOTE/INTERNATIONAL]
        target_country = str(candidate_data.get('target_country') or 'Unknown')
        remote_pref = candidate_data.get('remote_preference', '')
        target_lang = normalize_language(candidate_data.get('target_language', 'French'))
        
        geo_context = f"in {target_country}"
        if target_country.lower() in ['remote', 'international', 'world', 'global', 'monde']:
            geo_context = "for a GLOBAL REMOTE role (International Tier-1 Standard)"
        elif remote_pref == 'full':
            geo_context = f"in {target_country} (Full Remote context)"

        prompt = f"Estimate a realistic salary range (low, mid, high) for this profile {geo_context}.\n\nSPECIAL INSTRUCTION: If location is Remote/International, use USD or EUR and explain in 'commentary' that salary depends on Company HQ location. Write the 'commentary' in {target_lang}.\n\nPROFILE:\n{json.dumps(_sanitize_data_for_ai(candidate_data, strict=True), indent=2, ensure_ascii=False, default=str)}\n\n⚠️ INSTRUCTION CRITIQUE : Ne recopie JAMAIS les valeurs d'exemple du JSON. Tu DOIS calculer de vrais montants basés sur le marché actuel pour ce profil précis.\nRespond in STRICT JSON: {{\"salary_range\": {{\"low\": 0, \"mid\": 0, \"high\": 0}}, \"currency\": \"EUR\", \"confidence\": \"Haute | Moyenne | Faible\", \"commentary\": \"...\"}}\nIMPORTANT: 'low', 'mid', 'high' MUST be integers."
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a compensation expert. You must output STRICT JSON.")
        if "error" in result:
            result = {"salary_range": {"low": 0, "mid": 0, "high": 0}, "currency": "EUR", "commentary": "Estimation indisponible."}
        else:
            await set_cached_content(cache_key, user_id, "salary", result)
            
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
        await manager.broadcast(task_id, "Estimation terminée.", status="COMPLETED", data=result)
    except Exception as e:
        print(f"[Task {task_id}] ❌ Salary failed: {e}")
        fallback = {"salary_range": {"low": 0, "mid": 0, "high": 0}, "currency": "EUR", "commentary": "Erreur temporaire de l'IA."}
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", fallback)
        await manager.broadcast(task_id, "Estimation (Fallback)", status="COMPLETED", data=fallback)

async def process_cv_draft_in_background(task_id: str, source_data: dict):
    print(f"[Task {task_id}] ⚙️ Starting CV Draft (Async)...")
    await _run_cv_draft_logic(task_id, source_data)

async def _run_cv_draft_logic(task_id: str, source_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = source_data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "cv_draft", source_data, "CV récupéré en cache")
        if is_cached: return

        prompt_template = load_prompt(get_prompt_path("master_prompt.md"))
        context_str = json.dumps(_sanitize_data_for_ai(source_data, strict=True), indent=2, ensure_ascii=False, default=str)
        final_prompt = f"{prompt_template}\n\nINPUT DATA:\n{context_str}"
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are the AI for BeyondTheCV. Output STRICT JSON.")
        if "error" not in result:
            await set_cached_content(cache_key, user_id, "cv_draft", result)
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
        await manager.broadcast(task_id, "Brouillon généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_completeness_in_background(task_id: str, payload: dict):
    print(f"[Task {task_id}] 🔍 Starting Completeness Analysis (Async)...")
    await _run_completeness_logic(task_id, payload)

async def _run_completeness_logic(task_id: str, payload: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        data_to_analyze = payload.get("data", payload)
        user_id = data_to_analyze.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "completeness", data_to_analyze, "Analyse récupérée en cache")
        if is_cached: return

        target_lang = normalize_language(data_to_analyze.get('target_language', 'French'))
        text_content = json.dumps(_sanitize_data_for_ai(data_to_analyze, strict=True), indent=2, ensure_ascii=False, default=str) if isinstance(data_to_analyze, dict) else str(data_to_analyze)
        
        prompt = f"""
        Analyze the candidate's profile completeness with a specific focus on generating a strong Elevator Pitch.
        Return JSON with 'score', 'quality', 'missing_info', 'suggestions', 'clarifications'.
        
        For 'clarifications', you MUST provide EXACTLY 3 objects: {{ 'question': '...', 'suggested_answer': '...' }}.
        Even if the profile seems completely perfect, you MUST ask 3 strategic questions to extract quantifiable metrics (KPIs), specific challenges overcome, or unique value propositions that will make the oral pitch memorable.
        The suggested answer should be a plausible draft based on the context, written in the first person.
        
        CONTENT:
        {text_content[:15000]}
        """
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Data Quality Analyst. Output STRICT JSON. Language: {target_lang}.")
        if "error" not in result:
            await set_cached_content(cache_key, user_id, "completeness", result)
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
        await manager.broadcast(task_id, "Analyse terminée", status="COMPLETED", data=result)
    except Exception as e:
        fallback = {"score": 50, "quality": "Moyen", "missing_info": [], "suggestions": [], "clarifications": []}
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", fallback)
        await manager.broadcast(task_id, "Analyse terminée (Fallback)", status="COMPLETED", data=fallback)

async def process_pitch_in_background(task_id: str, candidate_data: dict):
    print(f"[Task {task_id}] 🎤 Starting Pitch (Async)...")
    await _run_pitch_logic(task_id, candidate_data)

async def _run_pitch_logic(task_id: str, candidate_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = candidate_data.get("user_id", "unknown_user")
        # La logique de génération de pitch est maintenant dans cv_services.generate_pitch
        # On l'appelle directement pour la cohérence.
        from .cv_services import generate_pitch
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "pitch", candidate_data, "Pitch récupéré en cache")
        if is_cached: return

        result = await generate_pitch(candidate_data, quality='smart')
        target_lang = normalize_language(candidate_data.get('target_language', 'French'))
        if "error" not in result:
            await set_cached_content(cache_key, user_id, "pitch", result)
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
        await manager.broadcast(task_id, "Pitch généré", status="COMPLETED", data=result)
    except Exception as e:
        fallback = {"accroche": "Erreur", "preuve": "", "valeur": "", "projection": ""}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", fallback)
        await manager.broadcast(task_id, "Erreur de génération", status="FAILED", data=fallback)

async def process_questions_in_background(task_id: str, candidate_data: dict):
    print(f"[Task {task_id}] ❓ Starting Questions (Async)...")
    await _run_questions_logic(task_id, candidate_data)

async def _run_questions_logic(task_id: str, candidate_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = candidate_data.get("user_id", "unknown_user")
        cache_key = _generate_cache_key(user_id, "interview_questions", candidate_data)
        
        if cache_key not in _CACHE_LOCKS:
            _CACHE_LOCKS[cache_key] = asyncio.Lock()
            
        async with _CACHE_LOCKS[cache_key]:
            is_cached, _ = await _check_cache_and_broadcast(task_id, user_id, "interview_questions", candidate_data, "Questions récupérées en cache")
            if is_cached: return

            target_lang = normalize_language(candidate_data.get('target_language', 'French'))
            
            # [FIX] Logique "Victor Hugo" : Extraction adresse et hobbies pour questions de curiosité
            p_info = candidate_data.get('personal_info') or {}
            address = p_info.get('address') or 'Inconnue'
            city = p_info.get('city') or ''
            hobbies = candidate_data.get('interests') or []
            flaws = candidate_data.get('flaws') or []
            target_job = candidate_data.get('target_job') or 'Poste visé'
            prompt_template = load_prompt(get_prompt_path("interview_questions.md"))
            
            # [FIX EXPERT] Whitelist stricte pour éviter l'explosion de tokens. Le profil enfle avec
            # l'historique d'entraînement, ce qui causait une coupure JSON et l'erreur {"error": True}
            safe_data = {
                "experiences": candidate_data.get("experiences", []),
                "educations": candidate_data.get("educations", []),
                "skills": candidate_data.get("skills", []),
                "languages": candidate_data.get("languages", []),
                "free_text": candidate_data.get("free_text", "")
            }
            
            final_prompt = f"""
            {prompt_template}
            
            CONTEXTE CANDIDAT :
            Adresse Complète : {address}, {city}
            Hobbies : {hobbies}
            Défauts identifiés par le candidat : {flaws}
            Poste visé : {target_job}
            
            DONNÉES :
            {json.dumps(safe_data, indent=2, ensure_ascii=False, default=str)}
            
            OUTPUT LANGUAGE: {target_lang}
            """
            
            result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction=f"You are an expert interviewer. Output ONLY JSON. Language: {target_lang}.")
            if "error" in result:
                await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
                await manager.broadcast(task_id, "Erreur lors de la génération", status="FAILED", data=result)
            else:
                await set_cached_content(cache_key, user_id, "interview_questions", result)
                await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
                await manager.broadcast(task_id, "Questions générées avec succès", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_gap_analysis_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ⚖️ Starting Gap Analysis (Async)...")
    await _run_gap_analysis_logic(task_id, data)

async def _run_gap_analysis_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "gap_analysis", data, "Analyse d'écart récupérée en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        # [FIX] Fallback robuste pour le titre du poste
        target_job = data.get('target_job') or data.get('target_role_primary', 'Unknown Position')
        job_description = data.get('job_description', '')
        
        # [AMELIORATION] Utilisation de la JD réelle si disponible
        context_job = f"Poste visé : '{target_job}'"
        if job_description and len(job_description) > 50:
            context_job += f"\n\nDESCRIPTION DE L'OFFRE (REFERENCE ABSOLUE) :\n{job_description}"
        else:
            context_job += "\n(Pas de description fournie, base-toi sur les standards du marché pour ce titre)"
        
        # [FIX EXPERT] Whitelist stricte pour empêcher le JSON de dépasser la limite de l'IA
        clean_data = {
            "experiences": data.get("experiences", []),
            "educations": data.get("educations", []),
            "skills": data.get("skills", []),
            "languages": data.get("languages", []),
            "work_style": data.get("work_style", []),
            "relational_style": data.get("relational_style", []),
            "professional_approach": data.get("professional_approach", []),
            "free_text": data.get("free_text", "")
        }
        
        prompt_template = load_prompt(get_prompt_path("gap_analysis.md"))
        prompt = f"""
        {prompt_template}
        
        {context_job}
        
        PROFIL CANDIDAT :
        {json.dumps(clean_data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur d'analyse", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "gap_analysis", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Analyse terminée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def run_gap_analysis_and_get_result(data: dict):
    """
    Exécute l'analyse d'écart et retourne le résultat directement (sans passer par la DB).
    Utilisé par l'endpoint /dashboard/summary.
    """
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        # [FIX] Fallback robuste pour le titre du poste
        target_job = data.get('target_job') or data.get('target_role_primary', 'Unknown Position')
        job_description = data.get('job_description', '')
        
        # [AMELIORATION] Utilisation de la JD réelle si disponible
        context_job = f"Poste visé : '{target_job}'"
        if job_description and len(job_description) > 50:
            context_job += f"\n\nDESCRIPTION DE L'OFFRE (REFERENCE ABSOLUE) :\n{job_description}"
        else:
            context_job += "\n(Pas de description fournie, base-toi sur les standards du marché pour ce titre)"
        
        # [FIX EXPERT] Whitelist stricte pour empêcher le JSON de dépasser la limite de l'IA
        clean_data = {
            "experiences": data.get("experiences", []),
            "educations": data.get("educations", []),
            "skills": data.get("skills", []),
            "languages": data.get("languages", []),
            "work_style": data.get("work_style", []),
            "relational_style": data.get("relational_style", []),
            "professional_approach": data.get("professional_approach", []),
            "free_text": data.get("free_text", "")
        }
        
        print(f"[Gap Analysis] Running for job: {target_job}...", flush=True)

        prompt_template = load_prompt(get_prompt_path("gap_analysis.md"))
        prompt = f"""
        {prompt_template}
        
        {context_job}
        
        PROFIL CANDIDAT :
        {json.dumps(clean_data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        return await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
    except Exception as e:
        print(f"[Gap Analysis Error] {e}")
        return {"error": str(e), "match_score": 0, "missing_gaps": []}

# --- NOUVELLES TÂCHES PREMIUM ---

async def process_career_radar_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 📡 Starting Career Radar (Async)...")
    await _run_career_radar_logic(task_id, data)

async def _run_career_radar_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "career_radar", data, "Radar récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("career_radar.md"))
        
        target_role = data.get('target_role_primary') or data.get('target_job') or 'Non défini'
        target_industry = data.get('target_industry') or 'Non défini'
        job_desc = data.get('job_description', '')
        
        target_context = f"Poste visé : {target_role}\nSecteur visé : {target_industry}"
        if job_desc and len(job_desc) > 50:
            target_context += f"\nDescription de l'offre :\n{job_desc}"

        final_prompt = f"""
        {prompt_template}
        
        PROFIL CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        CIBLE ACTUELLE DU CANDIDAT (POUR ANCRER LES TRAJECTOIRES) :
        {target_context}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Career Strategist. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "career_radar", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Radar généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_recruiter_view_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕶️ Starting Recruiter View (Async)...")
    await _run_recruiter_view_logic(task_id, data)

async def _run_recruiter_view_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "recruiter_view", data, "Vue recruteur récupérée en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("recruiter_view.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an empathetic, strategic Career Coach. Help the candidate succeed. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "recruiter_view", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Vue recruteur générée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_oneliner_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ⚡ Starting One-Liner (Async)...")
    await _run_oneliner_logic(task_id, data)

async def _run_oneliner_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "oneliner", data, "One-Liner récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        
        prompt = f"""
        Génère une 'One-Liner' percutante pour ce candidat.
        C'est une phrase unique, dense et mémorable qui résume le profil pour l'entête du CV.
        
        Format : "Titre/Rôle + Années d'expérience + Spécialité majeure + Valeur ajoutée/Soft skill dominant."
        Exemple : "Officier spécialisé en cyberdéfense avec 10 ans d’expérience dans les environnements critiques, orienté gestion du risque et leadership opérationnel."
        
        CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT STRICT JSON: {{ "one_liner": "..." }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="gemini", system_instruction="You are a Personal Branding Expert. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "oneliner", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "One-liner générée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_risk_analysis_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🛡️ Starting Risk Analysis (Async)...")
    await _run_risk_analysis_logic(task_id, data)

async def _run_risk_analysis_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "risk_analysis", data, "Analyse des risques récupérée en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        
        prompt = f"""
        Analyse les risques potentiels liés à ce poste et à ce profil.
        Agis comme un protecteur du candidat.
        
        Risques à évaluer :
        1. Stabilité de l'entreprise/secteur (si info dispo).
        2. Adéquation du profil (Surqualification ? Risque d'ennui ? Gap trop grand ?).
        3. Drapeaux rouges dans la description de poste (Turnover, flou, exigences irréalistes).
        
        POSTE VISÉ : {data.get('target_role_primary', 'Inconnu')}
        DESCRIPTION : {data.get('job_description', '')}
        PROFIL : {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT STRICT JSON:
        {{
            "risk_analysis": {{
                "overall_risk_level": "Low" | "Medium" | "High",
                "warnings": ["Warning 1", "Warning 2"],
                "positive_signals": ["Signal 1", "Signal 2"],
                "advice": "Conseil final"
            }}
        }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a Career Risk Analyst.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "risk_analysis", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Analyse des risques terminée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_job_decoder_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕵️ Starting Job Decoder (Async)...")
    await _run_job_decoder_logic(task_id, data)

async def _run_job_decoder_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "job_decoder", data, "Décodeur d'offre récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("job_decoder.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        OFFRE D'EMPLOI :
        Titre : {data.get('target_job', 'Non spécifié')}
        Description : {data.get('job_description', 'Non fournie')}
        Entreprise : {data.get('target_company', 'Non spécifiée')}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Job Market Analyst. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "job_decoder", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Décodeur d'offre généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_hidden_market_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕸️ Starting Hidden Market Engine (Async)...")
    await _run_hidden_market_logic(task_id, data)

async def _run_hidden_market_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "hidden_market", data, "Marché caché récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("hidden_market.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        PROFIL CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        CIBLE :
        Poste : {data.get('target_job', '')}
        Entreprise : {data.get('target_company', '')}
        Secteur : {data.get('target_industry', '')}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Networking Strategist. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "hidden_market", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Stratégie marché caché générée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_career_gps_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🧭 Starting Career GPS (Async)...")
    await _run_career_gps_logic(task_id, data)

async def _run_career_gps_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "career_gps", data, "GPS Carrière récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("career_gps.md"))
        
        target_role = data.get('target_role_primary') or data.get('target_job') or 'Non défini'
        job_desc = data.get('job_description', '')
        
        destination_context = target_role
        if job_desc and len(job_desc) > 50:
            destination_context += f"\n\nDESCRIPTION DE L'OFFRE (Détails de la destination) :\n{job_desc}"

        final_prompt = f"""
        {prompt_template}
        
        PROFIL DU VOYAGEUR (CANDIDAT) :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        DESTINATION SOUHAITÉE :
        {destination_context}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Career Navigation System. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "career_gps", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "GPS Carrière généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_reality_check_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🌟 Starting Reality Check (Async)...")
    await _run_reality_check_logic(task_id, data)

async def _run_reality_check_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "reality_check", data, "Reality check récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("career_reality_check.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="gemini", system_instruction="You are a Personal Branding Expert. Output STRICT JSON.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "reality_check", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Reality check généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_profile_validation_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🛡️ Starting Profile Validation (Async)...")
    await _run_profile_validation_logic(task_id, data)

async def _run_profile_validation_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "profile_validation", data, "Validation de profil récupérée en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        
        prompt = f"""
        Tu es recruteur senior et spécialiste du recrutement.
        Ta mission est de transformer les informations brutes d’un candidat en profil professionnel crédible.

        Analyse les données fournies et applique les règles suivantes :
        1. Corrige toutes les fautes d’orthographe et de frappe.
        2. Reformule les phrases pour un CV professionnel.
        3. Supprime ou reformule toute information qui pourrait nuire à la candidature.
        4. Si le candidat mentionne des défauts inacceptables (ex : paresse, mensonge, manque de motivation), explique pourquoi et propose des alternatives acceptables.
        5. Conserve uniquement les informations pertinentes pour un recruteur.
        6. Si une phrase est trop informelle, reformule-la.

        PROFIL BRUT DU CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}

        OUTPUT STRICT JSON:
        {{
            "professionalism_score": 74,
            "alerts": [
                "Le terme 'paresseux' est incompatible avec une présentation professionnelle.",
                "2 fautes d'orthographe détectées dans la description de l'expérience."
            ],
            "suggestions": ["Vous pourriez plutôt mentionner : tendance à vouloir optimiser les processus."],
            "corrected_profile_preview": "Texte reformulé de manière professionnelle résumant le profil corrigé."
        }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a strict HR reviewer and career coach.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "profile_validation", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Validation de profil terminée", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_flaw_coaching_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ✨ Starting Flaw Coaching (Async)...")
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "flaw_coaching", data, "Coaching défauts récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        flaws = data.get('flaws', [])
        if not flaws:
            # Pas de défauts renseignés, on valide la tâche vide
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", {"coaching": []})
            await manager.broadcast(task_id, "Aucun défaut", status="COMPLETED", data={"coaching": []})
            return
            
        prompt_template = load_prompt(get_prompt_path("flaw_coach.md"))
        final_prompt = f"""
        {prompt_template}
        
        DÉFAUTS SÉLECTIONNÉS PAR LE CANDIDAT : {json.dumps(flaws, ensure_ascii=False)}
        POSTE VISÉ : "{data.get('target_job', 'Candidat')}"
        
        Adapte le ton et les exemples au niveau de séniorité du poste visé.
        OUTPUT LANGUAGE: {target_lang}
        """
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an Interview Coach. Output STRICT JSON.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "flaw_coaching", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Coaching défauts généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_executive_summary_in_background(task_ids: dict, data: dict):
    """
    FUSION OPTIMISÉE: Traite One-Liner, Career Radar et Recruiter View en 1 seul appel IA.
    """
    print(f"[Tasks] 🚀 Starting Unified Executive Summary...")
    
    # 1. On passe les 3 tâches en RUNNING
    for tid in task_ids.values():
        await asyncio.to_thread(update_task_status_sync, tid, "RUNNING")
        
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        target_role = data.get('target_role_primary') or data.get('target_job') or 'Non défini'
        
        prompt = f"""
        Tu es un expert RH de haut niveau. Ta mission est d'analyser ce profil sous 3 angles différents et de renvoyer un JSON unique.
        
        PROFIL CANDIDAT :
        {json.dumps(_sanitize_data_for_ai(data, strict=True), indent=2, ensure_ascii=False, default=str)}
        
        POSTE VISÉ : {target_role}
        
        ATTENTES :
        1. "one_liner_result" : Une phrase unique, dense et mémorable résumant le profil (Titre + Expérience + Valeur).
        2. "career_radar_result" : Analyse de la trajectoire (risques, opportunités, cohérence).
        3. "recruiter_view_result" : L'avis impitoyable d'un DRH (red flags, points rassurants, probabilité d'entretien sur 100, et un conseil "brutal_truth"). Ignore les erreurs de frappe du brouillon.
        
        OUTPUT STRICT JSON (Conserve exactement ces clés en anglais):
        {{
            "one_liner_result": {{ "one_liner": "..." }},
            "career_radar_result": {{ 
                "trajectories": [
                    {{
                        "title": "Nom du poste alternatif",
                        "match_percent": 85,
                        "salary_potential": "ex: 55k€ - 65k€",
                        "time_to_reach": "ex: Immédiat / 6 mois",
                        "rationale": "Pourquoi ce pivot a du sens",
                        "gap": "Ce qu'il manque pour y arriver"
                    }}
                ]
            }},
            "recruiter_view_result": {{
                "recruiter_persona": {{
                    "first_impression": "...", "red_flags": ["..."], "reassurance_points": ["..."],
                    "interview_probability": 80, "verdict": "Convoquer", "brutal_truth": "..."
                }}
            }}
        }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are an Executive Profiler. Output STRICT JSON.")
        
        if "error" in result:
            raise Exception(result["error"])
            
        user_id = data.get("user_id", "unknown_user")
        cache_key = _generate_cache_key(user_id, "executive_summary", data)
        await set_cached_content(cache_key, user_id, "executive_summary", result)

        # 2. On dispatche intelligemment les résultats vers les bonnes tâches Frontend
        if "one_liner" in task_ids: 
            await asyncio.to_thread(update_task_status_sync, task_ids["one_liner"], "SUCCESS", result.get("one_liner_result", {}))
            await manager.broadcast(task_ids["one_liner"], "One-Liner générée", status="COMPLETED", data=result.get("one_liner_result", {}))
        if "career_radar" in task_ids: 
            await asyncio.to_thread(update_task_status_sync, task_ids["career_radar"], "SUCCESS", result.get("career_radar_result", {}))
            await manager.broadcast(task_ids["career_radar"], "Radar généré", status="COMPLETED", data=result.get("career_radar_result", {}))
        if "recruiter_view" in task_ids: 
            await asyncio.to_thread(update_task_status_sync, task_ids["recruiter_view"], "SUCCESS", result.get("recruiter_view_result", {}))
            await manager.broadcast(task_ids["recruiter_view"], "Vue recruteur générée", status="COMPLETED", data=result.get("recruiter_view_result", {}))
        
    except Exception as e:
        for tid in task_ids.values():
            await asyncio.to_thread(update_task_status_sync, tid, "FAILED", {"error": str(e)})
            err_data = {"error": str(e)}
            await asyncio.to_thread(update_task_status_sync, tid, "FAILED", err_data)
            await manager.broadcast(tid, "Erreur", status="FAILED", data=err_data)

async def process_action_plan_in_background(task_id: str, cv_dict: dict):
    """Génère la To-Do list (Plan d'Action) en tâche de fond"""
    print(f"[Task {task_id}] 📋 Starting Action Plan (Async)...")
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = cv_dict.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "action_plan", cv_dict, "Plan d'action récupéré en cache")
        if is_cached: return

        target_lang = normalize_language(cv_dict.get('target_language', 'French'))
        try:
            prompt_template = load_prompt(get_prompt_path("action_plan.md"))
        except:
            prompt_template = "Génère un plan d'action JSON."
            
        # [FIX EXPERT] Nettoyage strict pour éviter l'effet d'écho (Hallucinations)
        safe_data = _sanitize_data_for_ai(cv_dict, strict=True)
            
        prompt = f"{prompt_template}\n\nPROFIL:\n{json.dumps(safe_data, ensure_ascii=False, default=str)}\n\nOUTPUT LANGUAGE: {target_lang}"
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a Career Coach.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "action_plan", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Plan d'action généré", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

async def process_custom_scenarios_in_background(task_id: str, data: dict):
    """Génère les Mises en Situation (Scénarios) ultra-personnalisées en tâche de fond"""
    print(f"[Task {task_id}] 🎭 Starting Custom Scenarios (Async)...")
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        user_id = data.get("user_id", "unknown_user")
        is_cached, cache_key = await _check_cache_and_broadcast(task_id, user_id, "extra_scenarios", data, "Scénarios récupérés en cache")
        if is_cached: return

        target_lang = normalize_language(data.get('target_language', 'French'))
        target_job = data.get('target_job') or data.get('target_role_primary', 'Candidat')
        job_desc = data.get('job_description', '')
        
        prompt_template = load_prompt(get_prompt_path("custom_scenarios.md"))
        
        context_job = f"Poste visé : {target_job}"
        if job_desc and len(job_desc) > 50:
            context_job += f"\nDESCRIPTION DE L'OFFRE :\n{job_desc[:5000]}"
            
        # [FIX EXPERT] Whitelist stricte pour empêcher le JSON brut de faire exploser la limite de tokens.
        clean_data = {
            "experiences": data.get("experiences", []),
            "skills": data.get("skills", []),
            "work_style": data.get("work_style", [])
        }
            
        final_prompt = f"""
        {prompt_template}
        
        CIBLE :
        {context_job}
        
        PROFIL CANDIDAT :
        {json.dumps(clean_data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an Expert HR Scenario Designer.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
            await manager.broadcast(task_id, "Erreur de génération des scénarios", status="FAILED", data=result)
        else:
            await set_cached_content(cache_key, user_id, "extra_scenarios", result)
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
            await manager.broadcast(task_id, "Scénarios générés avec succès", status="COMPLETED", data=result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})
        err = {"error": str(e)}
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", err)
        await manager.broadcast(task_id, "Erreur", status="FAILED", data=err)

# [FIX EXPERT] Set global pour protéger les sous-tâches du Garbage Collector de Python
_active_orchestrator_tasks = set()

async def orchestrate_dashboard_tasks(tasks_map: dict, cv_dict: dict):
    """
    Enterprise-grade Orchestrator:
    Éxécute les tâches d'arrière-plan par "Vagues" (Batching) de priorité.
    Cela empêche de saturer les limites de requêtes par minute (RPM) de l'API IA,
    tout en garantissant que les infos les plus importantes chargent en premier.
    """
    print("\n[ORCHESTRATOR] 🌊 Dispatching tasks to Semaphore Queue...", flush=True)
    
    def fire(task_key, coro):
        async def safe_coro():
            try:
                await coro
            except Exception as e:
                print(f"[ORCHESTRATOR ERROR] Crash critique intercepté sur '{task_key}' : {e}", flush=True)
                
                # [ROBUSTESSE] Récupération des IDs pour forcer le statut FAILED en DB et libérer le Frontend
                tids = []
                if isinstance(task_key, str) and task_key in tasks_map:
                    tids.append(tasks_map[task_key])
                elif isinstance(task_key, dict):  # Cas des tâches fusionnées (Market Strategy)
                    tids.extend(task_key.values())
                    
                for tid in tids:
                    try:
                        await asyncio.to_thread(update_task_status_sync, tid, "FAILED", {"error": f"Orchestrator safety fallback: {str(e)}"})
                        err_data = {"error": f"Orchestrator safety fallback: {str(e)}"}
                        await asyncio.to_thread(update_task_status_sync, tid, "FAILED", err_data)
                        await manager.broadcast(tid, "Erreur critique", status="FAILED", data=err_data)
                    except Exception as db_err:
                        print(f"[ORCHESTRATOR DB ERROR] Impossible de MAJ le statut pour {tid}: {db_err}", flush=True)
                        
        # [FIX EXPERT] Garde une référence forte de la tâche pour éviter sa destruction
        # silencieuse par le Garbage Collector quand l'orchestrateur a fini de s'exécuter.
        task = asyncio.create_task(safe_coro())
        _active_orchestrator_tasks.add(task)
        task.add_done_callback(_active_orchestrator_tasks.discard)

    if "gap_analysis" in tasks_map: fire("gap_analysis", process_gap_analysis_in_background(tasks_map["gap_analysis"], cv_dict))
    
    await asyncio.sleep(0.5) # Micro-délai pour garantir la priorité

    if "pitch" in tasks_map: fire("pitch", process_pitch_in_background(tasks_map["pitch"], cv_dict))
    if "reality_check" in tasks_map: fire("reality_check", process_reality_check_in_background(tasks_map["reality_check"], cv_dict))
    if "flaw_coaching" in tasks_map: fire("flaw_coaching", process_flaw_coaching_in_background(tasks_map["flaw_coaching"], cv_dict))
    if "custom_scenarios" in tasks_map: fire("custom_scenarios", process_custom_scenarios_in_background(tasks_map["custom_scenarios"], cv_dict))

    if "recruiter_view" in tasks_map: fire("recruiter_view", process_recruiter_view_in_background(tasks_map["recruiter_view"], cv_dict))

    await asyncio.sleep(0.5)
    if "questions" in tasks_map: fire("questions", process_questions_in_background(tasks_map["questions"], cv_dict))

    await asyncio.sleep(0.5)

    if "action_plan" in tasks_map: fire("action_plan", process_action_plan_in_background(tasks_map["action_plan"], cv_dict))
        
    if "job_decoder" in tasks_map: fire("job_decoder", process_job_decoder_in_background(tasks_map["job_decoder"], cv_dict))
    if "risk_analysis" in tasks_map: fire("risk_analysis", process_risk_analysis_in_background(tasks_map["risk_analysis"], cv_dict))
    if "hidden_market" in tasks_map: fire("hidden_market", process_hidden_market_in_background(tasks_map["hidden_market"], cv_dict))


    print("[ORCHESTRATOR] ✅ All tasks queued successfully. Semaphore is handling the flow.", flush=True)
