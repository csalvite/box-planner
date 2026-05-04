"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import {
  defaultLanguage,
  i18n,
  isSupportedLanguage,
  languageCookieKey,
  languageStorageKey,
  type AppLanguage,
} from "@/lib/i18n";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLanguage(language: AppLanguage) {
  localStorage.setItem(languageStorageKey, language);
  document.cookie = `${languageCookieKey}=${language}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = language;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    const storedLanguage = localStorage.getItem(languageStorageKey);

    if (storedLanguage && isSupportedLanguage(storedLanguage)) {
      setLanguageState(storedLanguage);
      void i18n.changeLanguage(storedLanguage);
      persistLanguage(storedLanguage);
      return;
    }

    void i18n.changeLanguage(defaultLanguage);
    persistLanguage(defaultLanguage);
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(language);
    persistLanguage(language);
  }, [language]);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
  };

  const toggleLanguage = () => {
    setLanguageState((currentLanguage) =>
      currentLanguage === "es" ? "en" : "es",
    );
  };

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider
        value={{ language, setLanguage, toggleLanguage }}
      >
        {children}
      </LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
