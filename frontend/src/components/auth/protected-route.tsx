"use client";

import React from "react";
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
            Loading...
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
          <Button variant="contained" onClick={signIn}>
            Try Again
          </Button>
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
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Rockilus
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Please sign in to access your healthcare scheduling platform.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={signIn}
            sx={{ mt: 2, px: 4, py: 1.5 }}
          >
            Sign In
          </Button>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
}
