'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container,
  Alert,
  AlertTitle,
} from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

function redirectToSignIn() {
  const pathLocaleMatch = window.location.pathname.match(/\/(en|fr|es)\//);
  const lng = pathLocaleMatch?.[1] || 'fr';
  window.location.href = `/${lng}/auth/signin`;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, loading, error } = useAuth();
  const [networkRetrying, setNetworkRetrying] = useState(false);
  const [showManualSignIn, setShowManualSignIn] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) return;

    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out after 6s — forcing sign-in redirect');
        setLoadingTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  useEffect(() => {
    if (loadingTimedOut && !isAuthenticated) {
      redirectToSignIn();
    }
  }, [loadingTimedOut, isAuthenticated]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (requireAuth && !loading && !error && !isAuthenticated) {
      const timer = setTimeout(() => {
        if (!isAuthenticated && !loading && !error) {
          redirectToSignIn();
        }
      }, 100);

      const fallbackTimer = setTimeout(() => {
        if (!isAuthenticated && !loading && !error) {
          setShowManualSignIn(true);
        }
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(fallbackTimer);
      };
    }

    if (error) {
      let manualSignInTimer: ReturnType<typeof setTimeout> | undefined;
      let autoRedirectTimer: ReturnType<typeof setTimeout> | undefined;

      const isTerminal =
        error.includes('No matching state') ||
        error.includes('No state in response') ||
        error.includes('Invalid state');

      if (isTerminal) {
        autoRedirectTimer = setTimeout(() => {
          if (!isAuthenticated) {
            redirectToSignIn();
          }
        }, 2000);
      } else {
        manualSignInTimer = setTimeout(() => {
          if (!isAuthenticated) {
            setShowManualSignIn(true);
          }
        }, 3000);
      }

      return () => {
        if (autoRedirectTimer) clearTimeout(autoRedirectTimer);
        if (manualSignInTimer) clearTimeout(manualSignInTimer);
      };
    }
  }, [loading, requireAuth, isAuthenticated, error]);

  if (requireAuth && (loading || !isAuthenticated)) {
    if (networkRetrying) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Box textAlign="center">
            <CircularProgress size={32} sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Checking connection...
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Retrying in a moment. If this persists, please check your internet connection.
            </Typography>
          </Box>
        </Container>
      );
    }

    if (showManualSignIn) {
      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Session expired</AlertTitle>
            Please sign in again to continue.
          </Alert>
          <Box textAlign="center">
            <Button variant="contained" size="large" onClick={redirectToSignIn}>
              Sign In
            </Button>
          </Box>
        </Container>
      );
    }

    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="60vh"
      >
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (error && requireAuth) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Authentication Error</AlertTitle>
          {error}
        </Alert>
        <Box textAlign="center">
          <Button variant="contained" onClick={redirectToSignIn}>
            Sign In
          </Button>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
}
