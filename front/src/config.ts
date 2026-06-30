// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    // Fournir une URL par défaut pour l'environnement de build/serveur
    return process.env.VITE_API_URL || 'http://localhost:8000';
  }

  const hostname = window.location.hostname;

  if (hostname === 'staging.beyondthecv.app') {
    // [FIX] L'environnement de staging DOIT pointer vers l'API de staging
    return 'https://api-staging.beyondthecv.app';
  }

  if (hostname === 'beyondthecv.app' || hostname === 'www.beyondthecv.app') {
    // L'URL de production, probablement celle injectée au build
    return import.meta.env.VITE_API_URL || 'https://beyondthecv-backend-service-746792482004.europe-west1.run.app';
  }

  // Pour le développement local, continuer à utiliser la variable d'environnement ou le localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};


// Utilise l'URL injectée au build par Vite (via build.yml), ou bascule en local par défaut
export const API_BASE_URL = getApiBaseUrl();

