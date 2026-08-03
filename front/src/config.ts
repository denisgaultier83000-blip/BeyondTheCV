// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

// Utilise l'URL injectée au build par Vite (via build.yml), ou bascule en local par défaut.
// En staging on reste en same-origin via /api pour éviter les problèmes CORS entre domaines.
const rawApiBaseUrl = import.meta.env.VITE_API_URL || "/api";
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/g, "");
