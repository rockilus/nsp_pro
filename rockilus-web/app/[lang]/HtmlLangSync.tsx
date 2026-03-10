"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/dictionaries";

export default function HtmlLangSync({ lang }: { lang: Locale }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
