"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectLanguage } from "./lib/language-detection";
import { fallbackLng, languages } from "./i18n/settings";

export default function RootPage() {
  const router = useRouter();
  // Dynamically set only when we confirm we are on the real root path,
  // so the meta tag is never baked into the static HTML served at /en/, /fr/, etc.
  const [metaRefreshUrl, setMetaRefreshUrl] = useState<string | null>(null);

  useEffect(() => {
    const detectedLang = detectLanguage();
    const pathname = window.location.pathname;

    // ── Loop-break guard ────────────────────────────────────────────────────
    // CloudFront's custom-error-response can serve root /index.html at paths
    // like /en/ or /en/plan/schedule/ when S3 returns 403/404 for those keys.
    // Without this guard that causes an infinite loop:
    //   /en/ → root page → detectLang "en" → router.replace("/en/") → repeat
    //
    // Strategy:
    //   • On /{lang}/ exactly → jump straight to /plan/schedule/ (bypasses the
    //     CloudFront fallback for the lang root and lands on the real app).
    //   • On any deeper /{lang}/... path → do NOT auto-redirect; just show the
    //     manual link so the user can click out without triggering a loop.
    const onLangRoot = languages.find(
      (lang) => pathname === `/${lang}/` || pathname === `/${lang}`,
    );
    if (onLangRoot) {
      window.location.replace(`/${onLangRoot}/plan/schedule/`);
      return;
    }

    const onDeepLangPath = languages.some((lang) =>
      pathname.startsWith(`/${lang}/`),
    );
    if (onDeepLangPath) {
      // Don't auto-redirect — could loop if the deep path is also missing
      // from S3. Let the user use the manual "Click here" link.
      return;
    }

    // ── Normal case: we are genuinely on / ──────────────────────────────────
    const targetPath = `/${detectedLang}/`;

    // Emit the meta-refresh only now (client-side), so the static HTML that
    // CloudFront serves at /en/ never contains this tag and cannot loop.
    setMetaRefreshUrl(targetPath);

    // Hard fallback: if router.replace hasn't navigated within 300ms
    // (e.g. bfcache stall or hydration delay on iOS Safari), force navigation.
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
        Meta refresh is injected dynamically (above, via state) to ensure it
        only appears when JS confirms we are on the real root path /.
        A static meta tag in the HTML would fire at /en/ too (when CloudFront
        serves /index.html as the 404 fallback) and recreate the loop.
        Handles VPN/firewall environments where _next/static chunks are blocked.
      */}
      {metaRefreshUrl && (
        <meta httpEquiv="refresh" content={`1;url=${metaRefreshUrl}`} />
      )}
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
