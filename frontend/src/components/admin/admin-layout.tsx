'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useTranslation } from '@/app/i18n/client';
import { getAdminLinks } from './admin-links';
import { cn } from '@/lib/utils';
import './admin-layout.css';

export default function AdminLayout({
  children,
  params: { lng },
}: {
  children: React.ReactNode;
  params: { lng: string };
}) {
  const pathname = usePathname();
  const { t } = useTranslation(lng, 'admin');
  const links = getAdminLinks(lng);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className="admin-sidebar" data-testid="admin-sidebar">
        <p className="admin-sidebar-title">{t('sidebarTitle')}</p>
        {links.map((link) => (
          <Link
            key={link.name}
            data-testid={`admin-sidebar-link-${link.name}`}
            href={link.href}
            className={cn(
              'flex w-full items-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
              pathname.includes(link.name)
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t(link.labelKey)}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <div className="admin-content">{children}</div>
    </div>
  );
}
