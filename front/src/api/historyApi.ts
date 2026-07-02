import { authenticatedFetch } from '../utils/auth';
import { API_BASE_URL } from '../config';

/**
 * Récupère l'historique des sessions d'entraînement.
 */
export const fetchTrainingHistory = async (): Promise<any[]> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/training/history`);
  if (!response.ok) throw new Error('Failed to fetch training history');
  const data = await response.json();
  return data.history || [];
};

/**
 * Récupère l'historique des sessions d'entretien.
 */
export const fetchInterviewHistory = async (): Promise<any[]> => {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cv/interview/history`);
  if (!response.ok) throw new Error('Failed to fetch interview history');
  const data = await response.json();
  return data.history || [];
};