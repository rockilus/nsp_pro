import { TeamWithMembership } from '@/types/team';
import { canAccessPage } from '@/app/lib/access-control/check-access';

export interface NavLink {
  name: string;
  /** i18n key from app-bar namespace */
  labelKey: string;
  href: string;
  route: string;
}

export const ALL_NAV_LINKS: NavLink[] = [
  { name: 'workers', labelKey: 'workers', href: '/plan/workers', route: '/workers' },
  { name: 'shifts', labelKey: 'shifts', href: '/plan/shifts', route: '/shifts' },
  {
    name: 'shift-demands',
    labelKey: 'shift_demands',
    href: '/plan/shift-demands',
    route: '/shift-demands',
  },
  {
    name: 'constraints',
    labelKey: 'constraints',
    href: '/plan/constraints',
    route: '/constraints',
  },
  { name: 'requests', labelKey: 'requests', href: '/plan/requests', route: '/requests' },
  { name: 'campaign', labelKey: 'campaign', href: '/plan/campaign', route: '/campaign' },
  { name: 'schedule', labelKey: 'schedule', href: '/plan/schedule', route: '/schedule' },
  { name: 'swaps', labelKey: 'swaps', href: '/plan/swaps', route: '/swaps' },
  { name: 'stats', labelKey: 'stats', href: '/plan/stats', route: '/stats' },
];

export const MOBILE_NAV_LINKS: NavLink[] = [
  { name: 'requests', labelKey: 'requests', href: '/plan/requests', route: '/requests' },
  { name: 'schedule', labelKey: 'schedule', href: '/plan/schedule', route: '/schedule' },
  { name: 'swaps', labelKey: 'swaps', href: '/plan/swaps', route: '/swaps' },
];

/**
 * Filter links based on team access control.
 * Links with no route restriction always pass.
 * If no team is selected, all restricted links are filtered out.
 */
export function getFilteredLinks(
  links: NavLink[],
  selectedTeam: TeamWithMembership | null,
): NavLink[] {
  return links.filter((link) => {
    if (!link.route) return true;
    if (!selectedTeam) return false;
    return canAccessPage(link.route, selectedTeam);
  });
}

/**
 * Resolve full hrefs by prefixing with /{lng}/plan
 */
export function resolveLinks(
  links: NavLink[],
  lng: string,
): (NavLink & { resolvedHref: string })[] {
  return links.map((link) => ({
    ...link,
    resolvedHref: `/${lng}${link.href}`,
  }));
}

/**
 * Determine the active route by matching the current pathname against link routes.
 * Returns the matched route string, or false if none match.
 */
export function getActiveRoute(links: NavLink[], pathname: string, lng: string): string | false {
  return links.find((l) => pathname?.startsWith(`/${lng}/plan${l.route}`))?.route ?? false;
}
