import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { storageManager } from '../utils/storageManager';

/**
 * Récupère le token d'authentification depuis le localStorage.
 */
export const getToken = (): string | null => {
  return storageManager.local.getItem("token");
};

/**
 * Supprime le token et les données utilisateur du localStorage.
 */
export const removeToken = (): void => {
  storageManager.local.removeItem("token");
  storageManager.local.removeItem("user");
};

/**
 * Tente de récupérer le profil de l'utilisateur actuellement connecté.
 * Cette fonction est le cœur de la gestion d'état d'authentification.
 */
const fetchCurrentUser = async () => {
  // Si aucun token n'est présent, inutile de faire un appel API.
  if (!getToken()) {
    throw new Error('No token found');
  }
  const response = await authenticatedFetch(`${API_BASE_URL}/me`);
  if (!response.ok) {
    // Si le token est invalide ou expiré, le serveur renverra une erreur (ex: 401)
    throw new Error('User not authenticated');
  }
  return response.json();
};

/**
 * Hook pour gérer l'état d'authentification et les données de l'utilisateur.
 */
export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['currentUser'], // Clé de cache pour l'utilisateur connecté
    queryFn: fetchCurrentUser,
    retry: 1, // On ne réessaie qu'une fois en cas d'erreur réseau
    staleTime: Infinity, // Les données utilisateur sont considérées comme toujours fraîches
  });

  const logout = () => {
    removeToken(); // Supprime le token du localStorage
    queryClient.removeQueries({ queryKey: ['currentUser'] }); // Vide le cache utilisateur
  };

  return { user, isAuthenticated: !!user && !isError, isLoading, logout };
};