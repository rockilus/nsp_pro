"use client";

/**
 * OAuth Callback Page
 *
 * Cognito redirects the user here after a successful sign-in (redirect_uri).
 * react-oidc-context's AuthProvider automatically detects ?code=&state=, exchanges
 * the code for tokens, and fires onSigninCallback (which cleans the URL).
 *
 * This page's sole job is:
 *  1. Show a lightweight loading screen while the token exchange runs.
 *  2. Redirect to /[lng]/plan/schedule/ once isAuthenticated is true.
 *  3. Surface an error and offer a retry if the exchange fails.
 *
 * Stale PKCE state cleanup is handled by pruneOidcState() in auth-context.tsx,
 * which runs on every mount and preserves the active ?state= entry.
 *
 * Intentionally imports NO feature chunks — this page must load even when the
 * app has just been redeployed and old cached HTML references stale chunk hashes.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container,
  Alert,
  AlertTitle,
} from "@mui/material";
import { useAuth } from "../../../contexts/auth-context";

interface CallbackPageProps {
  params: { lng: string };
}

export default function CallbackPage({ params }: CallbackPageProps) {
  const { isAuthenticated, loading, error, signIn } = useAuth();
  const router = useRouter();
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Redirect once the token exchange completes successfully.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(`/${params.lng}/plan/schedule/`);
    }
  }, [isAuthenticated, router, params.lng]);

  // Surface any auth errors that appeared during the exchange.
  // Schedule setState via setTimeout to avoid synchronous-setState-in-effect lint error.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(
      () =>
        setCallbackError(error.message ?? "An authentication error occurred."),
      0,
    );
    return () => clearTimeout(t);
  }, [error]);

  if (callbackError) {
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
            <AlertTitle>Sign-in Failed</AlertTitle>
            {callbackError}
          </Alert>
          <Button variant="contained" onClick={signIn} disabled={loading}>
            Try Again
          </Button>
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
          Completing sign-in...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          NSP Pro Healthcare Scheduling Platform
        </Typography>
      </Box>
    </Container>
  );
}
