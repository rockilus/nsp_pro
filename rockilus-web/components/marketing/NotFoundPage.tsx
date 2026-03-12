"use client";

import Link from "next/link";
import type { Locale } from "@/lib/dictionaries";

import en from "@/dictionaries/en.json";
import fr from "@/dictionaries/fr.json";
import es from "@/dictionaries/es.json";

const dictionaries = { en, fr, es } as const;

interface NotFoundPageProps {
  lang: Locale;
}

export default function NotFoundPage({ lang }: NotFoundPageProps) {
  const dict = dictionaries[lang].notFound;
  const brand = dictionaries[lang].nav.brand;

  return (
    <>
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" aria-label={brand}>
              <img
                src="/images/landing-page/logo/rockilus_logo_blue.jpg"
                alt={brand}
                className="h-5 w-auto object-contain"
              />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {dict.cta}
            </Link>
          </div>
        </div>
      </header>

      {/* 404 body */}
      <main className="min-h-screen flex flex-col items-center justify-center pt-16 px-4 text-center">
        <p className="text-8xl font-extrabold text-blue-600 leading-none select-none">
          404
        </p>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{dict.title}</h1>
        <p className="mt-3 text-slate-500 max-w-sm">{dict.message}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          {dict.cta}
        </Link>
      </main>
    </>
  );
}
