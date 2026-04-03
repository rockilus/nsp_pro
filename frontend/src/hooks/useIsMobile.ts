'use client';

import { useMediaQuery } from '@mui/material';

/**
 * Custom hook to detect if the current viewport is considered mobile.
 * Uses the same breakpoint logic as the desktop-only-nav CSS class.
 *
 * Returns true for:
 * - Viewports with max-width of 600px
 * - Viewports with max-width of 960px in landscape orientation
 *
 * @returns {boolean} true if mobile, false otherwise
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width:600px), ((max-width:960px) and (orientation:landscape))', {
    noSsr: true,
  });
}

/**
 * Custom hook to detect if the current viewport is in landscape orientation.
 * Useful for mobile layouts that differ between portrait and landscape.
 *
 * @returns {boolean} true if landscape orientation, false otherwise
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)', { noSsr: true });
}
