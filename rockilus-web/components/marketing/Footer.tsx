"use client";

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
    // <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
    //   <div className="mx-auto max-w-6xl">
    //     <div className="grid sm:grid-cols-3 gap-8 mb-8">
    //       <div>
    //         <button
    //           type="button"
    //           aria-label="Rockilus"
    //           className="inline-block mb-2 cursor-pointer"
    //           onClick={() => {
    //             if (typeof window !== "undefined") {
    //               window.scrollTo({ top: 0, behavior: "smooth" });
    //             }
    //           }}
    //         >
    //           <img
    //             src="/images/landing-page/logo/rockilus_logo_blue.jpg"
    //             alt="Rockilus"
    //             className="h-6 w-auto object-contain"
    //           />
    //         </button>
    //       </div>
    //       <div>
    //         <nav className="flex flex-col gap-2 text-sm text-slate-600">
    //           <a
    //             href="#features"
    //             className="hover:text-blue-600 transition-colors"
    //           >
    //             {links.features}
    //           </a>
    //           <a
    //             href="#pricing"
    //             className="hover:text-blue-600 transition-colors"
    //           >
    //             {links.pricing}
    //           </a>
    //           <a href="#" className="hover:text-blue-600 transition-colors">
    //             {links.privacy}
    //           </a>
    //           <a href="#" className="hover:text-blue-600 transition-colors">
    //             {links.terms}
    //           </a>
    //           <a href="#" className="hover:text-blue-600 transition-colors">
    //             {links.contact}
    //           </a>
    //         </nav>
    //       </div>
    //       <div className="flex items-start">
    //         <LangToggle lang={lang} />
    //       </div>
    //     </div>
    <div
      className="pt-6 text-center text-sm text-slate-500"
      // border-t border-slate-200
    >
      {/* {footer.copyright} */}
    </div>
    //   </div>
    // </footer>
  );
}
