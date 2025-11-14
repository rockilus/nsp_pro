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

  useEffect(() => {
    if (requireAuth && !loading && !error && !isAuthenticated) {
      // Delay automatic redirect to avoid issues during token refresh
      const timer = setTimeout(() => {
        if (!isAuthenticated && !loading && !error) {
          signIn();
        }
      }, 1000);

      return () => clearTimeout(timer);
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
              <AlertTitle>Authentication Required</AlertTitle>
              Your session has expired. Please sign in to continue.
            </Alert>

            <Button
              variant="contained"
              onClick={signIn}
              disabled={loading}
              size="large"
            >
              Sign In to NSP Pro
            </Button>

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
