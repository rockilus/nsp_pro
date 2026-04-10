"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";
import NotFoundPage from "@/components/marketing/NotFoundPage";

const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "es"];
const DEFAULT_LOCALE: Locale = "fr";

function detectLocale(): Locale {
  // 1. Try to infer from the URL path first segment (e.g. /fr/landing-page/)
  if (typeof window !== "undefined") {
    const segment = window.location.pathname.split("/").filter(Boolean)[0];
    if (segment && SUPPORTED_LOCALES.includes(segment as Locale)) {
      return segment as Locale;
    }

    // 2. Fall back to browser language preference
    const preferred = navigator.languages
      .map((l) => l.split("-")[0])
      .find((l) => SUPPORTED_LOCALES.includes(l as Locale));
    if (preferred) return preferred as Locale;
  }

  return DEFAULT_LOCALE;
}

export default function NotFound() {
  // usePathname is available in client components and works with static export
  const pathname = usePathname();
  const segment = pathname?.split("/").filter(Boolean)[0] ?? "";
  const lang: Locale = SUPPORTED_LOCALES.includes(segment as Locale)
    ? (segment as Locale)
    : detectLocale();

  return <NotFoundPage lang={lang} />;
}
