import type { Locale } from "@/lib/dictionaries";
import LangToggle from "./LangToggle";

interface FooterProps {
  footer: {
    tagline: string;
    links: {
      features: string;
      pricing: string;
      privacy: string;
      terms: string;
      contact: string;
    };
    copyright: string;
  };
  lang: Locale;
}

export default function Footer({ footer, lang }: FooterProps) {
  const { links } = footer;
  return (
    <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="font-bold text-xl text-blue-600 mb-2">Rockilus</div>
            <p className="text-sm text-slate-600">{footer.tagline}</p>
          </div>
          <div>
            <nav className="flex flex-col gap-2 text-sm text-slate-600">
              <a
                href="#features"
                className="hover:text-blue-600 transition-colors"
              >
                {links.features}
              </a>
              <a
                href="#pricing"
                className="hover:text-blue-600 transition-colors"
              >
                {links.pricing}
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                {links.privacy}
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                {links.terms}
              </a>
              <a href="#" className="hover:text-blue-600 transition-colors">
                {links.contact}
              </a>
            </nav>
          </div>
          <div className="flex items-start">
            <LangToggle lang={lang} />
          </div>
        </div>
        <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
          {footer.copyright}
        </div>
      </div>
    </footer>
  );
}
