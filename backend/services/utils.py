import os
import json
import re

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

def clean_ai_json_response(response_text: str):
    """Cleans and parses JSON from AI, removing markdown code blocks."""
    try:
        if not response_text:
            return {}
            
        # 0. Nettoyage préventif des balises markdown qui rendent le JSON invalide
        clean_text = response_text.replace("```json", "").replace("```", "").strip()

        # 1. Tentative d'extraction par Regex 
        # [ROBUSTESSE] Supporte les objets {} et les tableaux []
        match = re.search(r'(\{.*\}|\[.*\])', clean_text, re.DOTALL)
        if not match:
            print("[CLEANING] No explicit JSON block found, attempting to parse raw text...")
        if match:
            json_str = match.group(0)
        else:
            # Fallback : nettoyage basique si pas d'accolades trouvées
            json_str = clean_text
        
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