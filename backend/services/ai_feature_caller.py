"""
Routeur de modèles IA par fonctionnalité BTCV.

Permet d'optimiser les coûts et la qualité en associant chaque feature
à une stratégie de modèle (cheap-first ou premium-first) avec fallback automatique.
"""

import json
import os
import asyncio
from typing import Any
from dotenv import load_dotenv

load_dotenv()

from .ai_generator import ai_service


# Chemin vers la matrice de configuration
CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "config", "ai_model_matrix.json"
)


class AIModelMatrix:
    """Charge et expose la matrice de routing modèles/features."""

    def __init__(self, path: str = CONFIG_PATH):
        self.path = path
        self._config = None
        self._load()

    def _load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                self._config = json.load(f)
        except FileNotFoundError:
            print(f"[AI ROUTER WARNING] Config not found at {self.path}. Using empty matrix.", flush=True)
            self._config = {"models": {}, "features": {}}
        except json.JSONDecodeError as e:
            print(f"[AI ROUTER WARNING] Invalid JSON config: {e}. Using empty matrix.", flush=True)
            self._config = {"models": {}, "features": {}}

    def reload(self):
        self._load()

    def model_spec(self, model_key: str) -> dict:
        return self._config.get("models", {}).get(model_key, {})

    def feature_config(self, feature_name: str) -> dict:
        features = self._config.get("features", {})
        return features.get(feature_name, features.get("default", {}))

    def list_features(self) -> list[str]:
        return list(self._config.get("features", {}).keys())


class AIFeatureCaller:
    """Appelle l'IA en fonction d'une feature déclarée dans la matrice."""

    def __init__(self, matrix: AIModelMatrix = None):
        self.matrix = matrix or AIModelMatrix()

    def _model_to_provider_model(self, model_key: str) -> str | None:
        """Convertit une clé de modèle en spécification 'provider:model_name'."""
        spec = self.matrix.model_spec(model_key)
        if not spec:
            return None
        provider = spec.get("provider")
        model_name = spec.get("model")
        if not provider or not model_name:
            return None
        return f"{provider}:{model_name}"

    async def call(
        self,
        feature: str,
        prompt: str,
        system_instruction: str = None,
        json_mode: bool = True,
        bypass_queue: bool = False,
        extra_validation: callable = None,
        _tried_models: set | None = None,
    ) -> dict | str:
        """
        Appelle l'IA pour une feature donnée en respectant la matrice de routing.

        :param feature: nom de la feature dans ai_model_matrix.json
        :param prompt: prompt utilisateur
        :param system_instruction: instruction système optionnelle
        :param json_mode: force un retour JSON
        :param bypass_queue: contourne le sémaphore
        :param extra_validation: fonction async ou sync (result) -> bool pour valider le résultat
        :param _tried_models: usage interne pour éviter les boucles
        """
        config = self.matrix.feature_config(feature)
        strategy = config.get("strategy", "premium-first")
        timeout = config.get("timeout", 60)

        tried = _tried_models or set()

        # Construction de la séquence de modèles selon la stratégie
        if strategy == "cheap-first":
            sequence = [
                config.get("cheap_model"),
                config.get("primary_model"),
                config.get("fallback_model"),
            ]
        else:  # premium-first
            sequence = [
                config.get("primary_model"),
                config.get("fallback_model"),
                config.get("cheap_model"),
            ]

        # Déduplique tout en gardant l'ordre
        seen = set()
        models = []
        for mk in sequence:
            if not mk or mk in seen or mk in tried:
                continue
            seen.add(mk)
            models.append(mk)

        last_error = None
        for model_key in models:
            model_spec = self._model_to_provider_model(model_key)
            if not model_spec:
                continue

            tried.add(model_key)
            provider, model_name = model_spec.split(":", 1)

            print(
                f"[AI ROUTER] feature={feature} strategy={strategy} trying model={model_key} ({provider}:{model_name})",
                flush=True,
            )

            try:
                if json_mode:
                    result = await asyncio.wait_for(
                        ai_service.generate_valid_json(
                            prompt,
                            provider=provider,
                            model=model_spec,
                            system_instruction=system_instruction,
                            bypass_queue=bypass_queue,
                        ),
                        timeout=timeout,
                    )
                else:
                    result = await asyncio.wait_for(
                        ai_service.generate(
                            prompt,
                            provider=provider,
                            model=model_spec,
                            system_instruction=system_instruction,
                            bypass_queue=bypass_queue,
                            json_mode=False,
                        ),
                        timeout=timeout,
                    )

                # Gestion d'erreur retournée par l'API sous forme de dict
                if isinstance(result, dict) and result.get("error"):
                    raise RuntimeError(result.get("error"))

                # Validation optionnelle
                if extra_validation:
                    if asyncio.iscoroutinefunction(extra_validation):
                        valid = await extra_validation(result)
                    else:
                        valid = extra_validation(result)
                    if not valid:
                        raise ValueError("Validation failed for result")

                print(
                    f"[AI ROUTER] feature={feature} succeeded with model={model_key}",
                    flush=True,
                )
                return result

            except asyncio.TimeoutError as e:
                last_error = f"Timeout on {model_key}: {e}"
                print(f"[AI ROUTER] ⚠️ {last_error}", flush=True)
            except Exception as e:
                last_error = f"{model_key} failed: {e}"
                print(f"[AI ROUTER] ⚠️ {last_error}", flush=True)

        # Échec complet
        error_msg = last_error or f"All models exhausted for feature '{feature}'"
        print(f"[AI ROUTER] 💀 FATAL: {error_msg}", flush=True)
        if json_mode:
            return {"error": error_msg, "type": "api_error"}
        raise RuntimeError(error_msg)


# Singleton global
ai_feature_caller = AIFeatureCaller()


async def ai_call(
    feature: str,
    prompt: str,
    system_instruction: str = None,
    json_mode: bool = True,
    bypass_queue: bool = False,
    extra_validation: callable = None,
) -> dict | str:
    """Point d'entrée simplifié pour appeler une feature IA routée."""
    return await ai_feature_caller.call(
        feature=feature,
        prompt=prompt,
        system_instruction=system_instruction,
        json_mode=json_mode,
        bypass_queue=bypass_queue,
        extra_validation=extra_validation,
    )
