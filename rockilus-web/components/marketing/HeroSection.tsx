"use client";

import React, { useEffect, useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import MobileMock from "./MobileMock";

interface HeroProps {
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
    ctaDemo: string;
  };
  lang: Locale;
  microcopy?: string;
  appUrl?: string;
}

const LOCALES_WITH_DESKTOP: Locale[] = ["en", "fr"];

function desktopImagePath(lang: Locale): string {
  const resolved = LOCALES_WITH_DESKTOP.includes(lang) ? lang : "en";
  return `/images/landing-page/hero-section/${resolved}/schedule.desktop.2880.v1.png`;
}

export default function HeroSection({
  hero,
  lang,
  microcopy,
  appUrl,
}: HeroProps) {
  const QUOTES: Record<Locale, string[]> = {
    en: [
      "Finally, someone built a tool that actually understands our medical scheduling nightmare. It is an absolute lifesaver.",
      "I used to spend my entire Sunday building the roster. Now, I click a button and the month is perfectly planned.",
      "Handling last-minute sick leaves used to cause panic. With the replacement assistant, finding cover takes exactly two clicks.",
    ],
    fr: [
      "Enfin un outil qui comprend notre cauchemar de planification médicale. Ça nous change la vie.",
      "Je passais mon dimanche entier à faire les plannings. Maintenant, je clique sur un bouton et le mois est parfaitement organisé.",
      "Gérer les absences de dernière minute était une source d'angoisse. Avec l'assistant de remplacement, trouver un remplaçant prend exactement deux clics.",
    ],
    es: [
      "Por fin una herramienta que entiende nuestra pesadilla con los turnos médicos. Nos ha salvado la vida.",
      "Antes me pasaba todo el domingo cuadrando los horarios. Ahora hago clic en un botón y el mes queda perfectamente organizado.",
      "Gestionar las bajas de última hora era un caos. Con el asistente de reemplazos, encontrar un sustituto toma exactamente dos clics.",
    ],
  };

  const quotes = QUOTES[lang] ?? QUOTES.en;
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setQuoteIndex(0);
  }, [lang]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const t = setTimeout(() => {
        setQuoteIndex((p) => (p + 1) % quotes.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(t);
    }, 4000);
    return () => clearInterval(interval);
  }, [quotes.length]);
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 bg-white">
      {/* Text + CTAs — centered single column */}
      <div className="mx-auto max-w-4xl text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          {hero.headline}
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
          {hero.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href={appUrl ?? "#cta"}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 border border-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700 transition-colors text-sm w-52"
          >
            {hero.cta}
          </a>
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-4 py-2.5 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm w-52"
          >
            {hero.ctaDemo}
          </a>
        </div>
        {microcopy ? (
          <p className="text-xs text-slate-500 mt-0">{microcopy}</p>
        ) : null}
      </div>

      {/* App screenshots */}
      <div className="mx-auto max-w-6xl mt-16">
        <div className="relative rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Desktop screenshot (fills container) */}
          <img
            src={desktopImagePath(lang)}
            alt="Rockilus schedule — desktop view"
            className="w-full block"
          />

          {/* Mobile screenshot inside iPhone frame overlapping the right side — clipped by parent */}
          <MobileMock lang={lang} />
        </div>
      </div>

      {/* Rotating user quotes */}
      <div className="mx-auto max-w-4xl text-center mt-8 px-4 sm:px-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 shadow-sm">
          <blockquote
            className={`text-sm sm:text-lg italic text-slate-700 transition-opacity duration-700 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
          >
            <span className="text-slate-400 mr-2">“</span>
            {quotes[quoteIndex]}
            <span className="text-slate-400 ml-2">”</span>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
