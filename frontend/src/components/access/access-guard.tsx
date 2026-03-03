"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { canAccessPage } from "@/app/lib/access-control/check-access";
import { TeamWithMembership } from "@/types/team";

type AccessGuardProps = {
  route: string; // route name used in access map
  teamWithMembership: TeamWithMembership | null;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional fallback if access denied
  redirectTo?: string; // Where to redirect if access denied
  showToast?: boolean; // Whether to show access denied message
};

/**
 * Page-level access control guard with redirect and user notification.
 *
 * Use this component to protect entire pages based on user role and team features.
 * Automatically redirects unauthorized users to an allowed page (default: /plan/schedule)
 * and shows a toast notification explaining access denial.
 *
 * Access rules are centrally configured in `routeAccess` (see route-access.ts).
 *
 * **Important**: For hiding UI elements within accessible pages, use `RoleBased` instead.
 *
 * @example
 * // Protect workers page (owner-only)
 * <AccessGuard route="/workers" teamWithMembership={selectedTeam}>
 *   <WorkersPageContent />
 * </AccessGuard>
 *
 * @param route - Route identifier matching key in routeAccess configuration
 * @param teamWithMembership - Current team and user membership information
 * @param children - Page content to render if access is granted
 * @param redirectTo - Destination for unauthorized users (default: "/plan/schedule")
 * @param showToast - Whether to show access denied notification (default: true)
 * @param fallback - Optional loading/fallback content while team is loading
 */
export function AccessGuard({
  route,
  teamWithMembership,
  children,
  fallback = null,
  redirectTo = "/plan/schedule",
  showToast = true,
}: AccessGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract language prefix from the current path (e.g. "/en" from "/en/plan/workers/")
  const lngPrefix = pathname
    ? `/${pathname.replace(/^\//, "").split("/")[0]}`
    : "/en";

  const allowed = teamWithMembership
    ? canAccessPage(route, teamWithMembership)
    : false;

  // Set snackbar state based on access status and showToast flag
  const [snackbarOpen, setSnackbarOpen] = useState(!allowed && showToast);

  useEffect(() => {
    if (!allowed) {
      // Redirect to allowed page, preserving the language prefix
      router.push(`${lngPrefix}${redirectTo}`);
    }
  }, [allowed, lngPrefix, redirectTo, router]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // No team loaded yet - show fallback (loading state)
  if (!teamWithMembership) {
    return <>{fallback}</>;
  }

  // Don't render protected content if user doesn't have access
  if (!allowed) {
    return (
      <>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity="error"
            sx={{ width: "100%" }}
          >
            You do not have permission to access this page
          </Alert>
        </Snackbar>
      </>
    );
  }

  return <>{children}</>;
}
