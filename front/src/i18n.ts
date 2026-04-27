import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  // Charge les traductions depuis une API en premier
  .use(HttpApi)
  // Détecte la langue de l'utilisateur (via le navigateur, localStorage, etc.)
  .use(LanguageDetector)
  // Passe l'instance i18n à react-i18next
  .use(initReactI18next)
  .init({
    // Langue par défaut orientée France
    fallbackLng: 'fr',
    // On restreint à l'anglais et au français pour garantir la stabilité
    supportedLngs: ['en', 'fr'],
    // Options pour le backend de chargement
    backend: {
      // Chemin vers les fichiers de traduction que nous allons créer
      loadPath: '/locales/{{lng}}/translation.json',
    },
    // Options de détection de langue
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    // Désactive l'échappement des valeurs (React le fait déjà pour se protéger du XSS)
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;