import { API_BASE_URL } from '../config';

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/token`,
  },
  PROFILE: {
    GET: `${API_BASE_URL}/me`,
    SAVE: `${API_BASE_URL}/me`,
    PARSE_LINKEDIN: `${API_BASE_URL}/api/cv/parse-linkedin`,
  },
  DOCUMENTS: {
    LIST: `${API_BASE_URL}/api/cv/documents`,
    DOWNLOAD: (id: string) => `${API_BASE_URL}/api/cv/documents/download/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/cv/documents/${id}`,
  },
  FEEDBACKS: {
    LIST: `${API_BASE_URL}/api/cv/feedbacks`, // La route de création est manquante dans le backend
  },
  SIMULATOR: {
    // Ces routes n'existent pas dans le backend
  },
  INTERVIEW: {
    EVALUATE: `${API_BASE_URL}/api/cv/evaluate-interview-answer`,
  },
  TRAINING: {
    STATS: `${API_BASE_URL}/api/cv/training/stats`,
    GENERATE: `${API_BASE_URL}/api/cv/training/generate-question`,
    EVALUATE: `${API_BASE_URL}/api/cv/training/evaluate`,
  },
  RESEARCH: {
    DISAMBIGUATE: `${API_BASE_URL}/api/research/disambiguate`,
    START: `${API_BASE_URL}/api/research/start`,
  },
  PITCH: {
    GENERATE: `${API_BASE_URL}/api/pitch`,
  }
};