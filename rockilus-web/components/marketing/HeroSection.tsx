import type { Locale } from "@/lib/dictionaries";

interface HeroProps {
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
    ctaDemo: string;
  };
  lang: Locale;
}

const LOCALES_WITH_DESKTOP: Locale[] = ["en", "fr"];
const LOCALES_WITH_MOBILE: Locale[] = ["en"];

function desktopImagePath(lang: Locale): string {
  const resolved = LOCALES_WITH_DESKTOP.includes(lang) ? lang : "en";
  return `/images/landing-page/hero-section/${resolved}/schedule.desktop.2880.v1.png`;
}

function mobileImagePath(lang: Locale): string {
  const resolved = LOCALES_WITH_MOBILE.includes(lang) ? lang : "en";
  return `/images/landing-page/hero-section/${resolved}/schedule.mobile.1284.v1.jpeg`;
}

export default function HeroSection({ hero, lang }: HeroProps) {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 bg-white">
      {/* Text + CTAs — centered single column */}
      <div className="mx-auto max-w-4xl text-center space-y-8">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
          {hero.headline}
        </h1>
        <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
          {hero.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#cta"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-8 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            {hero.cta}
          </a>
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-8 py-3 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
          >
            {hero.ctaDemo}
          </a>
        </div>
      </div>

      {/* App screenshots */}
      <div className="mx-auto max-w-6xl mt-16 space-y-10">
        {/* Desktop screenshot */}
        <img
          src={desktopImagePath(lang)}
          alt="Rockilus schedule — desktop view"
          className="w-full rounded-xl shadow-2xl border border-slate-200"
        />

        {/* Mobile screenshot inside iPhone frame */}
        <div className="flex justify-center">
          <div className="relative w-[260px] rounded-[2.5rem] border-[3px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden aspect-[9/19.5]">
            {/* Dynamic island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[80px] h-[22px] bg-slate-900 rounded-full" />
            {/* Screenshot */}
            <img
              src={mobileImagePath(lang)}
              alt="Rockilus schedule — mobile view"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
