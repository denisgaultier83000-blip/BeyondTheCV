import os
import asyncio
import random
from dotenv import load_dotenv
import json

try:
    from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential
except ImportError:
    AsyncRetrying = None
    print("[AI WARNING] 'tenacity' library not found. Auto-retry for JSON is disabled.", flush=True)

# Chargement des variables d'environnement
load_dotenv()

# Imports robustes pour éviter les crashs si les dépendances manquent
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    print("[AI WARNING] 'google-genai' library not found. Gemini will be disabled.", flush=True)

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None
    print("[AI WARNING] 'openai' library not found. OpenAI will be disabled.", flush=True)

class AIGenerator:
    def __init__(self):
        # Configuration OpenAI
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_client = None
        if self.openai_api_key and AsyncOpenAI:
            self.openai_client = AsyncOpenAI(api_key=self.openai_api_key)

        # Configuration Gemini
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = None
        if self.gemini_api_key and genai:
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                # [REVERT] Exécution stricte au démarrage (Lancement de l'algorithme)
                self.gemini_model_name = self._resolve_best_gemini_model()
            except Exception as e:
                print(f"[AI ERROR] Failed to initialize Gemini client: {e}", flush=True)
                self.gemini_model_name = None

        # Modèle par défaut
        self.default_provider = os.getenv("DEFAULT_AI_PROVIDER", "gemini")

        # [CRITIQUE] Régulateur de trafic (Sémaphore)
        # Empêche de lancer 14 requêtes simultanées et d'exploser le "Rate Limit" (429) des APIs.
        self.semaphore = asyncio.Semaphore(4) # 4 tâches IA maximum en parallèle

    def _resolve_best_gemini_model(self):
        """
        Algorithme d'Intersection Sécurisée : Vérifie la disponibilité réelle 
        sur l'API sans sacrifier le contrôle des coûts et de la qualité.
        """
        if not self.gemini_client:
            return None

        print("[AI INIT] 📡 Discovery: Querying available Gemini models...", flush=True)
        
        # 🎯 NOTRE STRATÉGIE (Par ordre de préférence strict)
        PREFERENCE_ORDER = [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro",
            "gemini-pro"
        ]

        try:
            # 1. Requête dynamique pour récupérer la liste des modèles actifs
            available_models = list(self.gemini_client.models.list())
            
            # 2. Extraction sécurisée (Fix de compatibilité SDK)
            available_model_names = [m.name.replace("models/", "") for m in available_models]

            # 3. Matching avec notre préférence
            for pref in PREFERENCE_ORDER:
                matches = [m for m in available_model_names if pref in m]
                if matches:
                    selected = matches[0]
                    print(f"[AI INIT] ✅ SELECTED BEST MODEL: {selected}", flush=True)
                    return selected
            
            # 4. Fallback ultime si rien ne matche
            print("[AI INIT] ⚠️ No preferred model found. Fallback to 'gemini-1.5-flash'.", flush=True)
            return "gemini-1.5-flash"
            
        except Exception as e:
            # 5. Résilience ultime : Si l'endpoint plante
            print(f"[AI INIT] ❌ Model discovery failed: {e}. Defaulting to 'gemini-1.5-flash'.", flush=True)
            return "gemini-1.5-flash"
            

    async def _get_openai_model(self) -> str:
        """
        Algorithme d'Intersection Sécurisée pour OpenAI (Lazy Loading).
        Mis en cache après le premier appel pour ne pas ralentir l'application.
        """
        if hasattr(self, '_cached_openai_model'):
            return self._cached_openai_model

        if not self.openai_client:
            return "gpt-4o-mini"

        print("[AI INIT] 📡 Discovery: Querying available OpenAI models...", flush=True)
        PREFERRED_MODELS = [
            "gpt-4o",
            "gpt-4-turbo",
            "gpt-4o-mini",
            "gpt-3.5-turbo"
        ]

        try:
            model_list = await self.openai_client.models.list()
            available_model_ids = [m.id for m in model_list.data]
            
            for model in PREFERRED_MODELS:
                if model in available_model_ids:
                    print(f"[AI INIT] ✅ SELECTED BEST OPENAI MODEL: {model}", flush=True)
                    self._cached_openai_model = model
                    return model
                    
            print("[AI INIT] ⚠️ No preferred OpenAI model found. Fallback to gpt-4o-mini.", flush=True)
            self._cached_openai_model = "gpt-4o-mini"
            return "gpt-4o-mini"
            
        except Exception as e:
            print(f"[AI INIT] ❌ OpenAI Discovery failed: {e}. Defaulting to gpt-4o-mini.", flush=True)
            self._cached_openai_model = "gpt-4o-mini"
            return "gpt-4o-mini"

    async def generate(self, prompt: str, provider: str = None, system_instruction: str = None) -> str:
        """
        Fonction unique pour appeler l'IA.
        :param prompt: Le texte à envoyer.
        :param provider: 'openai' ou 'gemini'. Si None, utilise le défaut.
        :param system_instruction: Instruction système (ex: "Tu es un expert RH").
        """
        # Si un provider est forcé, on filtre la liste, sinon on prend tout l'ordre de priorité
        
        # Logique simplifiée et robuste : on utilise le modèle résolu au démarrage
        target_provider = provider or self.default_provider
        fallback_provider = "openai" if target_provider == "gemini" else "gemini"

        # Le sémaphore met les requêtes excédentaires en file d'attente au lieu de spammer l'API
        async with self.semaphore:
            try:
                return await self._execute_provider(target_provider, prompt, system_instruction)
                    
            except Exception as e:
                error_msg = str(e).lower()
                
                # 🔄 SYSTÈME DE FALLBACK AUTOMATIQUE GLOBAL
                print(f"[AI] ⚠️ {target_provider.capitalize()} a échoué ({str(e)}). Auto-fallback vers {fallback_provider}...", flush=True)
                try:
                    return await self._execute_provider(fallback_provider, prompt, system_instruction)
                except Exception as fallback_e:
                    msg = f"Both providers failed. Primary: {str(e)} | Fallback: {str(fallback_e)}"
                    print(f"[AI] 💀 FATAL: {msg}", flush=True)
                    # On ajoute un type pour que generate_valid_json ne boucle pas
                    return json.dumps({"error": msg, "type": "api_error"})

    async def generate_valid_json(self, prompt: str, provider: str = None, system_instruction: str = None) -> dict:
        """
        Appelle l'IA et garantit une sortie JSON valide. 
        En cas d'erreur de parsing, relance l'IA avec un message de correction via Tenacity.
        """
        from .utils import clean_ai_json_response
        
        if not AsyncRetrying:
            res_str = await self.generate(prompt, provider, system_instruction)
            return clean_ai_json_response(res_str)
            
        current_prompt = prompt
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3), # 3 tentatives max
            wait=wait_exponential(multiplier=1, min=2, max=10), # Backoff exponentiel (2s, 4s, 8s...)
            reraise=True
        ):
            with attempt:
                res_str = await self.generate(current_prompt, provider, system_instruction)
                parsed = clean_ai_json_response(res_str)
                if "error" in parsed:
                    if parsed.get("type") == "api_error":
                        # C'est une erreur d'API (Timeout/Quota), l'IA ne peut pas corriger ça.
                        return parsed
                        
                    # On informe l'IA de son erreur exacte pour qu'elle s'auto-corrige
                    current_prompt = prompt + f"\n\n⚠️ ATTENTION : Ta réponse précédente n'était pas un JSON valide.\nErreur retournée : {parsed['error']}\nExtrait de ce que tu as envoyé : {res_str[:150]}...\nMerci de CORRIGER ce format et de retourner STRICTEMENT un JSON valide."
                    print(f"[AI RETRY] JSON invalide détecté. Tentative de correction en cours...", flush=True)
                    raise ValueError(f"Invalid JSON from AI: {parsed['error']}")
                return parsed

    async def _execute_provider(self, target_provider: str, prompt: str, system_instruction: str) -> str:
        """Exécute l'appel vers le provider spécifique de manière isolée."""
        if target_provider == "openai":
            if not self.openai_client:
                raise ValueError("OpenAI client not configured (Missing API Key).")
            model_name = await self._get_openai_model()
            return await self._attempt_call(self._call_openai, model_name, prompt, system_instruction)
            
        elif target_provider == "gemini":
            if not self.gemini_client:
                raise ValueError("Gemini client not configured (Missing API Key).")
            if not self.gemini_model_name:
                raise ValueError("Gemini initialized but no model found during discovery.")
            return await self._attempt_call(self._call_gemini, self.gemini_model_name, prompt, system_instruction)
            
        raise ValueError(f"Provider '{target_provider}' is unknown or not supported.")

    async def _attempt_call(self, func, model_name, *args, **kwargs):
        """Exécute une fonction d'appel IA avec retries pour les erreurs transitoires."""
        max_retries = 1
        base_delay = 1.0
        
        for attempt in range(max_retries + 1):
            try:
                # [CIRCUIT BREAKER] Timeout réduit à 30s pour déclencher le fallback plus rapidement
                return await asyncio.wait_for(func(*args, model=model_name, **kwargs), timeout=30.0)
            except asyncio.TimeoutError:
                print(f"[AI] ⏱️ Timeout (30s) sur {model_name}. Le provider bloque.", flush=True)
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.5)
                    print(f"[AI] ⏳ Retry après Timeout dans {delay:.1f}s...", flush=True)
                    await asyncio.sleep(delay)
                else:
                    raise TimeoutError(f"Le provider AI a fait Timeout après {max_retries + 1} tentatives.")
            except Exception as e:
                error_msg = str(e).lower()
                
                # 1. Erreurs Fatales (Ne pas réessayer, passer au modèle suivant)
                if "404" in error_msg or "not found" in error_msg: # Modèle inexistant
                    raise e 
                if "400" in error_msg or "invalid argument" in error_msg: # Requête invalide
                    raise e
                if "401" in error_msg or "unauthenticated" in error_msg: # Clé invalide
                    raise e

                # 2. Erreurs Transitoires (Réessayer le même modèle)
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.5) # Jitter
                    print(f"[AI] ⏳ Transient error ({model_name}). Retrying in {delay:.1f}s...", flush=True)
                    await asyncio.sleep(delay)
                else:
                    raise e # Épuisement des retries

    async def _call_openai(self, prompt, system_instruction, model="gpt-4-turbo"):
        if not self.openai_client:
            raise ValueError("Clé OpenAI non configurée.")
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content

    async def _call_gemini(self, prompt, system_instruction, model="gemini-1.5-flash"):
        if not self.gemini_client:
            raise ValueError("Clé Gemini non configurée.")
        
        # Gemini gère les instructions système à l'initialisation du modèle ou dans le prompt
        # print(f"[AI] Using Gemini model: {model}", flush=True)
        
        config = None
        if system_instruction:
            config = types.GenerateContentConfig(system_instruction=system_instruction)

        # [FIX] Utilisation de l'API asynchrone native du nouveau SDK (aio)
        # Évite les deadlocks de threads causés par le client HTTPX synchrone sous-jacent
        response = await self.gemini_client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        return response.text

# Instance singleton pour être importée ailleurs
ai_service = AIGenerator()
