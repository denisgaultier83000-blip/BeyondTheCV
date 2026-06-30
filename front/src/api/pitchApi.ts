import { api } from "./client";
import { API_ROUTES } from "./routes";

// Définition des types pour la nouvelle structure de données
interface Pitch {
  title: string;
  description: string;
  content: string;
}

export interface PitchMatrix {
  base_pitches: {
    pitch_30s: Pitch;
    pitch_1min: Pitch;
    pitch_3min: Pitch;
  };
  angle_variations: {
    hr: Pitch;
    manager: Pitch;
    executive: Pitch;
    anti_flaw: Pitch;
  };
  coaching: {
    strengths: string;
    risks: string;
    natural_version_tip: string;
    impactful_version_tip: string;
  };
}

/**
 * Appelle le backend pour générer la nouvelle matrice de pitchs stratégiques.
 * @param candidateData - L'objet JSON complet des données du candidat.
 * @param targetLanguage - La langue de génération (ex: 'fr').
 * @returns La matrice de pitchs générée.
 */
export const generateStrategicPitchMatrix = async (
  candidateData: any,
  targetLanguage: string = "fr"
): Promise<PitchMatrix> => {
  const response = await api<PitchMatrix>(API_ROUTES.PITCH.GENERATE, {
    method: "POST",
    body: JSON.stringify({ candidate_data: candidateData, target_language: targetLanguage }),
  });
  return response;
};