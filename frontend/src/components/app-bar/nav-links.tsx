'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/app/i18n/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
// Types
import { TeamWithMembership } from '@/types/team';
// Shared nav utilities
import {
  ALL_NAV_LINKS,
  MOBILE_NAV_LINKS,
  getFilteredLinks,
  getActiveRoute,
  resolveLinks,
} from './nav-utils';

export default function NavLinks({
  lng,
  selectedTeam,
}: {
  lng: string;
  selectedTeam: TeamWithMembership | null;
}) {
  const { t } = useTranslation(lng, 'app-bar');
  const pathname = usePathname();

  // Admin pages use their own sidebar — hide plan navigation tabs
  if (pathname?.startsWith(`/${lng}/admin`)) return null;

  const filtered = getFilteredLinks(ALL_NAV_LINKS, selectedTeam);
  const links = resolveLinks(filtered, lng);
  const activeRoute = getActiveRoute(filtered, pathname, lng);

  return (
    <div className="flex h-full items-center justify-center">
      <Tabs value={activeRoute || ''}>
        <TabsList variant="line" className="h-16 gap-0 rounded-none bg-transparent p-0">
          {links.map((link) => (
            <TabsTrigger
              key={link.name}
              value={link.route}
              data-testid={`nav-link-${link.name}`}
              className={cn(
                'h-16 rounded-none border-0 px-2.5 text-sm font-normal text-muted-foreground transition-colors',
                'hover:bg-accent/50 hover:text-foreground',
                'data-active:font-semibold data-active:text-foreground',
                // 4px primary-color bottom border active indicator (override shadcn defaults)
                'after:bg-primary',
                'group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-1',
                'data-active:after:opacity-100',
              )}
              asChild
            >
              <Link href={link.resolvedHref}>{t(link.labelKey)}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

export function NavLinksMobile({
  lng,
  selectedTeam,
  onClick,
}: {
  lng: string;
  selectedTeam: TeamWithMembership | null;
  onClick?: () => void;
}) {
  const { t } = useTranslation(lng, 'app-bar');
  const pathname = usePathname();

  // Admin pages use their own sidebar — hide plan navigation links
  if (pathname?.startsWith(`/${lng}/admin`)) return null;

  const filtered = getFilteredLinks(MOBILE_NAV_LINKS, selectedTeam);
  const links = resolveLinks(filtered, lng);
  const activeRoute = getActiveRoute(filtered, pathname, lng);

  return (
    <ul className="flex flex-col py-2">
      {links.map((link) => (
        <li key={link.name}>
          <Link
            href={link.resolvedHref}
            onClick={onClick}
            className={cn(
              'block rounded-md px-5 py-3 text-sm font-medium transition-colors',
              'hover:bg-accent',
              link.route === activeRoute
                ? 'bg-accent font-semibold text-primary'
                : 'text-muted-foreground',
            )}
          >
            {t(link.labelKey)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
