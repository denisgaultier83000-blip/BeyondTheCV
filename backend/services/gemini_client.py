import requests
import os
import logging

# Configuration du logging pour une meilleure visibilité en production
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiClient:
    """
    Client robuste pour interagir avec l'API Google Gemini.
    Ce client est configuré pour utiliser l'endpoint stable v1 et inclut une gestion d'erreurs.
    """
    def __init__(self):
        """
        Initialise le client Gemini.
        Récupère la clé API depuis les variables d'environnement et lève une erreur si elle est manquante.
        """
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.error("La variable d'environnement GEMINI_API_KEY n'est pas définie.")
            raise ValueError("La variable d'environnement GEMINI_API_KEY n'est pas définie.")
        
        # CORRECTIF : On utilise l'endpoint v1, qui est la version stable supportant les modèles récents.
        self.base_url = "https://generativelanguage.googleapis.com/v1/models"

    def generate_content(self, model, prompt_parts):
        """
        Génère du contenu en utilisant un modèle Gemini spécifié.

        Args:
            model (str): Le nom du modèle à utiliser (ex: 'gemini-1.5-flash').
            prompt_parts (list): Une liste de parties de contenu pour le prompt.

        Returns:
            dict: La réponse JSON de l'API.

        Raises:
            requests.exceptions.RequestException: Pour les erreurs réseau ou HTTP.
        """
        # L'API utilise souvent le nom du modèle sans le suffixe '-latest'.
        api_model_name = model.replace('-latest', '')
        
        url = f"{self.base_url}/{api_model_name}:generateContent"
        headers = {'Content-Type': 'application/json'}
        params = {'key': self.api_key}
        data = {'contents': prompt_parts}
        
        logger.info(f"Envoi de la requête à l'API Gemini : {url}")
        
        try:
            response = requests.post(url, headers=headers, json=data, params=params)
            response.raise_for_status()  # Lève une exception pour les erreurs 4xx/5xx
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"Erreur HTTP: {http_err} - Réponse: {response.text}")
            # Propage l'exception pour que l'appelant (ex: le fallback vers OpenAI) puisse la gérer.
            raise