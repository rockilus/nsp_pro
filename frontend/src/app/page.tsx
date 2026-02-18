"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectLanguage } from "./lib/language-detection";
import { fallbackLng } from "./i18n/settings";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const detectedLang = detectLanguage();
    const targetPath = `/${detectedLang}/`;

    // Hard fallback: if router.replace hasn't navigated within 800ms
    // (e.g. bfcache stall or hydration delay on iOS Safari), force navigation.
    const fallbackTimer = setTimeout(() => {
      window.location.replace(`/${fallbackLng}/`);
    }, 800);

    try {
      router.replace(targetPath);
    } catch {
      // If router throws (e.g. during hydration), fall back immediately
      clearTimeout(fallbackTimer);
      window.location.replace(targetPath);
    }

    return () => clearTimeout(fallbackTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Redirecting...</div>
    </div>
  );
}
