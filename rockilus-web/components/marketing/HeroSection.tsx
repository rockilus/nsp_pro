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
      <div className="mx-auto max-w-4xl text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          {hero.headline}
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
          {hero.subheadline}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href="#cta"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            {hero.cta}
          </a>
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-md border border-blue-600 px-6 py-2.5 text-blue-600 font-semibold hover:bg-blue-50 transition-colors text-sm"
          >
            {hero.ctaDemo}
          </a>
        </div>
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
          <div className="absolute right-8 -bottom-60 w-[160px] sm:w-[240px] md:w-[320px] rounded-[2rem] border-[3px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden aspect-[9/19.5]">
            {/* Dynamic island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[80px] h-[22px] bg-slate-900 rounded-full" />
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
