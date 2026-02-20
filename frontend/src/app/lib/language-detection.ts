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

function safeCookieGet(name: string): string | null {
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(name + "="));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

export function detectLanguage(): string {
  if (typeof window === "undefined") return fallbackLng;

  // 1. Check localStorage (explicit user preference set by the app)
  const stored = safeLocalStorageGet(cookieName);
  if (stored && languages.includes(stored)) {
    return stored;
  }

  // 2. Check cookie (set by server-side i18n middleware or a previous session)
  const cookieVal = safeCookieGet(cookieName);
  if (cookieVal && languages.includes(cookieVal)) {
    return cookieVal;
  }

  // 3. Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (languages.includes(browserLang)) {
    return browserLang;
  }

  // 4. Fallback
  return fallbackLng;
}

export function setLanguagePreference(lng: string) {
  if (typeof window !== "undefined") {
    safeLocalStorageSet(cookieName, lng);
  }
}
