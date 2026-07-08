import os
import json
import re
import hashlib
from datetime import datetime
import asyncio
from fastapi import HTTPException
from database import db

from asyncio import Lock
_CACHE_LOCKS = {}

def load_prompt(filename: str) -> str:
    """Helper to load prompts from the ai/prompts directory."""
    try:
        current_dir = os.path.dirname(__file__)
        backend_dir = os.path.dirname(current_dir)
        prompt_path = os.path.join(backend_dir, "ai", "prompts", filename)
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"[TASK ERROR] Could not load prompt {filename}: {e}")
        return ""

async def consume_credit(user_id: str, cost: int = 1):
    """
    Vérifie le solde de crédits, le recharge si nécessaire, puis le décrémente.
    Lève une HTTPException si le solde après recharge est toujours insuffisant.
    """
    async with db.get_connection() as conn:
        # Utilisation d'un verrou pour cet utilisateur afin d'éviter les race conditions
        user_lock_key = f"credit_{user_id}"
        if user_lock_key not in _CACHE_LOCKS:
            _CACHE_LOCKS[user_lock_key] = asyncio.Lock()
        
        async with _CACHE_LOCKS[user_lock_key]:
            cursor = await db.execute(conn, "SELECT credits FROM users WHERE id = ?", (user_id,))
            user_data = await cursor.fetchone()

            if not user_data:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable pour la gestion des crédits.")

            current_credits = user_data[0] if isinstance(user_data, tuple) else user_data.get('credits')
            if current_credits is None:
                current_credits = 0

            # Si le solde est insuffisant, on recharge
            if current_credits < cost:
                await db.execute(conn, "UPDATE users SET credits = credits + 60, updated_at = ? WHERE id = ?", (datetime.now(), user_id))
                current_credits += 60 # Mettre à jour le solde local pour la vérification finale

            # Vérification finale après une éventuelle recharge
            if current_credits < cost:
                 # Ce cas ne devrait pas arriver si la recharge est suffisante
                raise HTTPException(status_code=402, detail=f"Crédits insuffisants même après recharge. (Solde: {current_credits}, Requis: {cost}).")

            # Décrémenter le coût de l'action
            await db.execute(conn, "UPDATE users SET credits = credits - ?, updated_at = ? WHERE id = ?", (cost, datetime.now(), user_id))
    return True

async def refund_credit(user_id: str, cost: int = 1):
    """Rembourse des crédits à un utilisateur."""
    try:
        async with db.get_connection() as conn:
            await db.execute(conn, "UPDATE users SET credits = credits + ? WHERE id = ?", (cost, user_id))
    except Exception as e:
        print(f"[DB WARNING] Refund credit failed for {user_id}: {e}")

async def update_user_total_cost(user_id: str, cost: float):
    """
    [NOUVEAU] Ajoute le coût d'une génération au coût total de l'utilisateur.
    """
    if not user_id or cost is None or cost <= 0:
        return
    try:
        async with db.get_connection() as conn:
            # Utilise COALESCE pour se protéger d'une valeur NULL initiale dans la colonne total_ia_cost
            await db.execute(
                conn,
                "UPDATE users SET total_ia_cost = COALESCE(total_ia_cost, 0.0) + ? WHERE id = ?",
                (cost, user_id)
            )
    except Exception as e:
        print(f"[DB WARNING] Failed to update total_ia_cost for user {user_id}: {e}")

def clean_ai_json_response(response_text: str):
    """Cleans and parses JSON from AI, removing markdown code blocks."""
    try:
        if not response_text:
            return {}
            
        # [FIX EXPERT] Suppression du .replace() global qui corrompait les données si le candidat
        # avait lui-même du markdown dans son texte. L'extraction par index (O(n)) suffit amplement.
        first_brace, last_brace = response_text.find('{'), response_text.rfind('}')
        first_bracket, last_bracket = response_text.find('['), response_text.rfind(']')
        
        # On prend le bloc le plus large (objet ou tableau) pour ignorer le blabla avant et après
        if first_brace != -1 and last_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            json_str = response_text[first_brace:last_brace+1]
        elif first_bracket != -1 and last_bracket != -1:
            json_str = response_text[first_bracket:last_bracket+1]
        else:
            json_str = response_text.strip()
        
        # 2. Parsing
        return json.loads(json_str)
    except json.JSONDecodeError:
        print(f"[JSON ERROR] Could not parse AI response: {response_text[:100]}...")
        return {"error": "Invalid JSON format from AI", "raw_text": response_text[:500]}
    except Exception as e:
        return {"error": f"Parsing error: {str(e)}"}

