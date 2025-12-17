"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export function AccessGuard({
  route,
  teamWithMembership,
  children,
  fallback = null,
  redirectTo = "/plan/schedule",
  showToast = true,
}: AccessGuardProps) {
  const router = useRouter();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const allowed = teamWithMembership
    ? canAccessPage(route, teamWithMembership)
    : false;

  useEffect(() => {
    if (!allowed) {
      // Show user-friendly message
      if (showToast) {
        setSnackbarOpen(true);
      }

      // Redirect to allowed page
      router.push(redirectTo);
    }
  }, [allowed, redirectTo, showToast, router]);

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
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
