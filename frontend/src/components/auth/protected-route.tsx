"use client";

import React, { useEffect } from "react";
import { useAuth } from "../../contexts/auth-context";
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container,
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

  // Immediate redirect for unauthenticated users
  useEffect(() => {
    if (requireAuth && !loading && !error && !isAuthenticated) {
      signIn();
    }

    // Handle specific refresh token rotation errors
    if (
      error?.message?.includes("invalid_grant") ||
      error?.message?.includes("refresh token") ||
      error?.message?.includes("Token is not valid")
    ) {
      console.warn(
        "Refresh token rotation error detected, forcing re-authentication"
      );
      signIn();
    }
  }, [requireAuth, loading, error, isAuthenticated, signIn]);

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
        </Box>
      </Container>
    );
  }

  if (error) {
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
          <Typography variant="h6" color="error">
            Authentication Error
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {error.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Attempting to redirect...
          </Typography>
          <CircularProgress size={24} />
        </Box>
      </Container>
    );
  }

  if (requireAuth && !isAuthenticated) {
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
