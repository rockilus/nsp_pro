'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useOidcAuth, ErrorContext } from 'react-oidc-context';
import { User } from 'oidc-client-ts';
import { cognitoAuthConfig, cognitoDomain, logoutUri, isNetworkError } from '../config/cognito';
import { env } from '../config/env';
import dayjs from 'dayjs';

interface AuthContextType {
  user: User | undefined | null;
  loading: boolean;
  error: ErrorContext | undefined;
  isAuthenticated: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutRedirect: (locale?: string) => Promise<void>;
}

/**
 * Detects if the current device is mobile Safari
 */
const isMobileSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Validates that a URL is safe for logout redirect to prevent open redirect attacks
 */
const isValidLogoutUri = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    const allowedHosts = ['www.rockilus.com', 'app.rockilus.com', 'localhost', '127.0.0.1'];

    return (
      allowedHosts.includes(url.hostname) &&
      (url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
};

/**
 * Securely clears authentication tokens from both localStorage and sessionStorage
 * Enhanced for refresh token rotation support
 */
const clearAuthTokens = (): void => {
  try {
    const tokenKey = `oidc.user:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`;

    // Clear from both storage types
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);

    // Also clear refresh token rotation specific keys
    const refreshTokenKeys = [
      `oidc.refresh_token:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`,
      `oidc.silent_renew:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`,
      `oidc.session_state:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`,
    ];

    // Clear any other OIDC-related items from both storages
    const storages = [localStorage, sessionStorage];

    storages.forEach((storage) => {
      try {
        // Clear specific refresh token keys first
        refreshTokenKeys.forEach((key) => storage.removeItem(key));

        const authKeys = Object.keys(storage).filter(
          (key) =>
            key.startsWith('oidc.') ||
            key.includes('cognito') ||
            key.includes('auth') ||
            key.startsWith('_capacitor_'), // Capacitor storage prefix if using mobile
        );

        authKeys.forEach((key) => {
          storage.removeItem(key);
        });
      } catch (storageError) {
        console.warn(
          `Error clearing ${storage === localStorage ? 'localStorage' : 'sessionStorage'}:`,
          storageError,
        );
      }
    });

    // Clear network error tracking
    localStorage.removeItem('refreshAttempts');
    localStorage.removeItem('lastRefreshAttempt');
    localStorage.removeItem('networkErrorCount');
    localStorage.removeItem('lastNetworkError');
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

/**
 * Development Auth Provider - Simple mock authentication for development
 */
function DevelopmentAuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Auto-authenticate in development mode
    setTimeout(() => {
      setIsAuthenticated(true);
      setLoading(false);
      console.log('🔧 Development mode: Auto-authenticated');
    }, 100);
  }, []);

  const signIn = async (): Promise<void> => {
    setLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setLoading(false);
      console.log('🔧 Development sign-in completed');
    }, 500);
  };

  const signOut = async (): Promise<void> => {
    setIsAuthenticated(false);
    console.log('🔧 Development sign-out completed');
  };

  const signOutRedirect = async (locale?: string): Promise<void> => {
    await signOut();
    window.location.href = '/';
  };

  // Create mock user object that matches OIDC structure
  const mockUser = isAuthenticated
    ? ({
        profile: {
          sub: env.devUserId,
          email: 'dev@nsp-pro.com',
          name: 'Development User',
          aud: 'dev-client',
          exp: Math.floor(dayjs().unix() / 1000) + 3600, // 1 hour from now
          iat: Math.floor(dayjs().unix() / 1000),
          iss: 'dev-issuer',
        },
        id_token: env.devUserId, // Use dev user ID as token
        access_token: env.devUserId,
        refresh_token: env.devUserId,
        token_type: 'Bearer',
        scope: 'openid profile email',
        expires_at: Math.floor(dayjs().unix() / 1000) + 3600,
        expires_in: 3600,
        expired: false,
        scopes: ['openid', 'profile', 'email'],
        toStorageString: () => JSON.stringify({}),
        state: null,
        session_state: null,
      } as unknown as User)
    : null;

  const contextValue: AuthContextType = {
    user: mockUser,
    loading,
    error: undefined,
    isAuthenticated,
    accessToken: isAuthenticated ? env.devUserId : null,
    signIn,
    signOut,
    signOutRedirect,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Prunes stale PKCE state entries from localStorage without touching the
 * currently active one.
 *
 * oidc-client-ts stores each sign-in attempt as `oidc.{stateHash}` in
 * localStorage. On the callback URL, the active hash is embedded in
 * `?state=`. Any other `oidc.{hash}` key is from an abandoned flow and
 * can be safely deleted.
 *
 * This is safer than `UserManager.clearStaleState()` because that function
 * uses a time-based threshold (`staleStateAge`) and will delete the active
 * entry if the user spent too long on the Cognito login page.
 */
function pruneOidcState(): void {
  if (typeof window === 'undefined') return;

  const activeState = new URLSearchParams(window.location.search).get('state');

  Object.keys(localStorage)
    .filter((key) => key.startsWith('oidc.') && !key.startsWith('oidc.user:'))
    .forEach((key) => {
      // Keep the entry whose hash matches the current callback's state param.
      if (activeState && key === `oidc.${activeState}`) return;
      localStorage.removeItem(key);
    });
}

/**
 * Production Auth Provider - Full Cognito OIDC authentication
 */
function ProductionAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useOidcAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingRefresh, setRetryingRefresh] = useState<boolean>(false);

  // On mount: prune stale PKCE state entries left in localStorage by abandoned
  // sign-in flows. pruneOidcState() is safe to call even during an active
  // callback because it preserves the entry matching ?state= in the URL.
  useEffect(() => {
    pruneOidcState();
  }, []);

  // Strip ?code=&state= from the URL whenever an auth error is set.
  // Without this, a failed callback URL stays in the address bar and every
  // refresh re-triggers the same failed code exchange, creating an infinite
  // error loop (e.g. "No matching state found in storage" on reload).
  useEffect(() => {
    if (!auth.error) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('state')) {
      console.warn(
        '⚠️ Auth error with callback params in URL — stripping to prevent refresh loop:',
        auth.error.message,
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [auth.error]);

  useEffect(() => {
    // Set loading to false once auth state is determined
    if (!auth.isLoading) {
      setLoading(false);
    }

    // Handle silent renew errors with enhanced network awareness
    const handleSilentRenewError = async (error: any) => {
      console.error('🔴 Silent renew failed:', error);
      setRetryingRefresh(false);

      // Track refresh attempts for debugging
      const attempts = parseInt(localStorage.getItem('refreshAttempts') || '0') + 1;
      localStorage.setItem('refreshAttempts', attempts.toString());
      localStorage.setItem('lastRefreshAttempt', new Date().toISOString());

      // Handle network errors with retry logic
      if (isNetworkError(error)) {
        console.warn('🌐 Network error during token refresh');

        // Don't clear tokens for network errors - retry instead
        if (attempts <= 3) {
          console.log('🔄 Attempting network-aware refresh retry...');
          setRetryingRefresh(true);

          try {
            await handleNetworkAwareRefresh(auth);
            setRetryingRefresh(false);
            return;
          } catch (retryError) {
            console.error('❌ Network-aware refresh retry failed:', retryError);
            setRetryingRefresh(false);
          }
        }
      }

      // Check if it's a refresh token rotation error
      if (
        error?.error === 'invalid_grant' ||
        error?.error_description?.includes('refresh token') ||
        error?.error_description?.includes('Token is not valid')
      ) {
        console.warn(
          '🔄 Refresh token rotation conflict or expiry detected — clearing state and redirecting to login',
        );
        clearAuthTokens();
        // Reset refresh attempt counter on rotation errors
        localStorage.removeItem('refreshAttempts');
        localStorage.removeItem('lastRefreshAttempt');
        // Actively redirect to Cognito so the user isn't silently logged out
        // with no way to recover without a hard refresh.
        try {
          await auth.signinRedirect();
        } catch {
          // Last resort: send to Cognito login page directly
          const authUrl =
            `${cognitoDomain}/oauth2/authorize?` +
            `client_id=${cognitoAuthConfig.client_id}&` +
            `response_type=${cognitoAuthConfig.response_type}&` +
            `scope=${encodeURIComponent(cognitoAuthConfig.scope)}&` +
            `redirect_uri=${encodeURIComponent(cognitoAuthConfig.redirect_uri)}`;
          window.location.href = authUrl;
        }
      }
    };

    // Handle access token expiring notification
    const handleAccessTokenExpiring = () => {
      console.log('⏰ Access token expiring soon, silent renew will be attempted');

      // Pre-emptively check network connectivity
      if (!navigator.onLine) {
        console.warn('🌐 Device appears offline, refresh may fail');
      }
    };

    // Handle successful silent renew
    const handleSilentRenewSuccess = () => {
      console.log('✅ Silent renew successful, new tokens received');
      // Reset all error counters on successful renewal
      localStorage.removeItem('refreshAttempts');
      localStorage.removeItem('networkErrorCount');
      localStorage.setItem('lastSuccessfulRefresh', new Date().toISOString());
      setRetryingRefresh(false);
    };

    // Listen for OIDC events if available
    if (auth.events) {
      auth.events.addSilentRenewError(handleSilentRenewError);
      auth.events.addAccessTokenExpiring(handleAccessTokenExpiring);
      auth.events.addUserSignedIn(handleSilentRenewSuccess);

      return () => {
        // Clean up event listeners
        auth.events?.removeSilentRenewError?.(handleSilentRenewError);
        auth.events?.removeAccessTokenExpiring?.(handleAccessTokenExpiring);
        auth.events?.removeUserSignedIn?.(handleSilentRenewSuccess);
      };
    }
  }, [auth.isLoading, auth.events, auth]);

  const signOutRedirect = async (locale?: string): Promise<void> => {
    // Build locale-aware landing page URI: https://www.rockilus.com/fr/ etc.
    const supportedLocales = ['en', 'fr', 'es'];
    const effectiveLocale = locale && supportedLocales.includes(locale) ? locale : null;
    const targetUri = effectiveLocale ? `${logoutUri}/${effectiveLocale}/` : logoutUri;

    try {
      // Validate logout URI for security
      if (!isValidLogoutUri(targetUri)) {
        throw new Error('Invalid logout URI detected');
      }

      // Clear local auth state first
      clearAuthTokens();

      // Use AWS recommended logout URL format
      const logoutUrl = `${cognitoDomain}/logout?client_id=${
        cognitoAuthConfig.client_id
      }&logout_uri=${encodeURIComponent(targetUri)}`;

      // Use window.location.href as recommended by AWS
      window.location.href = logoutUrl;
    } catch (error) {
      console.error('Logout redirect failed:', error);

      // Fallback: clear local state and redirect to landing page
      try {
        clearAuthTokens();
        await auth.removeUser();

        if (isValidLogoutUri(targetUri)) {
          window.location.href = targetUri;
        } else {
          // Safe fallback to current origin
          window.location.href = window.location.origin;
        }
      } catch (fallbackError) {
        console.error('Fallback logout failed:', fallbackError);
        // Last resort: reload page to clear any remaining state
        window.location.reload();
      }
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      clearAuthTokens();
      await auth.removeUser();
    } catch (error) {
      console.error('Local signout failed:', error);
      // Still clear tokens even if removeUser fails
      clearAuthTokens();
    }
  };

  const signIn = async (): Promise<void> => {
    try {
      // Always use react-oidc-context's signinRedirect for proper state management
      // This ensures the library can handle the callback correctly
      console.log('🔐 Initiating auth redirect via react-oidc-context');

      // Mobile Safari detection for logging
      const isSafari = isMobileSafari();
      if (isSafari) {
        console.log('📱 Mobile Safari detected');
      }

      // Detect the active locale: URL path → browser language → 'en'
      const supportedLocales = ['en', 'fr', 'es'];
      const pathLocaleMatch = window.location.pathname.match(/\/(en|fr|es)\//);
      const browserLocale = navigator.language.split('-')[0];
      const locale =
        pathLocaleMatch?.[1] ?? (supportedLocales.includes(browserLocale) ? browserLocale : 'fr');

      // Persist for the callback page so it can set the language on new users.
      localStorage.setItem('rockilus_signup_locale', locale);

      await auth.signinRedirect({
        extraQueryParams: { ui_locales: locale },
        redirect_uri: `${env.clientUrl}/${locale}/callback/`,
      });
    } catch (error) {
      console.error('❌ Sign-in redirect failed:', error);

      // Only use manual redirect as last resort if signinRedirect throws
      // This should rarely happen
      try {
        // Re-derive locale for the fallback branch
        const supportedLocales = ['en', 'fr', 'es'];
        const pathLocaleMatch = window.location.pathname.match(/\/(en|fr|es)\//);
        const browserLocale = navigator.language.split('-')[0];
        const locale =
          pathLocaleMatch?.[1] ?? (supportedLocales.includes(browserLocale) ? browserLocale : 'fr');

        const localeRedirectUri = `${env.clientUrl}/${locale}/callback/`;
        const authUrl =
          `${cognitoDomain}/oauth2/authorize?` +
          `client_id=${cognitoAuthConfig.client_id}&` +
          `response_type=${cognitoAuthConfig.response_type}&` +
          `scope=${encodeURIComponent(cognitoAuthConfig.scope)}&` +
          `redirect_uri=${encodeURIComponent(localeRedirectUri)}&` +
          `ui_locales=${locale}`;

        console.log('🔄 Falling back to window.location.href redirect');
        window.location.href = authUrl;
      } catch (fallbackError) {
        console.error('❌ Fallback redirect also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  const contextValue: AuthContextType = {
    user: auth.user,
    loading: auth.isLoading || loading || retryingRefresh,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    accessToken: auth.user?.access_token || null,
    signIn,
    signOut,
    signOutRedirect,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Network-aware retry mechanism for token refresh
 */
const handleNetworkAwareRefresh = async (auth: any): Promise<void> => {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempting token refresh (attempt ${attempt}/${maxRetries})`);

      // Check if we have a valid refresh token before attempting
      if (!auth.user?.refresh_token) {
        console.warn('❌ No refresh token available, skipping refresh');
        throw new Error('No refresh token available');
      }

      await auth.signinSilent();
      console.log('✅ Token refresh successful');

      // Reset network error tracking on success
      localStorage.removeItem('networkErrorCount');
      localStorage.removeItem('lastNetworkError');
      localStorage.setItem('lastSuccessfulRefresh', new Date().toISOString());

      return;
    } catch (error: any) {
      console.error(`❌ Token refresh attempt ${attempt} failed:`, error);

      if (isNetworkError(error)) {
        const networkErrorCount = parseInt(localStorage.getItem('networkErrorCount') || '0') + 1;
        localStorage.setItem('networkErrorCount', networkErrorCount.toString());
        localStorage.setItem('lastNetworkError', new Date().toISOString());

        if (attempt < maxRetries) {
          console.log(`🔄 Network error detected, retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else {
          console.error('❌ Max network retry attempts reached');
          throw new Error('Network connectivity issues preventing token refresh');
        }
      }

      // Handle refresh token rotation specific errors
      if (
        error?.error === 'invalid_grant' ||
        error?.error_description?.includes('refresh token') ||
        error?.error_description?.includes('Token is not valid')
      ) {
        console.warn('🔄 Refresh token rotation conflict detected');
        clearAuthTokens();
        throw new Error('Refresh token rotation conflict - please sign in again');
      }

      // For other errors, don't retry
      throw error;
    }
  }
};

/**
 * Unified Auth Context Provider - Automatically uses development or production auth
 * based on environment configuration. Provides a single, consistent interface.
 */
export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Security: Default to production mode unless explicitly set to development
  if (env.isDevelopment) {
    console.log('🔧 Using development authentication');
    return <DevelopmentAuthProvider>{children}</DevelopmentAuthProvider>;
  }

  console.log('🔒 Using production authentication (Cognito OIDC)');
  return <ProductionAuthProvider>{children}</ProductionAuthProvider>;
}
