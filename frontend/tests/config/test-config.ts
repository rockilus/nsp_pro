/**
 * Test configuration for E2E and integration tests
 *
 * This module centralizes test environment configuration and provides
 * type-safe access to required environment variables.
 */

export interface TestConfig {
  /** Base URL for the API server during testing */
  apiUrl: string;
  /** Frontend URL for navigation during tests */
  frontendUrl: string;
  /** Authentication token for API requests in tests */
  authToken: string;
  /** Confirmation token for test utilities */
  confirmationToken: string;
  /** Database reset timeout in milliseconds */
  dbResetTimeoutMs: number;
  /** API ready check timeout in milliseconds */
  apiReadyTimeoutMs: number;
}

/**
 * Validates that required environment variables are present
 */
function validateRequiredEnvVars(): void {
  const required = ["TEST_AUTH_TOKEN"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missing.join(", ")}\n` +
        "Please ensure these are set in your .env.test.local file or environment."
    );
  }
}

/**
 * Load and validate test configuration from environment variables
 */
export function loadTestConfig(): TestConfig {
  // Validate required environment variables
  validateRequiredEnvVars();

  const config: TestConfig = {
    apiUrl: process.env.TEST_API_URL || "http://localhost:4000",
    frontendUrl: process.env.TEST_FRONTEND_URL || "http://localhost:3000",
    authToken: process.env.TEST_AUTH_TOKEN!,
    confirmationToken:
      process.env.TEST_CONFIRMATION_TOKEN || "test-reset-confirm",
    dbResetTimeoutMs: parseInt(
      process.env.TEST_DB_RESET_TIMEOUT_MS || "30000",
      10
    ),
    apiReadyTimeoutMs: parseInt(
      process.env.TEST_API_READY_TIMEOUT_MS || "10000",
      10
    ),
  };

  // Validate parsed configuration
  if (config.dbResetTimeoutMs <= 0 || config.apiReadyTimeoutMs <= 0) {
    throw new Error("Timeout values must be positive integers");
  }

  return config;
}

/**
 * Global test configuration instance
 * Loads configuration once and reuses across test files
 */
export const testConfig = loadTestConfig();
