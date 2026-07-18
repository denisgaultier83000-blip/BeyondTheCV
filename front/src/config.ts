/**
 * Fichier de configuration central pour les variables d'environnement.
 * Il détermine l'URL de base de l'API à utiliser.
 */

// En production (build), utilise l'URL injectée par la variable d'environnement VITE_API_URL.
// En développement local (`npm run dev`), utilise un chemin relatif pour que les requêtes passent par le proxy de Vite.
// Cela évite les problèmes de CORS en local.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
