import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

export function initializeI18next(): Promise<unknown> {
  return i18next
    .use(HttpBackend)
    .use(LanguageDetector)
    .init({
      fallbackLng: 'en',
      supportedLngs: ['en', 'fr'],
      load: 'languageOnly',
      ns: ['translation'],
      defaultNS: 'translation',
      backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      interpolation: { escapeValue: false },
      returnNull: false,
    });
}
