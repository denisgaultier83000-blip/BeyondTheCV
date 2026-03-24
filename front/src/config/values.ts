export const SENIORITY_LEVELS = ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager"] as const;
export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"] as const;
export const REMOTE_PREFS = ["On-site", "Hybrid", "Remote"] as const;

export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;

export const OUTPUT_LANGUAGES = ["en", "fr", "es", "de", "it", "pt", "nl", "pl", "ru", "zh", "ja"] as const;

export const COUNTRY_OPTIONS = [
  { code: "FR", label: "France" },
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
];

export type CountryRule = {
  phoneRequired: boolean;
  postalCodeRequired: boolean;
  addressAllowed: boolean;
  photoPolicy: "allowed" | "discouraged";
  dobAllowed: boolean;
  familyStatusAllowed: boolean;
  workAuthRequired: boolean;
};

export const COUNTRY_RULES: Record<string, CountryRule> = {
  FR: {
    phoneRequired: false,
    postalCodeRequired: false,
    addressAllowed: true,
    photoPolicy: "allowed",
    dobAllowed: false,
    familyStatusAllowed: false,
    workAuthRequired: false,
  },
  US: {
    phoneRequired: true,
    postalCodeRequired: true,
    addressAllowed: false,           // souvent pas d’adresse complète sur CV
    photoPolicy: "discouraged",      // photo généralement déconseillée
    dobAllowed: false,
    familyStatusAllowed: false,
    workAuthRequired: true,          // “Are you authorized to work…”
  },
  DEFAULT: {
    phoneRequired: false,
    postalCodeRequired: false,
    addressAllowed: true,
    photoPolicy: "allowed",
    dobAllowed: false,
    familyStatusAllowed: false,
    workAuthRequired: false,
  },
};
