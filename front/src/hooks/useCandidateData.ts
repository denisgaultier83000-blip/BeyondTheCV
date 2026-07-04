import { useDashboard } from '../components/DashboardContext';

/**
 * Hook pour récupérer les données complètes du candidat depuis le DashboardContext.
 *
 * Cet hook sert de point d'accès centralisé aux données du CV/formulaire du candidat,
 * telles que gérées par le DashboardProvider. Il abstrait la source de données
 * pour les composants qui ont besoin de travailler avec le profil complet.
 *
 * @returns Un objet contenant `candidateData`, qui est l'objet `cvData` du contexte.
 *          Retourne un objet vide si le contexte n'est pas encore disponible.
 */
export const useCandidateData = () => {
  const dashboard = useDashboard();

  // Le `DashboardContext` garantit que `cvData` n'est jamais null.
  return { candidateData: dashboard?.cvData || {} };
};