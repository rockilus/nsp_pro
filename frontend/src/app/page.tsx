"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectLanguage } from "./lib/language-detection";
import { fallbackLng } from "./i18n/settings";

export default function RootPage() {
  const router = useRouter();
  const detectedLang = detectLanguage();
  const targetPath = `/${detectedLang}/`;

  useEffect(() => {
    // Hard fallback: if `router.replace` hasn't navigated within 300ms
    // (e.g. bfcache stall or hydration delay on iOS Safari), force navigation
    // to the *detected* language. The meta refresh below is the final no-JS
    // fallback and also uses the detected language so all paths are consistent.
    const fallbackTimer = setTimeout(() => {
      window.location.replace(targetPath);
    }, 300);

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
    <>
      {/*
        Pure-HTML redirect — fires after 1s with no JS required.
        Handles VPN/firewall environments where _next/static chunks are blocked.
        If JS loads normally, router.replace above fires first and this is a no-op.
      */}
      <meta httpEquiv="refresh" content={`1;url=${targetPath}`} />
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Redirecting...</p>
          <p className="text-sm text-gray-500 mt-2">
            Not redirected?{" "}
            <a href={`/${fallbackLng}/`} className="underline">
              Click here
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
