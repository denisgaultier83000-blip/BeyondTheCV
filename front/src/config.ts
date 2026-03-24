// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, SSH, Localhost)
// Priorité : Variable d'env (Prod) > Hostname dynamique (Dev/SSH)

export const API_BASE_URL = import.meta.env.VITE_API_TARGET || `http://${window.location.hostname}:8000`;