/**
 * Test configuration for E2E and integration tests
 *
 * This module centralizes test environment configuration and provides
 * type-safe access to required environment variables.
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Detect if we're running in CI environment
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

// Only load .env.test.local in local development, not in CI
if (!isCI) {
  // Load test environment variables from .env.test.local
  // This file should contain sensitive test credentials and not be committed
  const envPath = path.resolve(process.cwd(), ".env.test.local");
  const result = dotenv.config({ path: envPath });

  // Log configuration loading status (without exposing sensitive data)
  if (result.error) {
    console.warn(`Warning: Could not load test environment file at ${envPath}`);
    console.warn("Falling back to system environment variables");
  } else {
    console.log(
      "Test environment configuration loaded successfully from .env.test.local"
    );
  }
} else {
  console.log(
    "Running in CI environment - using environment variables directly"
  );
}

export interface TestConfig {
  /** Base URL for the API server during testing */
  apiUrl: string;
  /** Frontend URL for navigation during tests */
  frontendUrl: string;
  /** URL for Permit.io PDP, if used */
  permitUrl: string;
  /** Authentication token for API requests in tests */
  authToken: string;
  /** Development User ID for X-Dev-User-ID header */
  devUserId: string;
  /** Optional second Development User ID for multi-user test scenarios */
  devUserId2?: string;
  /** Development API Key for X-API-Key header */
  devApiKey: string;
  /** Test environment (development, staging, production) */
  environment: "development" | "staging" | "production";
  /** Confirmation token for test utilities */
  confirmationToken: string;
  /** Database reset timeout in milliseconds */
  dbResetTimeoutMs: number;
  /** API ready check timeout in milliseconds */
  apiReadyTimeoutMs: number;
}

/**
 * Determine test environment based on configuration
 */
function determineEnvironment(): "development" | "staging" | "production" {
  const env = process.env.TEST_ENVIRONMENT?.toLowerCase();

  if (env === "staging" || env === "production") {
    return env as "staging" | "production";
  }

  // Default to development for local testing
  return "development";
}

/**
 * Validates environment-specific required variables
 * Follows security best practices by not logging sensitive values
 */
function validateRequiredEnvVars(): void {
  const environment = determineEnvironment();
  const required: string[] = [];

  if (environment === "development") {
    required.push("TEST_USER_ID");
    // For API key, accept either TEST_API_KEY or DEV_API_KEY
    if (!process.env.TEST_API_KEY && !process.env.DEV_API_KEY) {
      required.push("TEST_API_KEY or DEV_API_KEY");
    }
  } else {
    required.push("TEST_AUTH_TOKEN");
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required test environment variables for ${environment}: ${missing.join(
        ", "
      )}\n` +
        `Environment: ${environment}\n` +
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
  const environment = determineEnvironment();
  validateRequiredEnvVars();

  const config: TestConfig = {
    apiUrl: process.env.TEST_API_URL || "http://localhost:4000",
    frontendUrl: process.env.TEST_FRONTEND_URL || "http://localhost:3000",
    permitUrl: process.env.PERMIT_PDP_URL || "http://localhost:7766", // Default to local PDP
    environment,
    authToken: process.env.TEST_AUTH_TOKEN || "",
    devUserId: process.env.TEST_USER_ID || "",
    devUserId2: process.env.TEST_USER_ID_2,
    devApiKey: process.env.TEST_API_KEY || process.env.DEV_API_KEY || "",
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

  // Security: Don't log sensitive configuration values
  console.log("Test Environment Configuration:", {
    environment: config.environment,
    apiUrl: config.apiUrl,
    frontendUrl: config.frontendUrl,
    confirmationToken: config.confirmationToken,
    dbResetTimeoutMs: config.dbResetTimeoutMs,
    apiReadyTimeoutMs: config.apiReadyTimeoutMs,
    authTokenConfigured: !!config.authToken,
    devUserIdConfigured: !!config.devUserId,
    devApiKeyConfigured: !!config.devApiKey,
  });

  return config;
}

/**
 * Global test configuration instance
 * Loads configuration once and reuses across test files
 */
export const testConfig = loadTestConfig();
