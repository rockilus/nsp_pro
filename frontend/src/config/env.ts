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
  copilotEnabled: boolean;
}

/**
 * Extract and validate environment variables
 */
function createEnvironmentConfig(): EnvironmentConfig {
  const isDevelopment = process.env.NEXT_PUBLIC_NODE_ENV === 'development';

  console.log('Environment Configuration:', process.env.NEXT_PUBLIC_NODE_ENV);

  // Extracted so redirectUri can reference it without repeating the fallback logic.
  const clientUrl = isDevelopment
    ? process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_CLIENT_URL || 'https://app.rockilus.com';

  return {
    isDevelopment,

    // API Configuration
    apiUrl: isDevelopment
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      : process.env.NEXT_PUBLIC_API_URL || 'https://api.rockilus.com',

    // Client URL - used for constructing links in emails, etc.
    clientUrl,

    // Copilot — off by default, opt-in with NEXT_PUBLIC_ENABLE_COPILOT=true
    copilotEnabled: process.env.NEXT_PUBLIC_ENABLE_COPILOT === 'true',

    // Development Configuration - must match backend
    devUserId: process.env.NEXT_PUBLIC_DEV_USER_ID || 'dev-user-123',
    devApiKey: process.env.NEXT_PUBLIC_DEV_API_KEY || 'dev-service-key-12345',
  };
}

// Export singleton instance
export const env = createEnvironmentConfig();

// Export helper functions
export const isDevelopment = () => env.isDevelopment;
export const isProduction = () => !env.isDevelopment;

// Log configuration on startup (development only)
if (env.isDevelopment && typeof window !== 'undefined') {
  console.log('Environment Configuration:', {
    isDevelopment: env.isDevelopment,
    apiUrl: env.apiUrl,
    devUserId: env.devUserId,
  });
}
