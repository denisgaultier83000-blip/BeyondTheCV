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
                self.gemini_model_name = None # [FIX] Sera résolu de manière asynchrone
            except Exception as e:
                print(f"[AI ERROR] Failed to initialize Gemini client: {e}", flush=True)
                self.gemini_model_name = None

        # Modèle par défaut
        self.default_provider = os.getenv("DEFAULT_AI_PROVIDER", "gemini")
        self.max_concurrent_requests = int(os.getenv("AI_MAX_CONCURRENT_REQUESTS", "3"))

        # [FIX] Sémaphore reporté au runtime pour éviter le crash "No event loop" (Python 3.10+)
        self._semaphore = None
        
        # [CIRCUIT BREAKER] Gestion globale des pannes de providers
        self.provider_failures = {"gemini": 0, "openai": 0}
        self.circuit_breaker_threshold = 2

    def _resolve_best_gemini_model(self):
        """Sélection du meilleur modèle avec découverte automatique ou fallback."""
        if self.gemini_client:
            try:
                models = list(self.gemini_client.models.list())
                for m in models:
                    name = m.name.replace("models/", "")
                    if "flash" in name and "embedding" not in name:
                        # Préférer les versions 2.x
                        if "2.5" in name: return "gemini-2.5-flash"
                        if "2.0" in name: return "gemini-2.0-flash"
                        return name
            except Exception as e:
                print(f"[AI WARNING] Discovery failed: {e}. Fallback to default.", flush=True)
        return "gemini-2.0-flash"
            
    async def _get_gemini_model(self) -> str:
        if self.gemini_model_name:
            return self.gemini_model_name
        
        # Délègue la requête API synchrone à un pool de threads système
        self.gemini_model_name = await asyncio.to_thread(self._resolve_best_gemini_model)
        return self.gemini_model_name

    async def _get_openai_model(self) -> str:
        """Sélection directe du modèle OpenAI."""
        return "gpt-4o-mini"

    async def generate(self, prompt: str, provider: str = None, system_instruction: str = None, bypass_queue: bool = False, json_mode: bool = False) -> str:
        """
        Fonction unique pour appeler l'IA.
        :param prompt: Le texte à envoyer.
        :param provider: 'openai' ou 'gemini'. Si None, utilise le défaut.
        :param system_instruction: Instruction système (ex: "Tu es un expert RH").
        :param bypass_queue: Si True, contourne le sémaphore global pour une exécution immédiate.
        :param json_mode: Si True, force le provider à renvoyer un objet JSON strict.
        """
        # Logique simplifiée et robuste : on utilise le modèle résolu au démarrage
        target_provider = provider or self.default_provider
        
        # [CIRCUIT BREAKER] Auto-switch si le provider par défaut est hors-service
        if not provider and self.provider_failures.get(target_provider, 0) >= self.circuit_breaker_threshold:
            fallback = "openai" if target_provider == "gemini" else "gemini"
            print(f"[AI CIRCUIT BREAKER] {target_provider} est ignoré suite à de multiples échecs. Routage direct vers {fallback}.", flush=True)
            target_provider = fallback
            
        fallback_provider = "openai" if target_provider == "gemini" else "gemini"

        # Initialisation Lazy du Sémaphore (Garanti dans l'Event Loop)
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self.max_concurrent_requests)

        async def _run():
            try:
                res = await self._execute_provider(target_provider, prompt, system_instruction, json_mode=json_mode, bypass_queue=bypass_queue)
                self.provider_failures[target_provider] = max(0, self.provider_failures[target_provider] - 1)
                return res
                    
            except Exception as e:
                
                self.provider_failures[target_provider] += 1
                # 🔄 SYSTÈME DE FALLBACK AUTOMATIQUE GLOBAL
                print(f"[AI] ⚠️ {target_provider.capitalize()} a échoué ({str(e)}). Auto-fallback vers {fallback_provider}...", flush=True)
                try:
                    res = await self._execute_provider(fallback_provider, prompt, system_instruction, json_mode=json_mode, bypass_queue=bypass_queue)
                    self.provider_failures[fallback_provider] = max(0, self.provider_failures[fallback_provider] - 1)
                    return res
                except Exception as fallback_e:
                    self.provider_failures[fallback_provider] += 1
                    msg = f"Both providers failed. Primary: {e!r} | Fallback: {fallback_e!r}"
                    print(f"[AI] 💀 FATAL: {msg}", flush=True)
                    raise RuntimeError(msg)

        # L'acquisition du sémaphore est déléguée au plus près de l'appel réseau 
        # pour éviter les deadlocks (starvation) pendant les retry/sleeps.
        return await _run()

    async def generate_valid_json(self, prompt: str, provider: str = None, system_instruction: str = None, bypass_queue: bool = False) -> dict:
        """
        Appelle l'IA et garantit une sortie JSON valide. 
        En cas d'erreur de parsing, relance l'IA avec un message de correction via Tenacity.
        """
        from .utils import clean_ai_json_response
        
        # [FIX] Force l'IA à ne pas utiliser de Markdown dans les réponses JSON pour éviter les **xxxx** à l'affichage
        prompt = prompt + "\n\n⚠️ CRITICAL INSTRUCTION: DO NOT use any markdown formatting (like **bold** or *italic*) inside the JSON values. Return raw, unformatted plain text only."
        
        if not AsyncRetrying:
            try:
                res_str = await self.generate(prompt, provider, system_instruction, bypass_queue, json_mode=True)
                return clean_ai_json_response(res_str)
            except Exception as e:
                return {"error": str(e), "type": "api_error"}
            
        current_prompt = prompt
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3), # 3 tentatives max
            wait=wait_exponential(multiplier=1, min=2, max=10), # Backoff exponentiel (2s, 4s, 8s...)
            reraise=True
        ):
            with attempt:
                try:
                    res_str = await self.generate(current_prompt, provider, system_instruction, bypass_queue, json_mode=True)
                    parsed = clean_ai_json_response(res_str)
                    if "error" in parsed:
                        current_prompt = prompt + f"\n\n⚠️ ATTENTION : Ta réponse précédente n'était pas un JSON valide.\nErreur retournée : {parsed['error']}\nExtrait de ce que tu as envoyé : {res_str[:150]}...\nMerci de CORRIGER ce format et de retourner STRICTEMENT un JSON valide."
                        print(f"[AI RETRY] JSON invalide détecté. Tentative de correction en cours...", flush=True)
                        raise ValueError(f"Invalid JSON from AI: {parsed['error']}")
                    return parsed
                except Exception as e:
                    # Erreur d'API (Timeout, Quota, etc.), on renvoie l'erreur pour que le frontend gère
                    return {"error": str(e), "type": "api_error"}

    async def _execute_provider(self, target_provider: str, prompt: str, system_instruction: str, json_mode: bool = False, bypass_queue: bool = False) -> str:
        """Exécute l'appel vers le provider spécifique de manière isolée."""
        if target_provider == "openai":
            if not self.openai_client:
                raise ValueError("OpenAI client not configured (Missing API Key).")
            model_name = await self._get_openai_model()
            return await self._attempt_call(self._call_openai, model_name, bypass_queue, prompt, system_instruction, json_mode=json_mode)
            
        elif target_provider == "gemini":
            if not self.gemini_client:
                raise ValueError("Gemini client not configured (Missing API Key).")
            model_name = await self._get_gemini_model()
            if not model_name:
                raise ValueError("Gemini initialized but no model found during discovery.")
            return await self._attempt_call(self._call_gemini, model_name, bypass_queue, prompt, system_instruction, json_mode=json_mode)
            
        raise ValueError(f"Provider '{target_provider}' is unknown or not supported.")

    async def _attempt_call(self, func, model_name, bypass_queue, *args, **kwargs):
        """Exécute une fonction d'appel IA avec retries pour les erreurs transitoires."""
        max_retries = 1
        base_delay = 1.0
        
        for attempt in range(max_retries + 1):
            try:
                # [OPTIMISATION SÉMAPHORE] Acquis uniquement pendant la requête réseau
                if bypass_queue:
                    return await asyncio.wait_for(func(*args, model=model_name, **kwargs), timeout=60.0)
                else:
                    async with self._semaphore:
                        return await asyncio.wait_for(func(*args, model=model_name, **kwargs), timeout=60.0)
            except asyncio.TimeoutError:
                print(f"[AI] ⏱️ Timeout (60s) sur {model_name}. Le provider bloque.", flush=True)
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.5)
                    print(f"[AI] ⏳ Retry après Timeout dans {delay:.1f}s...", flush=True)
                    await asyncio.sleep(delay)
                else:
                    raise asyncio.TimeoutError(f"Le provider AI a fait Timeout après {max_retries + 1} tentatives.")
            except Exception as e:
                error_msg = str(e).lower()
                
                # 1. Erreurs Fatales (Ne pas réessayer, passer au modèle suivant)
                if "404" in error_msg or "not found" in error_msg: # Modèle inexistant
                    raise e 
                if "400" in error_msg or "invalid argument" in error_msg: # Requête invalide
                    raise e
                if "401" in error_msg or "unauthenticated" in error_msg: # Clé invalide
                    raise e
                if "502" in error_msg or "bad gateway" in error_msg or "503" in error_msg or "500" in error_msg: # Panne API Serveur
                    print(f"[AI] 🚨 Panne API Serveur ({model_name}). Rejet immédiat pour déclencher le fallback.", flush=True)
                    raise e

                # 2. Erreurs Transitoires (Réessayer le même modèle)
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 0.5) # Jitter
                    print(f"[AI] ⏳ Transient error ({model_name}). Retrying in {delay:.1f}s...", flush=True)
                    await asyncio.sleep(delay)
                else:
                    raise e # Épuisement des retries

    async def _call_openai(self, prompt, system_instruction, model="gpt-4-turbo", json_mode=False):
        if not self.openai_client:
            raise ValueError("Clé OpenAI non configurée.")
        
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": 0.7
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.openai_client.chat.completions.create(**kwargs)
        return response.choices[0].message.content

    async def _call_gemini(self, prompt, system_instruction, model="gemini-2.0-flash", json_mode=False):
        if not self.gemini_client:
            raise ValueError("Clé Gemini non configurée.")
        
        # Gemini gère les instructions système à l'initialisation du modèle ou dans le prompt
        # print(f"[AI] Using Gemini model: {model}", flush=True)
        
        config = None
        if system_instruction or json_mode:
            config_kwargs = {}
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction
            if json_mode:
                config_kwargs["response_mime_type"] = "application/json"
            config = types.GenerateContentConfig(**config_kwargs)

        # [FIX] Utilisation de l'API asynchrone native du nouveau SDK (aio)
        # Évite les deadlocks de threads causés par le client HTTPX synchrone sous-jacent
        response = await self.gemini_client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        try:
            return response.text
        except ValueError as e:
            # [FIX] Gère les blocages dus aux Safety Filters de Google (renvoie un bloc vide)
            raise RuntimeError(f"Gemini Safety Filter Blocked Content: {e}")

# Instance singleton pour être importée ailleurs
ai_service = AIGenerator()
