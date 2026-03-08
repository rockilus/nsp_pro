"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" },
];

export default function LangToggle({ lang }: { lang: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchLang(newLang: Locale) {
    const segments = pathname.split("/");
    segments[1] = newLang;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLang(code)}
          className={`px-2 py-1 rounded transition-colors ${
            lang === code
              ? "text-blue-600 font-bold"
              : "text-slate-500 hover:text-blue-600"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
