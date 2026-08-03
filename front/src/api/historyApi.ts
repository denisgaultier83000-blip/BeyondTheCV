import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';
import { API_ROUTES } from './routes';

/**
 * Récupère l'historique des sessions d'entraînement.
 */
export const fetchTrainingHistory = async (): Promise<any[]> => {
  const response = await authenticatedFetch(API_ROUTES.TRAINING.HISTORY);
  if (!response.ok) throw new Error('Failed to fetch training history');
  const data = await response.json();
  return data.history || [];
};

/**
 * Récupère l'historique des sessions d'entretien.
 */
export const fetchInterviewHistory = async (): Promise<any[]> => {
  const response = await authenticatedFetch(API_ROUTES.INTERVIEW.HISTORY);
  if (!response.ok) throw new Error('Failed to fetch interview history');
  const data = await response.json();
  return data.history || [];
};