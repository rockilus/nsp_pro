"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { languages, cookieName, fallbackLng } from "@/app/i18n/settings";

interface LanguageContextType {
  language: string;
  setLanguage: (lng: string) => void;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage: string;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: LanguageProviderProps) {
  const [language, setLang] = useState(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Store language preference
    if (typeof window !== "undefined") {
      localStorage.setItem(cookieName, language);
    }
  }, [language]);

  const setLanguage = (lng: string) => {
    if (!languages.includes(lng)) return;

    setIsLoading(true);
    setLang(lng);

    // Update URL to new language
    const currentPath = pathname.split("/").slice(2).join("/"); // Remove current language from path
    const newPath = `/${lng}/${currentPath}`;

    router.push(newPath);
    setIsLoading(false);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
