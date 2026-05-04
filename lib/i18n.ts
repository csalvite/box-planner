import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import english from "@/translations/english.json";
import spanish from "@/translations/spanish.json";

export const defaultLanguage = "es";
export const languageStorageKey = "box-planner-language";
export const languageCookieKey = "box-planner-language";

export type AppLanguage = "es" | "en";

const resources = {
  en: {
    translation: english,
  },
  es: {
    translation: spanish,
  },
} as const;

export function isSupportedLanguage(value: string): value is AppLanguage {
  return value === "es" || value === "en";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export { i18n };
