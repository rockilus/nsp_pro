export const cognitoAuthConfig = {
  authority:
    process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ||
    "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_9tyN1YsF6",
  client_id:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "2rccpq0s894f6a66d1hmimship",
  redirect_uri:
    process.env.NEXT_PUBLIC_REDIRECT_URI ||
    "https://app.rockilus.com/fr/plan/workers",
  post_logout_redirect_uri:
    process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || "https://www.rockilus.com",
  response_type: "code",
  scope: "email openid phone",
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  monitorSession: false,
  checkSessionInterval: 30000, // Increased to 30 seconds to reduce frequency
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
};

export const cognitoDomain =
  process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
  "https://eu-west-39tyn1ysf6.auth.eu-west-3.amazoncognito.com";

export const logoutUri =
  process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || "https://www.rockilus.com";

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
      error?.toString?.()?.includes(errorType)
  );
};
