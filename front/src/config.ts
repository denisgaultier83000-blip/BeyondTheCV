// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

// 1. Récupération de l'URL de base de l'API depuis les variables d'environnement injectées par Vite au moment du build.
const API_BASE_URL = import.meta.env.VITE_API_URL;

// 2. [SÉCURITÉ] Vérification critique : si l'URL n'est pas définie, on lève une erreur pour faire échouer le build.
//    Ceci empêche de déployer une application qui ne peut pas communiquer avec son backend.
if (!API_BASE_URL) {
  throw new Error("FATAL: VITE_API_URL is not defined. The build cannot continue without a backend API URL.");
}

// 3. Exportation des constantes prêtes à l'emploi pour le reste de l'application.
//    On centralise ici l'ajout du préfixe '/api' pour éviter les répétitions et les erreurs.
export const API_URL = `${API_BASE_URL}/api`;
export { API_BASE_URL };
