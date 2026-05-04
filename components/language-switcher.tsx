"use client";

import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/hooks/use-app-translation";

export function LanguageSwitcher() {
  const { language, toggleLanguage, t } = useAppTranslation();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleLanguage}
      aria-label={t("language.switch")}
      title={t("language.switch")}
      className="shrink-0 bg-transparent"
    >
      <ReactCountryFlag
        svg
        countryCode={language === "es" ? "ES" : "GB"}
        aria-label={language === "es" ? t("language.spanish") : t("language.english")}
        style={{ fontSize: "1.1rem", lineHeight: 1 }}
      />
    </Button>
  );
}
