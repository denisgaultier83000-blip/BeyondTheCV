// Configuration centralisée de l'API
// Gère automatiquement l'URL du backend (Docker, VPS, Localhost)

const runtimeFallbackApiBaseUrl = () => {
	if (typeof window === 'undefined') return '/api';

	const hostname = window.location.hostname.toLowerCase();
	if (hostname === 'staging.beyondthecv.app') {
		return 'https://api-staging.beyondthecv.app/api';
	}
	if (hostname === 'beyondthecv.app' || hostname === 'www.beyondthecv.app') {
		return 'https://api.beyondthecv.app/api';
	}
	return '/api';
};

// Utilise d'abord l'URL injectée au build par Vite (via build.yml).
// Si elle est absente ou restée sur un fallback générique, on déduit l'API depuis l'hôte courant.
const rawApiBaseUrl = import.meta.env.VITE_API_URL;
const resolvedApiBaseUrl = rawApiBaseUrl && rawApiBaseUrl.trim() !== '/api'
	? rawApiBaseUrl
	: runtimeFallbackApiBaseUrl();

export const API_BASE_URL = resolvedApiBaseUrl.replace(/\/+$/g, "");
