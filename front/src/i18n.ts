import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// 1. Import direct de la traduction par défaut pour un affichage instantané (0 requête réseau)
import frTranslation from '../public/locales/fr/translation.json';

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
    // 2. On injecte le Français directement dans le bundle initial
    resources: {
      fr: {
        translation: frTranslation
      }
    },
    partialBundledLanguages: true, // 3. Indique à i18n de chercher sur le réseau SEULEMENT pour les autres langues
    // Langues supportées par l'interface utilisateur
    supportedLngs: ['en', 'fr', 'es', 'de', 'it'],
    // Options pour le backend de chargement
    backend: {
      // Chemin vers les fichiers de traduction que nous allons créer
      loadPath: '/locales/{{lng}}/translation.json',
    },
    // Options de détection de langue
    detection: {
      order: ['navigator'],
      caches: [],
    },
    // Désactive l'échappement des valeurs (React le fait déjà pour se protéger du XSS)
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;