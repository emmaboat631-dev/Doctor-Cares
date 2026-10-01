import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import tw from './locales/tw.json';
import fr from './locales/fr.json';

/**
 * Supported locales. English is the fallback for every missing key — Twi and
 * French start as a core-screens translation and grow page by page.
 */
export const LOCALES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'tw', label: 'Twi (Akan)', flag: '🇬🇭' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tw: { translation: tw },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    supportedLngs: LOCALES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'doctor-cares.lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