def normalize_language(lang_code: str) -> str:
    """Convertit les codes ISO (fr, en) en noms complets (French, English) pour l'IA."""
    lang_map = {
        'fr': 'French', 'en': 'English', 'es': 'Spanish',
        'de': 'German', 'it': 'Italian', 'pt': 'Portuguese',
        'zh': 'Chinese', 'ja': 'Japanese', 'ru': 'Russian', 'ar': 'Arabic'
    }
    if not lang_code:
        return 'English'
    code = str(lang_code).lower()[:2]
    return lang_map.get(code, 'English')

def _get_sortable_date_tuple(date_str: str) -> tuple:
    """Converts a variety of date strings into a sortable tuple (year, month)."""
    if not isinstance(date_str, str):
        return (0, 0)
    date_str_lower = date_str.lower().strip()
    
    present_terms = ["present", "aujourd'hui", "en cours", "current", "heute", "actual", "à ce jour", "jusqu'à présent", "now", "présent"]
    if any(term in date_str_lower for term in present_terms):
        return (datetime.max.year, datetime.max.month)

    year_match = re.search(r'\b(19[89]\d|20\d{2})\b', date_str)
    year = int(year_match.group(0)) if year_match else 0
    if not year: return (0, 0)

    numeric_month_match = re.search(r'(?P<y1>\d{4})[/-](?P<m1>\d{1,2})|(?P<m2>\d{1,2})[/-](?P<y2>\d{4})', date_str)
    if numeric_month_match:
        groups = numeric_month_match.groupdict()
        month = int(groups.get('m1') or groups.get('m2'))
        if 1 <= month <= 12: return (year, month)

    month_map = {
        'january': 1, 'janvier': 1, 'jan': 1, 'janv': 1, 'february': 2, 'février': 2, 'feb': 2, 'fév': 2, 'fev': 2,
        'march': 3, 'mars': 3, 'mar': 3, 'april': 4, 'avril': 4, 'apr': 4, 'avr': 4, 'may': 5, 'mai': 5,
        'june': 6, 'juin': 6, 'jun': 6, 'july': 7, 'juillet': 7, 'jul': 7, 'juil': 7, 'august': 8, 'août': 8, 'aug': 8, 'aou': 8,
        'september': 9, 'septembre': 9, 'sep': 9, 'october': 10, 'octobre': 10, 'oct': 10,
        'november': 11, 'novembre': 11, 'nov': 11, 'december': 12, 'décembre': 12, 'dec': 12, 'déc': 12
    }
    for month_str, month_num in month_map.items():
        if month_str in date_str_lower: return (year, month_num)

    quarter_match = re.search(r'[qt]([1-4])', date_str_lower)
    if quarter_match: return (year, int(quarter_match.group(1)) * 3)

    season_map = {'winter': 2, 'hiver': 2, 'spring': 5, 'printemps': 5, 'summer': 8, 'été': 8, 'autumn': 11, 'automne': 11}
    for season_str, month_num in season_map.items():
        if season_str in date_str_lower: return (year, month_num)

    return (year, 0)

