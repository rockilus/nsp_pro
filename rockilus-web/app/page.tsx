"use client";

import { useEffect } from "react";

const SUPPORTED_LOCALES = ["en", "es", "fr"];
const DEFAULT_LOCALE = "fr";

export default function RootPage() {
  useEffect(() => {
    const preferred = navigator.languages
      .map((lang) => lang.split("-")[0])
      .find((lang) => SUPPORTED_LOCALES.includes(lang));
    window.location.replace(`/${preferred ?? DEFAULT_LOCALE}`);
  }, []);

  return null;
}
