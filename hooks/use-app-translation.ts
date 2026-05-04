"use client";

import { useTranslation } from "react-i18next";
import { useLanguage } from "@/components/language-provider";

export function useAppTranslation() {
  const { t } = useTranslation();
  const languageApi = useLanguage();

  return {
    t,
    ...languageApi,
  };
}
