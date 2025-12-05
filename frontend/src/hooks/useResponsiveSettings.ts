"use client";

import { useMediaQuery } from "@mui/material";
import { usePathname } from "next/navigation";

interface ResponsiveSettingsReturn {
  isMobile: boolean;
  showNav: boolean;
  showContent: boolean;
  isParentRoute: boolean;
}

/**
 * Custom hook for responsive settings navigation
 *
 * On mobile (≤768px):
 * - Parent routes (/plan/settings, /plan/teams): show only nav list
 * - Child routes (e.g., /plan/settings/personal-info): show only content with back button
 *
 * On desktop:
 * - Always show both nav and content side-by-side
 */
export function useResponsiveSettings(lng: string): ResponsiveSettingsReturn {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Determine if we're on a parent route (settings root or teams root)
  const settingsParentRoute = `/${lng}/plan/settings`;
  const teamsParentRoute = `/${lng}/plan/teams`;

  const isParentRoute =
    pathname === settingsParentRoute ||
    pathname === teamsParentRoute ||
    pathname === `${settingsParentRoute}/` ||
    pathname === `${teamsParentRoute}/`;

  // Desktop: always show both
  if (!isMobile) {
    return {
      isMobile: false,
      showNav: true,
      showContent: true,
      isParentRoute,
    };
  }

  // Mobile logic:
  // - Parent route: show nav list only
  // - Child route: show content only
  return {
    isMobile: true,
    showNav: isParentRoute,
    showContent: !isParentRoute,
    isParentRoute,
  };
}
