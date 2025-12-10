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
  const [callbackTimeout, setCallbackTimeout] = useState(false);

  useEffect(() => {
    // Check if we're handling an OAuth callback (has code and state in URL)
    const isHandlingCallback =
      typeof window !== "undefined" &&
      window.location.search.includes("code=") &&
      window.location.search.includes("state=");

    if (isHandlingCallback) {
      console.log(
        "🔄 OAuth callback detected in URL, waiting for authentication..."
      );
      console.log("Auth state:", {
        isAuthenticated,
        loading,
        hasError: !!error,
      });

      // Set a timeout for callback processing (10 seconds)
      const callbackTimer = setTimeout(() => {
        if (!isAuthenticated) {
          console.error("❌ Callback processing timed out after 10 seconds");
          setCallbackTimeout(true);
          // Clean up the URL by removing query params
          if (typeof window !== "undefined") {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
          }
        }
      }, 10000);

      return () => clearTimeout(callbackTimer);
    }

    // If callback timed out, trigger manual sign-in
    if (callbackTimeout && !isAuthenticated) {
      console.log("🔄 Callback failed, triggering new sign-in...");
      const resetTimer = setTimeout(() => {
        setCallbackTimeout(false);
        signIn();
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    // Clean up URL if authenticated and still has callback params
    if (isAuthenticated && isHandlingCallback) {
      console.log("✅ Authentication successful, cleaning up URL...");
      if (typeof window !== "undefined") {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
      return;
    }

    // Also don't redirect if we're still loading (might be processing callback)
    if (loading) {
      console.log("⏳ Still loading authentication state...");
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
            "⚠️ Automatic redirect may have failed, showing manual sign-in button"
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

      const isNetworkIssue = isNetworkError(error);

      // Avoid calling setState synchronously inside the effect body -
      // schedule updates with timers and clear them on cleanup to satisfy
      // react-hooks/set-state-in-effect lint rule.
      let manualSignInTimer: ReturnType<typeof setTimeout> | undefined;
      let networkStartTimer: ReturnType<typeof setTimeout> | undefined;
      let networkRetryTimer: ReturnType<typeof setTimeout> | undefined;

      if (isRotationError && !isNetworkIssue) {
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
      }

      return () => {
        if (manualSignInTimer) clearTimeout(manualSignInTimer);
        if (networkStartTimer) clearTimeout(networkStartTimer);
        if (networkRetryTimer) clearTimeout(networkRetryTimer);
      };
    }
  }, [requireAuth, loading, error, isAuthenticated, signIn, callbackTimeout]);

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
