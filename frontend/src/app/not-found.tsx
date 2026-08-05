'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectLanguage } from '@/app/lib/language-detection';
import { languages } from '@/app/i18n/settings';

function parsePathParts() {
  if (typeof window === 'undefined') return { firstSegment: '', rest: [] };
  const parts = window.location.pathname
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean);
  return { firstSegment: parts[0] ?? '', rest: parts.slice(1) };
}

export default function NotFound() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const { firstSegment } = parsePathParts();
    if (!languages.includes(firstSegment)) {
      setIsRedirecting(true);
      const { rest } = parsePathParts();
      const lang = detectLanguage();
      const newPath = '/' + lang + '/' + (rest.length ? rest.join('/') + '/' : '');
      router.replace(newPath);
    }
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center font-[inherit] text-slate-500">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-2xl font-bold text-blue-600">Rockilus</div>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-slate-500">The page you requested could not be found.</p>
      <div className="mt-2 flex gap-3">
        {[
          { href: '/en/', flag: '🇬🇧', label: 'English' },
          { href: '/fr/', flag: '🇫🇷', label: 'Français' },
          { href: '/es/', flag: '🇪🇸', label: 'Español' },
        ].map(({ href, flag, label }) => (
          <a
            key={href}
            href={href}
            className="flex flex-col items-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 no-underline transition-colors hover:bg-slate-50"
          >
            <span className="mb-0.5 text-xl">{flag}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
