"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/dictionaries";
import LangToggle from "./LangToggle";

interface NavBarProps {
  nav: {
    brand: string;
    features: string;
    pricing: string;
    cta: string;
    signin?: string;
    howItWorks?: string;
    contact?: string;
  };
  lang: Locale;
}

export default function NavBar({ nav, lang }: NavBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      // ignore clicks on the toggle button itself to avoid toggle race
      if (buttonRef.current && buttonRef.current.contains(e.target as Node))
        return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger on the left */}
              <button
                ref={buttonRef}
                onClick={() => setOpen((v) => !v)}
                aria-controls="mobile-menu"
                aria-expanded={open}
                aria-label={open ? "Close menu" : "Open menu"}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {open ? (
                    <>
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </>
                  ) : (
                    <>
                      <path d="M3 12h18" />
                      <path d="M3 6h18" />
                      <path d="M3 18h18" />
                    </>
                  )}
                </svg>
              </button>

              <div className="font-bold text-xl text-blue-600">{nav.brand}</div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
              <Link
                href="#features"
                className="hover:text-blue-600 transition-colors"
              >
                {nav.features}
              </Link>
              <Link
                href="#how-it-works"
                className="hover:text-blue-600 transition-colors"
              >
                {nav.howItWorks ?? "How it works"}
              </Link>
              <Link
                href="#pricing"
                className="hover:text-blue-600 transition-colors"
              >
                {nav.pricing}
              </Link>
              <a href="#" className="hover:text-blue-600 transition-colors">
                {nav.contact ?? "Contact"}
              </a>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <LangToggle lang={lang} />
              </div>

              <Link
                href="/signin"
                className="hidden md:inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
              >
                {nav.signin ?? "Sign in"}
              </Link>

              <Link
                href="#cta"
                className="hidden md:inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {nav.cta}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu: full width block below header so logo remains visible */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`md:hidden ${open ? "block" : "hidden"} bg-white border-b shadow-sm fixed left-0 right-0 top-16 z-40`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <nav className="flex flex-col gap-3 text-sm font-medium text-slate-700">
            <Link
              href="#features"
              onClick={() => setOpen(false)}
              className="block hover:text-blue-600"
            >
              {nav.features}
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="block hover:text-blue-600"
            >
              {nav.howItWorks ?? "How it works"}
            </Link>
            <Link
              href="#pricing"
              onClick={() => setOpen(false)}
              className="block hover:text-blue-600"
            >
              {nav.pricing}
            </Link>
            <a
              href="#"
              onClick={() => setOpen(false)}
              className="block hover:text-blue-600"
            >
              {nav.contact ?? "Contact"}
            </a>

            <div className="pt-2 border-t flex flex-col gap-2">
              <div>
                <LangToggle lang={lang} />
              </div>
              <Link
                href="/signin"
                className="block w-full text-left px-3 py-2 rounded-md hover:bg-slate-50"
              >
                {nav.signin ?? "Sign in"}
              </Link>
              <Link
                href="#cta"
                onClick={() => setOpen(false)}
                className="block w-full text-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {nav.cta}
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
