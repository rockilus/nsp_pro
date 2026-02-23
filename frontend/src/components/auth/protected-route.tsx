"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import { isNetworkError } from "../../config/cognito";
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container,
  Alert,
  AlertTitle,
} from "@mui/material";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, error, signIn } = useAuth();
  const [networkRetrying, setNetworkRetrying] = useState(false);
  const [showManualSignIn, setShowManualSignIn] = useState(false);
  // Tracks whether the hard loading timeout has fired.
  // Prevents users (especially mobile Safari) being stuck on the loading
  // spinner indefinitely when automaticSilentRenew hangs at startup.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Hard timeout on the loading state: if auth is still loading after 6 s,
  // force a redirect to Cognito. This unblocks Safari ITP-related hangs and
  // any other case where isLoading never resolves.
  useEffect(() => {
    if (!loading) return;

    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn(
          "⚠️ Auth loading timed out after 6s — forcing sign-in redirect (mobile Safari / ITP guard)",
        );
        setLoadingTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  useEffect(() => {
    if (loadingTimedOut && !isAuthenticated) {
      signIn();
    }
  }, [loadingTimedOut, isAuthenticated, signIn]);

  useEffect(() => {
    // Don't redirect while auth state is still resolving
    if (loading) {
      return;
    }

    if (requireAuth && !loading && !error && !isAuthenticated) {
      // Immediate redirect (no delay) for better mobile Safari compatibility
      const timer = setTimeout(() => {
        if (!isAuthenticated && !loading && !error) {
          console.log("🔐 ProtectedRoute: Initiating sign-in redirect");
          signIn();
        }
      }, 100); // Minimal 100ms delay to ensure component is mounted

      // Show manual sign-in button after 2 seconds as fallback
      const fallbackTimer = setTimeout(() => {
        if (!isAuthenticated && !loading && !error) {
          console.log(
            "⚠️ Automatic redirect may have failed, showing manual sign-in button",
          );
          setShowManualSignIn(true);
        }
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }

    // Handle specific refresh token rotation errors
    if (error?.message) {
      const isRotationError =
        error.message.includes("invalid_grant") ||
        error.message.includes("refresh token") ||
        error.message.includes("Token is not valid") ||
        error.message.includes("rotation conflict");

      // Terminal callback errors: the code/state are unusable — auto-redirect
      // to a fresh sign-in rather than leaving the user on a frozen spinner.
      const isTerminalCallbackError =
        error.message.includes("No matching state") ||
        error.message.includes("No state in response") ||
        error.message.includes("Invalid state");

      const isNetworkIssue = isNetworkError(error);

      // Avoid calling setState synchronously inside the effect body -
      // schedule updates with timers and clear them on cleanup to satisfy
      // react-hooks/set-state-in-effect lint rule.
      let manualSignInTimer: ReturnType<typeof setTimeout> | undefined;
      let networkStartTimer: ReturnType<typeof setTimeout> | undefined;
      let networkRetryTimer: ReturnType<typeof setTimeout> | undefined;
      let autoRedirectTimer: ReturnType<typeof setTimeout> | undefined;

      if (isTerminalCallbackError) {
        // Auto-redirect after a brief delay so the user sees something is
        // happening rather than a sudden redirect with no feedback.
        console.warn(
          "🔄 Terminal callback error — auto-redirecting to sign-in:",
          error.message,
        );
        autoRedirectTimer = setTimeout(() => {
          if (!isAuthenticated) {
            signIn();
          }
        }, 2000);
      } else if (isRotationError && !isNetworkIssue) {
        console.warn("🔄 Refresh token rotation error detected");
        manualSignInTimer = setTimeout(() => setShowManualSignIn(true), 0);
      } else if (isNetworkIssue) {
        console.warn("🌐 Network error detected, allowing retry");

        // Start network-retrying state on a short-scheduled task to avoid
        // triggering synchronous state update warnings.
        networkStartTimer = setTimeout(() => {
          setNetworkRetrying(true);

          // Auto-retry after network issues
          networkRetryTimer = setTimeout(() => {
            setNetworkRetrying(false);
            if (!isAuthenticated) {
              setShowManualSignIn(true);
            }
          }, 10000); // 10 second delay for network recovery
        }, 0);
      } else {
        // Catch-all: any other non-network error — show the sign-in button
        // after 3 seconds rather than leaving the user on a permanent spinner.
        manualSignInTimer = setTimeout(() => {
          if (!isAuthenticated) {
            setShowManualSignIn(true);
          }
        }, 3000);
      }

      return () => {
        if (autoRedirectTimer) clearTimeout(autoRedirectTimer);
        if (manualSignInTimer) clearTimeout(manualSignInTimer);
        if (networkStartTimer) clearTimeout(networkStartTimer);
        if (networkRetryTimer) clearTimeout(networkRetryTimer);
      };
    }
  }, [requireAuth, loading, error, isAuthenticated, signIn]);

  // Network connectivity issues
  if (networkRetrying || (error && isNetworkError(error))) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Network Connectivity Issue</AlertTitle>
            Having trouble connecting to authentication services.
            {networkRetrying
              ? " Retrying..."
              : " Please check your connection."}
          </Alert>

          {networkRetrying ? (
            <>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                Waiting for network recovery...
              </Typography>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                setNetworkRetrying(true);
                signIn();
              }}
              disabled={loading}
            >
              Retry Sign In
            </Button>
          )}
        </Box>
      </Container>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="h6" color="text.secondary">
            Securing your session...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            NSP Pro Healthcare Scheduling Platform
          </Typography>
        </Box>
      </Container>
    );
  }

  // Authentication errors (non-network)
  if (error && !isNetworkError(error)) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Authentication Error</AlertTitle>
            {error.message || "An authentication error occurred"}
          </Alert>

          {showManualSignIn ? (
            <Button variant="contained" onClick={signIn} disabled={loading}>
              Sign In Again
            </Button>
          ) : (
            <>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">
                Attempting to resolve automatically...
              </Typography>
            </>
          )}
        </Box>
      </Container>
    );
  }

  // Not authenticated
  if (requireAuth && !isAuthenticated) {
    if (showManualSignIn) {
      return (
        <Container maxWidth="sm">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="50vh"
            gap={2}
          >
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>Sign In Required</AlertTitle>
              Please click the button below to sign in to NSP Pro.
            </Alert>

            <Button
              variant="contained"
              onClick={signIn}
              disabled={loading}
              size="large"
            >
              Sign In to NSP Pro
            </Button>

            <Typography variant="caption" color="text.secondary">
              Automatic redirect didn&apos;t work? Click the button above.
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              NSP Pro Healthcare Scheduling Platform
            </Typography>
          </Box>
        </Container>
      );
    }

    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="50vh"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="h6" color="text.secondary">
            Redirecting to secure authentication...
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            NSP Pro Healthcare Scheduling Platform
          </Typography>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
}
