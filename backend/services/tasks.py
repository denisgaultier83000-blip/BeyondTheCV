import json
import asyncio
from pathlib import Path
from database import db
from .ai_generator import ai_service
from .websocket_manager import manager
# Import de la vraie logique de recherche
from .market_research import perform_market_research
# Import des utilitaires pour éviter le cycle
from .utils import load_prompt, clean_ai_json_response, normalize_language

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

async def process_research_in_background(task_id: str, request_data: dict):
    print(f"[Task {task_id}] 🚀 Starting research (Async)...")
    await _run_research_logic(task_id, request_data)

async def _run_research_logic(task_id: str, request_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        # Normalisation de la langue pour la recherche
        if 'target_language' in request_data:
            request_data['target_language'] = normalize_language(request_data['target_language'])
        final_report = await perform_market_research(request_data, task_id=task_id) # Utilise déjà Serper si configuré
        
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

        prompt = f"Estimate a realistic salary range (low, mid, high) for this profile {geo_context}.\n\nSPECIAL INSTRUCTION: If location is Remote/International, use USD or EUR and explain in 'commentary' that salary depends on Company HQ location. Write the 'commentary' in {target_lang}.\n\nPROFILE:\n{json.dumps(candidate_data, indent=2, ensure_ascii=False, default=str)}\n\nRespond in STRICT JSON: {{\"salary_range\": {{\"low\": 45000, \"mid\": 50000, \"high\": 55000}}, \"currency\": \"EUR\", \"commentary\": \"...\"}}\nIMPORTANT: 'low', 'mid', 'high' MUST be integers."
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a compensation expert. You must output STRICT JSON.")
        if "error" in result:
            result = {"salary_range": {"low": 0, "mid": 0, "high": 0}, "currency": "EUR", "commentary": "Estimation indisponible."}
            
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
        await manager.broadcast(task_id, "Estimation terminée.", status="COMPLETED", data=result)
    except Exception as e:
        print(f"[Task {task_id}] ❌ Salary failed: {e}")
        fallback = {"salary_range": {"low": 0, "mid": 0, "high": 0}, "currency": "EUR", "commentary": "Erreur temporaire de l'IA."}
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", fallback)

async def process_cv_draft_in_background(task_id: str, source_data: dict):
    print(f"[Task {task_id}] ⚙️ Starting CV Draft (Async)...")
    await _run_cv_draft_logic(task_id, source_data)

async def _run_cv_draft_logic(task_id: str, source_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        prompt_template = load_prompt(get_prompt_path("master_prompt.md"))
        context_str = json.dumps(source_data, indent=2, ensure_ascii=False, default=str)
        final_prompt = f"{prompt_template}\n\nINPUT DATA:\n{context_str}"
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are the AI for BeyondTheCV.")
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", {"error": str(e)})

async def process_completeness_in_background(task_id: str, payload: dict):
    print(f"[Task {task_id}] 🔍 Starting Completeness Analysis (Async)...")
    await _run_completeness_logic(task_id, payload)

async def _run_completeness_logic(task_id: str, payload: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        data_to_analyze = payload.get("data", payload)
        target_lang = normalize_language(data_to_analyze.get('target_language', 'French'))
        text_content = json.dumps(data_to_analyze, indent=2, ensure_ascii=False, default=str) if isinstance(data_to_analyze, dict) else str(data_to_analyze)
        prompt = f"Analyze completeness. Return JSON with 'score', 'quality', 'missing_info'ai e bes, 'suggestions', 'clarifications'.\n\nCONTENT:\n{text_content[:15000]}"
        result = await ai_service.generate_valid_json(prompt, provider="gemini", system_instruction=f"You are a Data Quality Analyst. Output STRICT JSON. Language: {target_lang}.")
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        fallback = {"score": 50, "quality": "Moyen", "missing_info": [], "suggestions": [], "clarifications": []}
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", fallback)

async def process_cv_analysis_in_background(task_id: str, cv_data: dict):
    print(f"[Task {task_id}] 🧠 Starting Full CV Analysis (Async)...")
    await _run_cv_analysis_logic(task_id, cv_data)

async def _run_cv_analysis_logic(task_id: str, cv_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        await manager.broadcast(task_id, "Analyse approfondie du CV en cours...")
        prompt_template = load_prompt(get_prompt_path("master_prompt.md"))
        target_lang = normalize_language(cv_data.get('target_language', 'French'))
        target_country = cv_data.get('target_country', 'International')
        user_prompt = f"Voici les données JSON du candidat :\n{json.dumps(cv_data, ensure_ascii=False, default=str)}\nAnalyse ce profil. CONTEXTE CULTUREL : {target_country}. IMPORTANT: OUTPUT STRICTLY IN {target_lang.upper()}."
        result_json = await ai_service.generate_valid_json(prompt=user_prompt, provider="openai", system_instruction=prompt_template)
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result_json)
        await manager.broadcast(task_id, "Analyse CV terminée.", status="COMPLETED", data=result_json)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", {"error": str(e)})

async def process_pitch_in_background(task_id: str, candidate_data: dict):
    print(f"[Task {task_id}] 🎤 Starting Pitch (Async)...")
    await _run_pitch_logic(task_id, candidate_data)

async def _run_pitch_logic(task_id: str, candidate_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        prompt_template = load_prompt(get_prompt_path("pitch_v1.md"))
        context_str = json.dumps(candidate_data, indent=2, ensure_ascii=False, default=str)
        
        # [FIX] Ajout du contexte de l'annonce/poste visé pour un pitch pertinent
        target_job = candidate_data.get('target_job', 'Poste visé')
        target_company = candidate_data.get('target_company', 'Entreprise cible')
        target_lang = normalize_language(candidate_data.get('target_language', 'French'))
        
        # [NEW] Injection des clarifications pour nourrir le pitch
        clarifications = candidate_data.get('clarifications', [])
        clarifications_str = "\n".join([f"Q: {c.get('question')}\nA: {c.get('answer')}" for c in clarifications if c.get('answer')])
        
        # [NEW] Injection des données de recherche asynchrone (Entreprise & Marché)
        research_context = ""
        rd = candidate_data.get("research_data")
        if rd:
            cr = rd.get("company_report", {})
            mr = rd.get("market_report", {})
            research_context = f"\nINFOS STRATÉGIQUES SUR L'ENTREPRISE ET LE MARCHÉ :\n- ADN Entreprise : {cr.get('identity_dna', 'Non spécifié')}\n- Enjeux / Défis : {cr.get('usp', 'Non spécifiés')}\n- Tendances marché : {mr.get('trends', 'Non spécifiées')}\n\n⚠️ UTILISE IMPÉRATIVEMENT CES INFOS POUR PERSONNALISER LA PARTIE 'POURQUOI CE POSTE' (PROJECTION)."

        final_prompt = f"""
        {prompt_template}
        
        CONTEXTE CIBLE :
        Poste : {target_job}
        Entreprise : {target_company}
        Langue du Pitch : {target_lang}
        {research_context}
        
        CLARIFICATIONS APPORTÉES PAR LE CANDIDAT (IMPORTANT - À UTILISER) :
        {clarifications_str}
        
        DONNÉES CANDIDAT :
        {context_str}
        
        INSTRUCTIONS SUPPLÉMENTAIRES :
        1. Utilise PRIORITAIREMENT les réponses aux clarifications pour construire le pitch.
        2. Si une partie (accroche, preuve, valeur, projection) manque d'informations concrètes pour être rédigée professionnellement :
           - NE PAS inventer de contenu générique.
           - À la place du texte du pitch, fournis un CONSEIL précis entre crochets pour aider le candidat à remplir cette partie.
           - Exemple : "[CONSEIL] Il manque une réussite chiffrée pour prouver votre impact. Mentionnez un projet où vous avez..."
        3. ⚠️ IMPORTANT : Rédige le texte en {target_lang}, mais CONSERVE STRICTEMENT les clés du JSON d'origine (accroche, preuve, valeur, projection, analysis). Ne les traduis pas.
        3. ⚠️ IMPORTANT : Rédige le texte en {target_lang}, mais CONSERVE STRICTEMENT les clés du JSON d'origine (accroche, preuve, valeur, projection, analysis). Ne les traduis pas.
        
        Génère le pitch en {target_lang}.
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction=f"You are a senior recruiter. Output STRICT JSON in {target_lang}.")
        await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        fallback = {"accroche": "Erreur", "preuve": "",

async def process_questions_in_background(task_id: str, candidate_data: dict):
    print(f"[Task {task_id}] ❓ Starting Questions (Async)...")
    await _run_questions_logic(task_id, candidate_data)

async def _run_questions_logic(task_id: str, candidate_data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(candidate_data.get('target_language', 'French'))
        
        # [FIX] Logique "Victor Hugo" : Extraction adresse et hobbies pour questions de curiosité
        p_info = candidate_data.get('personal_info', {})
        address = p_info.get('address', 'Inconnue')
        city = p_info.get('city', '')
        hobbies = candidate_data.get('interests', [])
        flaws = candidate_data.get('flaws', [])
        target_job = candidate_data.get('target_job', 'Poste visé')
        
        prompt = f"""
        Génère 10 questions d'entretien pour ce candidat.
        Langue de sortie : {target_lang}
        
        CONTEXTE CANDIDAT :
        Adresse Complète : {address}, {city}
        Hobbies : {hobbies}
        Défauts identifiés par le candidat : {flaws}
        Poste visé : {target_job}
        
        INSTRUCTIONS SPÉCIFIQUES :
        1. ANALYSE L'ADRESSE : Si la rue ou la ville porte le nom d'une personne célèbre (ex: Victor Hugo, Pasteur), pose une question de culture générale sur cette personne pour tester la curiosité. Si les hobbies sont fournis, base d'autres questions dessus. Si les hobbies sont vides, pose plutôt une question ouverte sur ses centres d'intérêt extra-professionnels.
        2. Inclus des questions classiques de recruteur (trous dans le CV, qualités/défauts).
        3. Pour CHAQUE question, fournis une 'suggested_answer' (une proposition de réponse complète et bien formulée à la première personne, basée sur les données du candidat) ET 'advice' (ce que le recruteur cherche à évaluer avec cette question).
           ⚠️ POSTURE DE COACH (ANTI-AUTO-SABOTAGE) : Si les données du candidat (notamment les 'flaws') contiennent des "red flags" (ex: "fainéant", "menteur", agressivité), utilise le champ 'advice' pour le recadrer fermement mais avec bienveillance. Explique-lui pourquoi il ne faut jamais formuler les choses ainsi en entretien, et utilise 'suggested_answer' pour lui proposer une reformulation positive et professionnelle (ex: transformer "fainéant" en "volonté d'automatiser pour éviter les tâches répétitives").
        4. LOGIQUE DÉFAUTS : Inclus SYSTEMATIQUEMENT la question : "Quels sont vos trois principaux défauts ?".
           Pour la 'suggested_answer' de cette question :
           - Tu DOIS sélectionner les 3 défauts les MOINS graves pour le poste de "{target_job}" PARMI la liste fournie : {flaws}.
           - Si la liste est vide, invente 3 "faux défauts" classiques (ex: Exigeant, Impatient).
           - Formule la réponse à la première personne, en montrant une conscience de soi et des efforts d'amélioration (ex: "Je suis parfois [défaut], mais je travaille dessus en...").
        
        FORMAT JSON STRICT ATTENDU :
        {{
            "questions": [
                {{
                    "category": "Curiosité" | "Parcours" | "Personnalité",
                    "question": "...",
                    "suggested_answer": "...",
                    "advice": "..."
                }}
            ]
        }}
        
        DONNÉES :
        {json.dumps(candidate_data, indent=2, ensure_ascii=False, default=str)}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are an expert interviewer. Output ONLY JSON. Language: {target_lang}.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_gap_analysis_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ⚖️ Starting Gap Analysis (Async)...")
    await _run_gap_analysis_logic(task_id, data)

async def _run_gap_analysis_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
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
        
        # [FIX] Nettoyage des données pour l'IA (Retrait de la photo Base64 lourde)
        clean_data = data.copy()
        if 'personal_info' in clean_data and isinstance(clean_data['personal_info'], dict):
            # On ne modifie pas le dictionnaire original imbriqué
            clean_data['personal_info'] = clean_data['personal_info'].copy()
            if 'photo' in clean_data['personal_info']:
                clean_data['personal_info']['photo'] = "[PHOTO_REMOVED_FOR_AI]"
        # Retrait d'autres champs lourds inutiles pour l'analyse
        if 'pitch_data' in clean_data: del clean_data['pitch_data']
        
        # [FIX] Prompt durci pour garantir les clés JSON attendues par le Frontend
        prompt = f"""
        Réalise une analyse d'écart (Gap Analysis) entre le candidat et le poste visé.
        {context_job}
        
        PROFIL CANDIDAT :
        {json.dumps(clean_data, indent=2, ensure_ascii=False, default=str)}
        
        FORMAT JSON STRICT ATTENDU (en {target_lang}) :
        {{
            "key_needs_from_job": ["Compétence clé 1", "Compétence clé 2", ...],
            "missing_gaps": ["Manque 1", "Manque 2", ...],
            "recommended_adjustments": ["Action concrète 1", "Action concrète 2", ...],
            "match_score": 0-100
        }}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction=f"You are a Career Coach. Output STRICT JSON in {target_lang}.")
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

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
        
        # [FIX] Nettoyage des données pour l'IA (Retrait de la photo Base64 lourde)
        clean_data = data.copy()
        if 'personal_info' in clean_data and isinstance(clean_data['personal_info'], dict):
            clean_data['personal_info'] = clean_data['personal_info'].copy()
            if 'photo' in clean_data['personal_info']:
                clean_data['personal_info']['photo'] = "[PHOTO_REMOVED_FOR_AI]"
        
        print(f"[Gap Analysis] Running for job: {target_job}...", flush=True)

        # [FIX] Prompt durci pour garantir les clés JSON attendues par le Frontend
        prompt = f"""
        Réalise une analyse d'écart (Gap Analysis) entre le candidat et le poste visé.
        {context_job}
        
        PROFIL CANDIDAT :
        {json.dumps(clean_data, indent=2, ensure_ascii=False, default=str)}
        
        FORMAT JSON STRICT ATTENDU (⚠️ Rédige le texte en {target_lang}, mais CONSERVE EXACTEMENT LES CLES EN ANGLAIS) :
        {{
            "key_needs_from_job": ["Compétence clé 1", "Compétence clé 2", ...],
            "missing_gaps": ["Manque 1", "Manque 2", ...],
            "recommended_adjustments": ["Action concrète 1", "Action concrète 2", ...],
            "match_score": 0-100
        }}
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
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        CIBLE ACTUELLE DU CANDIDAT (POUR ANCRER LES TRAJECTOIRES) :
        {target_context}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Career Strategist.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_recruiter_view_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕶️ Starting Recruiter View (Async)...")
    await _run_recruiter_view_logic(task_id, data)

async def _run_recruiter_view_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("recruiter_view.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        CANDIDAT :
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are an empathetic, strategic Career Coach. Help the candidate succeed.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_oneliner_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ⚡ Starting One-Liner (Async)...")
    await _run_oneliner_logic(task_id, data)

async def _run_oneliner_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        
        prompt = f"""
        Génère une 'One-Liner' percutante pour ce candidat.
        C'est une phrase unique, dense et mémorable qui résume le profil pour l'entête du CV.
        
        Format : "Titre/Rôle + Années d'expérience + Spécialité majeure + Valeur ajoutée/Soft skill dominant."
        Exemple : "Officier spécialisé en cyberdéfense avec 10 ans d’expérience dans les environnements critiques, orienté gestion du risque et leadership opérationnel."
        
        CANDIDAT :
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT STRICT JSON: {{ "one_liner": "..." }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="gemini", system_instruction="You are a Personal Branding Expert.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_risk_analysis_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🛡️ Starting Risk Analysis (Async)...")
    await _run_risk_analysis_logic(task_id, data)

async def _run_risk_analysis_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
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
        PROFIL : {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
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
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_job_decoder_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕵️ Starting Job Decoder (Async)...")
    await _run_job_decoder_logic(task_id, data)

async def _run_job_decoder_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
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
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Job Market Analyst.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_hidden_market_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🕸️ Starting Hidden Market Engine (Async)...")
    await _run_hidden_market_logic(task_id, data)

async def _run_hidden_market_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("hidden_market.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        PROFIL CANDIDAT :
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        CIBLE :
        Poste : {data.get('target_job', '')}
        Entreprise : {data.get('target_company', '')}
        Secteur : {data.get('target_industry', '')}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Networking Strategist.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_career_gps_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🧭 Starting Career GPS (Async)...")
    await _run_career_gps_logic(task_id, data)

async def _run_career_gps_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
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
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        DESTINATION SOUHAITÉE :
        {destination_context}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="openai", system_instruction="You are a Career Navigation System.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_reality_check_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🌟 Starting Reality Check (Async)...")
    await _run_reality_check_logic(task_id, data)

async def _run_reality_check_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        prompt_template = load_prompt(get_prompt_path("career_reality_check.md"))
        
        final_prompt = f"""
        {prompt_template}
        
        CANDIDAT :
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        OUTPUT LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(final_prompt, provider="gemini", system_instruction="You are a Personal Branding Expert.")
        
        if "error" in result:
            await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", result)
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_profile_validation_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] 🛡️ Starting Profile Validation (Async)...")
    await _run_profile_validation_logic(task_id, data)

async def _run_profile_validation_logic(task_id: str, data: dict):
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
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
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}

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
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

async def process_flaw_coaching_in_background(task_id: str, data: dict):
    print(f"[Task {task_id}] ✨ Starting Flaw Coaching (Async)...")
    await asyncio.to_thread(update_task_status_sync, task_id, "RUNNING")
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        flaws = data.get('flaws', [])
        if not flaws:
            # Pas de défauts renseignés, on valide la tâche vide
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", {"coaching": []})
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
        else:
            await asyncio.to_thread(update_task_status_sync, task_id, "SUCCESS", result)
    except Exception as e:
        await asyncio.to_thread(update_task_status_sync, task_id, "FAILED", {"error": str(e)})

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
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        POSTE VISÉ : {target_role}
        
        ATTENTES :
        1. "one_liner_result" : Une phrase unique, dense et mémorable résumant le profil (Titre + Expérience + Valeur).
        2. "career_radar_result" : Analyse de la trajectoire (risques, opportunités, cohérence).
        3. "recruiter_view_result" : L'avis impitoyable d'un DRH (red flags, points rassurants, probabilité d'entretien sur 100, et un conseil "brutal_truth"). Ignore les erreurs de frappe du brouillon.
        
        OUTPUT STRICT JSON (Conserve exactement ces clés en anglais):
        {{
            "one_liner_result": {{ "one_liner": "..." }},
            "career_radar_result": {{ "analysis": "...", "opportunities": ["..."] }},
            "recruiter_view_result": {{
                "recruiter_persona": {{
                    "first_impression": "...", "red_flags": ["..."], "reassurance_points": ["..."],
                    "interview_probability": 80, "verdict": "Convoquer", "brutal_truth": "..."
                }}
            }}
        }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are an Executive Profiler.")
        
        if "error" in result:
            raise Exception(result["error"])
            
        # 2. On dispatche intelligemment les résultats vers les bonnes tâches Frontend
        if "one_liner" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["one_liner"], "SUCCESS", result.get("one_liner_result", {}))
        if "career_radar" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["career_radar"], "SUCCESS", result.get("career_radar_result", {}))
        if "recruiter_view" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["recruiter_view"], "SUCCESS", result.get("recruiter_view_result", {}))
        
    except Exception as e:
        for tid in task_ids.values():
            await asyncio.to_thread(update_task_status_sync, tid, "FAILED", {"error": str(e)})

async def process_market_strategy_in_background(task_ids: dict, data: dict):
    """
    FUSION OPTIMISÉE: Traite Job Decoder, Risk Analysis et Hidden Market en 1 seul appel IA.
    """
    print(f"[Tasks] 🚀 Starting Unified Market Strategy...")
    
    # 1. On passe les 3 tâches en RUNNING
    for tid in task_ids.values():
        await asyncio.to_thread(update_task_status_sync, tid, "RUNNING")
        
    try:
        target_lang = normalize_language(data.get('target_language', 'French'))
        target_role = data.get('target_role_primary') or data.get('target_job') or 'Non défini'
        target_company = data.get('target_company', 'Non spécifiée')
        target_industry = data.get('target_industry', 'Non spécifié')
        job_desc = data.get('job_description', 'Non fournie')
        
        prompt = f"""
        Tu es un Consultant Stratégique en Carrière de haut niveau.
        Ta mission est d'analyser le poste visé et le profil du candidat sous 3 angles différents, et de renvoyer un JSON unique.
        
        PROFIL CANDIDAT :
        {json.dumps(data, indent=2, ensure_ascii=False, default=str)}
        
        CIBLE :
        Poste : {target_role}
        Entreprise : {target_company}
        Secteur : {target_industry}
        Description de l'offre : {job_desc}
        
        ATTENTES :
        1. "job_decoder_result" : Décoder l'offre d'emploi (les vrais besoins cachés derrière le jargon).
        2. "risk_analysis_result" : Évaluer les risques (surqualification, drapeaux rouges dans l'offre, stabilité).
        3. "hidden_market_result" : Stratégie réseau pour contourner les candidatures classiques (marché caché).
        
        OUTPUT STRICT JSON (Conserve exactement ces clés en anglais):
        {{
            "job_decoder_result": {{ "decoded_analysis": "...", "hidden_requirements": ["..."] }},
            "risk_analysis_result": {{
                "overall_risk_level": "Low" | "Medium" | "High",
                "warnings": ["..."],
                "positive_signals": ["..."],
                "advice": "..."
            }},
            "hidden_market_result": {{ "networking_strategy": "...", "target_profiles": ["..."] }}
        }}
        LANGUAGE: {target_lang}
        """
        
        result = await ai_service.generate_valid_json(prompt, provider="openai", system_instruction="You are a Strategic Career Advisor.")
        
        if "error" in result:
            raise Exception(result["error"])
            
        # 2. On dispatche les résultats vers les tâches du Frontend
        if "job_decoder" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["job_decoder"], "SUCCESS", result.get("job_decoder_result", {}))
        if "risk_analysis" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["risk_analysis"], "SUCCESS", result.get("risk_analysis_result", {}))
        if "hidden_market" in task_ids: await asyncio.to_thread(update_task_status_sync, task_ids["hidden_market"], "SUCCESS", result.get("hidden_market_result", {}))
        
    except Exception as e:
        for tid in task_ids.values():
            await asyncio.to_thread(update_task_status_sync, tid, "FAILED", {"error": str(e)})
