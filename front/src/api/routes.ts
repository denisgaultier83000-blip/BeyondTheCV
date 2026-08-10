export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/token",
    REGISTER: "/auth/register",
    ME: "/auth/me",
  },
  PROFILE: {
    GET: "/cv/me/profile",
    SAVE: "/cv/me/profile",
    PARSE_LINKEDIN: "/cv/parse-linkedin",
  },
  DOCUMENTS: {
    LIST: "/documents",
    DOWNLOAD: (id: string) => `/documents/download/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
  },
  FEEDBACKS: {
    LIST: "/cv/feedbacks",
    CREATE: "/cv/feedback",
  },
  SIMULATOR: {
    SITUATION: "/cv/simulate-situation",
    CAREER: "/cv/simulate-career",
  },
  INTERVIEW: {
    EVALUATE: "/cv/training/evaluate",
    HISTORY: "/cv/interview/history",
  },
  TRAINING: {
    STATS: "/cv/training/stats",
    GENERATE: "/cv/training/generate-question",
    EVALUATE: "/cv/training/evaluate",
    HISTORY: "/cv/training/history",
  },
  RESEARCH: {
    DISAMBIGUATE: "/research/disambiguate",
    START: "/research/start",
  }
};