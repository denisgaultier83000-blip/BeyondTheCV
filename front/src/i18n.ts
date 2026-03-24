import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  // Détecte la langue de l'utilisateur (via le navigateur, localStorage, etc.)
  .use(LanguageDetector)
  // Passe l'instance i18n à react-i18next
  .use(initReactI18next)
  // Charge les traductions depuis une API (ici, les fichiers dans /public/locales)
  .use(HttpApi)
  .init({
    // Langue par défaut si la détection échoue
    fallbackLng: 'en',
    // Langues supportées
    supportedLngs: ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar'],
    // Options pour le backend de chargement
    backend: {
      // Chemin vers les fichiers de traduction que nous allons créer
      loadPath: '/locales/{{lng}}/translation.json',
    },
    // Options de détection de langue
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'],
    },
    // Désactive l'échappement des valeurs (React le fait déjà pour se protéger du XSS)
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;