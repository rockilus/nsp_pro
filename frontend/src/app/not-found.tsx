"use client";

/**
 * Root Not-Found Page
 *
 * Rendered by Next.js whenever notFound() is thrown anywhere in the app (e.g.
 * from [lng]/layout.tsx when the language segment is invalid).
 *
 * Two behaviours:
 *  - Invalid lang segment (e.g. "/undefined/plan/schedule/"):
 *      Auto-redirects by replacing the bad first segment with the user's
 *      detected language and preserving the rest of the path.
 *  - Valid lang, genuinely missing page (e.g. "/en/does-not-exist/"):
 *      Shows a static 404 UI with links back to each language root.
 *      No auto-redirect to avoid infinite loops.
 *
 * This only applies to client-side navigation. Hard navigations that miss
 * a static S3 object are handled by the inline script in public/404.html.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectLanguage } from "@/app/lib/language-detection";
import { languages } from "@/app/i18n/settings";

function parsePathParts() {
  if (typeof window === "undefined") return { firstSegment: "", rest: [] };
  const parts = window.location.pathname
    .replace(/^\/|\/$/g, "")
    .split("/")
    .filter(Boolean);
  return { firstSegment: parts[0] ?? "", rest: parts.slice(1) };
}

export default function NotFound() {
  const router = useRouter();

  // Lazy initializer runs only on the client's first render — no effect needed
  // to compute this, so we avoid the setState-in-effect lint rule.
  const [isRedirecting] = useState(() => {
    const { firstSegment } = parsePathParts();
    // Redirect only when the first segment is not a recognised language.
    // A valid-lang path reaching here is a genuine missing page — don't redirect.
    return !languages.includes(firstSegment);
  });

  // Perform the navigation as a side-effect, without touching state.
  useEffect(() => {
    if (!isRedirecting) return;
    const { rest } = parsePathParts();
    const lang = detectLanguage();
    // Drop the bad first segment; keep the rest of the path.
    const newPath =
      "/" + lang + "/" + (rest.length ? rest.join("/") + "/" : "");
    router.replace(newPath);
  }, [isRedirecting, router]);

  if (isRedirecting) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "inherit",
          color: "#64748b",
        }}
      >
        Redirecting…
      </div>
    );
  }

  // Genuine 404 — valid language but page doesn't exist.
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#1e293b",
        gap: "1rem",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#2563eb" }}>
        Rockilus
      </div>
      <h1 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
        Page not found
      </h1>
      <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0 }}>
        The page you requested could not be found.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        {[
          { href: "/en/", flag: "🇬🇧", label: "English" },
          { href: "/fr/", flag: "🇫🇷", label: "Français" },
          { href: "/es/", flag: "🇪🇸", label: "Español" },
        ].map(({ href, flag, label }) => (
          <a
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "0.65rem 1rem",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "#1e293b",
            }}
          >
            <span style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>
              {flag}
            </span>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
