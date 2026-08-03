// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

// Utilise l'URL injectée au build par Vite (via build.yml), ou bascule en local par défaut
const rawApiBaseUrl = import.meta.env.VITE_API_URL || "/api";
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/g, "");
