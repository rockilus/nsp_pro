/**
 * Test configuration for E2E and integration tests
 *
 * This module centralizes test environment configuration and provides
 * type-safe access to required environment variables.
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load test environment variables from .env.test.local
// This file should contain sensitive test credentials and not be committed
const envPath = path.resolve(process.cwd(), ".env.test.local");
const result = dotenv.config({ path: envPath });

// Log configuration loading status (without exposing sensitive data)
if (result.error) {
  console.warn(`Warning: Could not load test environment file at ${envPath}`);
  console.warn("Falling back to system environment variables");
} else {
  console.log("Test environment configuration loaded successfully");
}

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
  testUserId: string; // ID of the test user to be used in tests
  testAPIKey: string; // API key for test user authentication
}

/**
 * Validates that required environment variables are present
 * Follows security best practices by not logging sensitive values
 */
function validateRequiredEnvVars(): void {
  const required = ["TEST_AUTH_TOKEN", "TEST_USER_ID", "TEST_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables: ${missing.join(", ")}\n` +
        "Please ensure these are set in your .env.test.local file or environment.\n" +
        "See TEST_AUTH_SETUP.md for configuration instructions."
    );
  }
}

/**
 * Load and validate test configuration from environment variables
 * Implements secure configuration loading with proper validation
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
    testUserId: process.env.TEST_USER_ID!,
    testAPIKey: process.env.TEST_API!,
  };

  // Validate parsed configuration
  if (config.dbResetTimeoutMs <= 0 || config.apiReadyTimeoutMs <= 0) {
    throw new Error("Timeout values must be positive integers");
  }

  // Security: Don't log sensitive configuration values
  console.log("Environment Configuration:", {
    apiUrl: config.apiUrl,
    frontendUrl: config.frontendUrl,
    confirmationToken: config.confirmationToken,
    dbResetTimeoutMs: config.dbResetTimeoutMs,
    apiReadyTimeoutMs: config.apiReadyTimeoutMs,
    authTokenConfigured: !!config.authToken,
  });

  return config;
}

/**
 * Global test configuration instance
 * Loads configuration once and reuses across test files
 */
export const testConfig = loadTestConfig();
