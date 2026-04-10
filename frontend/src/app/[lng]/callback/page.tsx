'use client';

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

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
  Container,
  Alert,
  AlertTitle,
} from '@mui/material';
import { useAuth } from '../../../contexts/auth-context';
import { fallbackLng, languages } from '../../i18n/settings';
import { env } from '../../../config/env';

interface CallbackPageProps {
  // Next.js 15: params is a Promise even for client components.
  params: Promise<{ lng: string }>;
}

export default function CallbackPage({ params }: CallbackPageProps) {
  // Unwrap the params Promise synchronously under React 19 concurrent model.
  // Falls back to fallbackLng so we never navigate to /undefined/plan/schedule/.
  const { lng: rawLng } = use(params);
  const safeLng = languages.includes(rawLng) ? rawLng : fallbackLng;

  const { isAuthenticated, loading, error, signIn, accessToken } = useAuth();
  const router = useRouter();
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Once authenticated: optionally set language for new users, then navigate.
  useEffect(() => {
    if (!isAuthenticated) return;

    const updateNewUserLanguageAndRedirect = async () => {
      const storedLocale = localStorage.getItem('rockilus_signup_locale');

      if (storedLocale && accessToken) {
        try {
          const meResponse = await fetch(`${env.apiUrl}/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (meResponse.ok) {
            const userData = await meResponse.json();
            const nowUnix = Math.floor(Date.now() / 1000);
            const isNewUser = userData.signUpAt > nowUnix - 5 * 60;

            if (isNewUser && userData.language !== storedLocale) {
              await fetch(`${env.apiUrl}/users/${userData.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  language: storedLocale,
                }),
              });
            }
          }
        } catch (err) {
          console.error('Failed to update new user language:', err);
        } finally {
          localStorage.removeItem('rockilus_signup_locale');
        }
      }

      router.replace(`/${safeLng}/plan/schedule/`);
    };

    updateNewUserLanguageAndRedirect();
  }, [isAuthenticated, router, safeLng, accessToken]);

  // Surface any auth errors that appeared during the exchange.
  // Schedule setState via setTimeout to avoid synchronous-setState-in-effect lint error.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(
      () => setCallbackError(error.message ?? 'An authentication error occurred.'),
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
