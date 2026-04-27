// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, SSH, Localhost)

// [FIX EXPERT] Détection dynamique au Runtime (Navigateur)
// Au lieu de dépendre de la compilation Docker capricieuse de Google Cloud,
// on demande au navigateur de regarder l'URL sur laquelle il se trouve actuellement.
const isProduction = window.location.hostname.includes('run.app') || window.location.hostname.includes('beyondthecv.app') || window.location.hostname.includes('vercel.app');
const CLOUD_BACKEND_URL = 'https://beyondthecv-backend-service-746792482004.europe-west1.run.app';

export const API_BASE_URL = isProduction 
    ? CLOUD_BACKEND_URL 
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_TARGET || `http://${window.location.hostname}:8000`);