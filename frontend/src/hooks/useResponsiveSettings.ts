"use client";

import { usePathname } from "next/navigation";
import { useIsMobile, useIsLandscape } from "./useIsMobile";

interface ResponsiveSettingsReturn {
  isMobile: boolean;
  showNav: boolean;
  showContent: boolean;
  isParentRoute: boolean;
  shouldRedirect: boolean;
}

/**
 * Custom hook for responsive settings navigation
 *
 * On mobile:
 * - Parent routes (/plan/settings, /plan/teams): show only nav list
 * - Child routes (e.g., /plan/settings/personal-info): show only content with back button
 *
 * On desktop:
 * - Always show both nav and content side-by-side
 *
 * Redirect behavior:
 * - Mobile portrait: stay on parent route (show nav list)
 * - Mobile landscape OR desktop: redirect to first child route
 */
export function useResponsiveSettings(lng: string): ResponsiveSettingsReturn {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  // Determine if we're on a parent route (settings root or teams root)
  const settingsParentRoute = `/${lng}/plan/settings`;
  const teamsParentRoute = `/${lng}/plan/teams`;

  const isParentRoute =
    pathname === settingsParentRoute ||
    pathname === teamsParentRoute ||
    pathname === `${settingsParentRoute}/` ||
    pathname === `${teamsParentRoute}/`;

  // Redirect logic:
  // - Mobile portrait: no redirect (stay on parent to show nav list)
  // - Mobile landscape OR desktop: redirect to first child
  const desktopOrLandscape = !isMobile || (isMobile && isLandscape);

  // Desktop: always show both
  if (desktopOrLandscape) {
    return {
      isMobile: false,
      showNav: true,
      showContent: true,
      isParentRoute,
      shouldRedirect: isParentRoute,
    };
  }

  // Mobile logic:
  // - Portrait on parent route: show nav list only
  // - Portrait on child route: show content only
  // - Landscape: always show content (redirect will handle parent routes)
  return {
    isMobile: true,
    showNav: isLandscape ? false : isParentRoute,
    showContent: isLandscape ? true : !isParentRoute,
    isParentRoute,
    shouldRedirect: false,
  };
}
