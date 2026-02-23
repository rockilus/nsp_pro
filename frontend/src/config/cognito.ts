import { WebStorageStateStore } from "oidc-client-ts";
import { env } from "./env";

export const cognitoAuthConfig = {
  authority: env.cognitoAuthority,
  client_id: env.cognitoClientId,
  redirect_uri: env.redirectUri,
  // Dedicated URI for silent token renewal — avoids iframe fallback that Safari ITP blocks.
  // Must be registered as a callback URL in Cognito and handled by the /silent-renew page.
  silent_redirect_uri: `${env.clientUrl}/silent-renew`,
  post_logout_redirect_uri: env.logoutRedirectUri,
  response_type: "code",
  scope: "email openid phone aws.cognito.signin.user.admin",
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  monitorSession: false,
  checkSessionInterval: 30000, // 30 seconds
  revokeAccessTokenOnSignout: true,
  revokeRefreshTokenOnSignout: true,
  validateSubOnSilentRenew: true,
  // Enhanced settings for refresh token rotation and network resilience
  silentRequestTimeout: 45000, // Increased timeout for network issues
  accessTokenExpiringNotificationTime: 120, // 2 minutes warning before expiration
  // Network resilience settings
  loadUserInfo: false, // Reduce additional network calls
  filterProtocolClaims: true,
  // Silent renew retry settings
  staleStateAge: 900, // 15 minutes before considering state stale
  // Explicit localStorage so behaviour is consistent and auditable
  userStore:
    typeof window !== "undefined"
      ? new WebStorageStateStore({ store: window.localStorage })
      : undefined,
  // Clean up ?code=&state= from the URL after the OAuth callback exchange
  onSigninCallback: () => {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },
};

export const cognitoDomain = env.cognitoDomain;

export const logoutUri = env.logoutRedirectUri;

// Network resilience helper
export const isNetworkError = (error: any): boolean => {
  const networkErrors = [
    "ERR_NETWORK_CHANGED",
    "ERR_INTERNET_DISCONNECTED",
    "ERR_NETWORK_ACCESS_DENIED",
    "TypeError: Failed to fetch",
    "NetworkError",
    "timeout",
    "Network request failed",
    "Failed to fetch",
  ];

  return networkErrors.some(
    (errorType) =>
      error?.message?.includes(errorType) ||
      error?.toString?.()?.includes(errorType),
  );
};
