import { languages, fallbackLng, cookieName } from "@/app/i18n/settings";

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // iOS Safari Private Browsing throws SecurityError on localStorage access
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // iOS Safari Private Browsing throws SecurityError on localStorage access
  }
}

export function detectLanguage(): string {
  if (typeof window === "undefined") return fallbackLng;

  // 1. Check localStorage
  const stored = safeLocalStorageGet(cookieName);
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
    safeLocalStorageSet(cookieName, lng);
  }
}
