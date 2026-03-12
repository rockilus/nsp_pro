"use client";

import { useParams } from "next/navigation";
import type { Locale } from "@/lib/dictionaries";
import NotFoundPage from "@/components/marketing/NotFoundPage";

const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "es"];
const DEFAULT_LOCALE: Locale = "fr";

export default function LangNotFound() {
  const params = useParams<{ lang: string }>();
  const lang: Locale = SUPPORTED_LOCALES.includes(params?.lang as Locale)
    ? (params.lang as Locale)
    : DEFAULT_LOCALE;

  return <NotFoundPage lang={lang} />;
}
