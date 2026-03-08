import Link from "next/link";
import type { Locale } from "@/lib/dictionaries";
import LangToggle from "./LangToggle";

interface NavBarProps {
  nav: {
    brand: string;
    features: string;
    pricing: string;
    cta: string;
  };
  lang: Locale;
}

export default function NavBar({ nav, lang }: NavBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center justify-between">
        <div className="font-bold text-xl text-blue-600">{nav.brand}</div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
          <Link
            href="#features"
            className="hover:text-blue-600 transition-colors"
          >
            {nav.features}
          </Link>
          <Link
            href="#pricing"
            className="hover:text-blue-600 transition-colors"
          >
            {nav.pricing}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <LangToggle lang={lang} />
          <Link
            href="#cta"
            className="hidden md:inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            {nav.cta}
          </Link>
        </div>
      </nav>
    </header>
  );
}
