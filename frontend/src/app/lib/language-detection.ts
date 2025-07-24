import { languages, fallbackLng, cookieName } from "@/app/i18n/settings";

export function detectLanguage(): string {
  if (typeof window === "undefined") return fallbackLng;

  // 1. Check localStorage
  const stored = localStorage.getItem(cookieName);
  if (stored && languages.includes(stored)) {
    return stored;
  }

  // 2. Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (languages.includes(browserLang)) {
    return browserLang;
  }

  // 3. Fallback
  return fallbackLng;
}

export function setLanguagePreference(lng: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(cookieName, lng);
  }
}
