/**
 * Centralized environment variable configuration
 * All environment variables should be extracted and validated here
 */

export interface EnvironmentConfig {
  isDevelopment: boolean;
  apiUrl: string;
  clientUrl: string;
  devUserId: string;
  devApiKey: string;
  // Production Cognito config
  cognitoAuthority: string;
  cognitoClientId: string;
  redirectUri: string;
  logoutRedirectUri: string;
  cognitoDomain: string;
}

/**
 * Extract and validate environment variables
 */
function createEnvironmentConfig(): EnvironmentConfig {
  const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === "development";

  console.log("Environment Configuration:", process.env.NEXT_PUBLIC_NODE_ENV);

  // Extracted so redirectUri can reference it without repeating the fallback logic.
  const clientUrl = isDevelopment
    ? process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000"
    : process.env.NEXT_PUBLIC_CLIENT_URL || "https://app.rockilus.com";

  return {
    isDevelopment,

    // API Configuration
    apiUrl: isDevelopment
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      : process.env.NEXT_PUBLIC_API_URL || "https://api.rockilus.com",

    // Client URL - used for constructing links in emails, etc.
    clientUrl,

    // Development Configuration - must match backend
    devUserId: process.env.NEXT_PUBLIC_DEV_USER_ID || "dev-user-123",
    devApiKey: process.env.NEXT_PUBLIC_DEV_API_KEY || "dev-service-key-12345",

    // Production Cognito Configuration
    cognitoAuthority:
      process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ||
      "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_9tyN1YsF6",
    cognitoClientId:
      process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "2rccpq0s894f6a66d1hmimship",
    // Base client URL — the per-locale callback path (/en/, /fr/, /es/) is
    // appended dynamically at sign-in time in auth-context.tsx so Cognito
    // receives the correct redirect_uri for the user's locale.
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || clientUrl,
    logoutRedirectUri:
      process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || "https://www.rockilus.com",
    cognitoDomain:
      process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
      (isDevelopment
        ? "https://auth.staging.rockilus.com"
        : "https://auth.rockilus.com"),
  };
}

// Export singleton instance
export const env = createEnvironmentConfig();

// Export helper functions
export const isDevelopment = () => env.isDevelopment;
export const isProduction = () => !env.isDevelopment;

// Log configuration on startup (development only)
if (env.isDevelopment && typeof window !== "undefined") {
  console.log("Environment Configuration:", {
    isDevelopment: env.isDevelopment,
    apiUrl: env.apiUrl,
    devUserId: env.devUserId,
  });
}