def _sanitize_data_for_ai(data: dict, strict: bool = False) -> dict:
    """Supprime les données lourdes et inutiles pour l'IA pour économiser tokens et stabiliser le hash."""
    clean_data = json.loads(json.dumps(data, default=str)) if isinstance(data, dict) else {}
        
    if strict:
        # WHITELIST : On ne conserve QUE les clés qui impactent la génération IA et le CV
        allowed_keys = {
            'personal_info', 'experiences', 'educations', 'projects', 'skills', 
            'languages', 'interests', 'flaws', 'clarifications', 'bio', 
            'work_style', 'relational_style', 'professional_approach', 'free_text',
            'job_description', 'remote_preference', 'interview_date', 'interview_format',
            'interview_type', 'available_time', 'stress_level', 'seniority_level',
            'current_situation', 'salary_expectations', 'coaching_style'
        }
        clean_data = {k: v for k, v in clean_data.items() if k in allowed_keys}
        
    if 'personal_info' in clean_data and isinstance(clean_data['personal_info'], dict):
        if strict:
            for key in ['email', 'phone', 'address', 'linkedin', 'city']:
                clean_data['personal_info'].pop(key, None)
            # Remove any id or ui_ keys from personal_info
            keys_to_remove = [k for k in clean_data['personal_info'].keys() if k in ['id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'] or k.startswith('ui_') or k.startswith('is')]
            for k in keys_to_remove:
                clean_data['personal_info'].pop(k, None)
                
    if strict:
        # [OPTIMISATION TOKENS] Limitation stricte de la taille des textes libres
        if 'free_text' in clean_data and isinstance(clean_data['free_text'], str):
            clean_data['free_text'] = clean_data['free_text'][:3000]
        if 'job_description' in clean_data and isinstance(clean_data['job_description'], str):
            clean_data['job_description'] = clean_data['job_description'][:5000]
        if 'bio' in clean_data and isinstance(clean_data['bio'], str):
            clean_data['bio'] = clean_data['bio'][:1500]

        # Purge des listes : suppression des IDs aléatoires qui cassent la signature du cache
        for list_key in ['experiences', 'educations', 'projects', 'skills', 'languages', 'clarifications', 'work_style', 'relational_style', 'professional_approach', 'interests', 'flaws']:
            if list_key in clean_data and isinstance(clean_data[list_key], list):
                clean_list = []
                for item in clean_data[list_key]:
                    if isinstance(item, dict):
                        item_copy = item.copy()
                        # Nettoyage profond des états de l'UI (isEditing, etc.) et IDs
                        keys_to_remove = [k for k in item_copy.keys() if k in ['id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'] or k.startswith('ui_') or k.startswith('is')]
                        for k in keys_to_remove:
                            item_copy.pop(k, None)
                            
                        # [OPTIMISATION TOKENS] Limitation de la taille des descriptions internes
                        if 'description' in item_copy and isinstance(item_copy['description'], str):
                            item_copy['description'] = item_copy['description'][:2000]
                        if 'bullets' in item_copy and isinstance(item_copy['bullets'], list):
                            item_copy['bullets'] = [str(b)[:500] for b in item_copy['bullets']]
                        clean_list.append(item_copy)
                    else:
                        clean_list.append(item)
                
                # [FIX EXPERT] Tri des listes pour garantir un hash 100% déterministe
                try:
                    if list_key in ['experiences', 'educations']:
                        clean_list.sort(key=lambda x: (
                            _get_sortable_date_tuple((x.get('end_date') or x.get('endDate') or x.get('date') or '') if isinstance(x, dict) else ''),
                            str(x.get('title', x.get('role', '')) if isinstance(x, dict) else '').strip().lower()
                        ), reverse=True)
                    elif list_key == 'clarifications':
                        # On ne conserve dans le hash QUE les questions où l'utilisateur a donné une réponse
                        clean_list = [c for c in clean_list if isinstance(c, dict) and c.get('answer')]
                        clean_list.sort(key=lambda x: str(x.get('question', '') if isinstance(x, dict) else '').strip().lower())
                    elif list_key in ['skills', 'languages', 'projects', 'interests', 'flaws', 'work_style', 'relational_style', 'professional_approach']:
                        clean_list.sort(key=lambda x: json.dumps(x, sort_keys=True).lower() if isinstance(x, dict) else str(x).strip().lower())
                except Exception:
                    pass
                clean_data[list_key] = clean_list
            
    return clean_data

def _generate_cache_key(user_id: str, content_type: str, data: dict) -> str:
    """Génère une signature unique (hash) pour mettre en cache les requêtes IA identiques."""
    clean_data = _sanitize_data_for_ai(data, strict=True)
    
    # Paramètres discriminants vitaux (récupérés depuis data car exclus de clean_data pour isoler le CV pur)
    lang = normalize_language(data.get('target_language', data.get('language', 'fr'))).lower()
    job = str(data.get('target_job', data.get('target_role_primary', ''))).strip().lower()
    company = str(data.get('target_company', '')).strip().lower()
    industry = str(data.get('target_industry', '')).strip().lower()
    country = str(data.get('target_country', '')).strip().lower()
    
    data_str = json.dumps(clean_data, sort_keys=True, default=str)
    raw_key = f"{user_id}_{content_type}_{lang}_{job}_{company}_{industry}_{country}_{data_str}"
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

async def get_cached_content(cache_key: str):
    """Récupère le contenu généré en cache s'il existe."""
    try:
        async with db.get_connection() as conn:
            cursor = await db.execute(conn, "SELECT result FROM generation_cache WHERE cache_key = ?", (cache_key,))
            row = await cursor.fetchone()
            if row:
                result = row[0] if isinstance(row, tuple) else row.get("result")
                if isinstance(result, str):
                    try: return json.loads(result)
                    except Exception: return result
                return result
    except Exception as e:
        print(f"[CACHE ERROR] Impossible de lire le cache: {e}")
    return None

async def set_cached_content(cache_key: str, user_id: str, content_type: str, result: any):
    """Sauvegarde le résultat généré en cache."""
    # [FIX EXPERT] Défense : Ne jamais tenter d'insérer en base si la clé de cache est None
    if not cache_key:
        print(f"[CACHE WARNING] Impossible de sauvegarder '{content_type}' : cache_key est nulle.", flush=True)
        return
        
    try:
        async with db.get_connection() as conn:
            result_str = json.dumps(result, default=str)
            await db.execute(conn, """
                INSERT INTO generation_cache (cache_key, user_id, content_type, result, created_at)
                VALUES (?, ?, ?, ?::jsonb, ?)
                ON CONFLICT (cache_key) DO UPDATE SET result = EXCLUDED.result, created_at = EXCLUDED.created_at
            """, (cache_key, user_id, content_type, result_str, datetime.now()))
    except Exception as e:
        print(f"[CACHE ERROR] Impossible de sauvegarder dans le cache: {e}")