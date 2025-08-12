# Test Configuration and Authentication Setup

This document explains how to set up the test environment configuration for Playwright tests, including authentication for API calls.

## Environment Setup

1. Create a `.env.test.local` file in the `frontend` directory (this file is already gitignored):

```bash
# Required: Authentication token for API requests
TEST_AUTH_TOKEN=your-actual-test-token-here

# Optional: API and frontend URLs (defaults shown)
TEST_API_URL=http://localhost:4000
TEST_FRONTEND_URL=http://localhost:3000

# Optional: Confirmation token for test utilities
TEST_CONFIRMATION_TOKEN=test-reset-confirm

# Optional: Timeout configurations (in milliseconds)
TEST_DB_RESET_TIMEOUT_MS=30000
TEST_API_READY_TIMEOUT_MS=10000
```

2. Replace `your-actual-test-token-here` with a valid authentication token that can be used for testing.

## Test Configuration Architecture

The test configuration is centralized in `tests/config/test-config.ts` and provides:

- **Type safety**: All configuration options are typed with TypeScript interfaces
- **Validation**: Automatic validation of required environment variables at startup
- **Default values**: Sensible defaults for optional configuration
- **Error handling**: Clear error messages for missing or invalid configuration

### Configuration Options

- `TEST_AUTH_TOKEN` (required): Bearer token for API authentication
- `TEST_API_URL` (optional): Base URL for the backend API (default: http://localhost:4000)
- `TEST_FRONTEND_URL` (optional): Base URL for the frontend (default: http://localhost:3000)
- `TEST_CONFIRMATION_TOKEN` (optional): Token for test utility endpoints (default: test-reset-confirm)
- `TEST_DB_RESET_TIMEOUT_MS` (optional): Database reset timeout in milliseconds (default: 30000)
- `TEST_API_READY_TIMEOUT_MS` (optional): API ready check timeout in milliseconds (default: 10000)

## How to Get a Test Token

### Option 1: Manual Token Generation (Temporary)
1. Log in to your test environment through the UI
2. Open browser developer tools
3. Find the Authorization header in a network request
4. Copy the Bearer token value
5. Add it to your `.env.test.local` file

### Option 2: Test User Credentials (Recommended for CI/CD)
If you have dedicated test user credentials, you can:
1. Set up a test user in your Cognito user pool
2. Use the credentials to programmatically obtain a token
3. Store the long-lived token or credentials in your test environment

## Usage in Tests

The test configuration is automatically loaded and validated when imported:

```typescript
import { testConfig } from "./config/test-config";

// Access configuration values
const apiUrl = testConfig.apiUrl;
const frontendUrl = testConfig.frontendUrl;
```

The `DatabaseTestUtils.createTeam()` method automatically uses the configuration:

```typescript
// This will use the API to create a team instead of UI interactions
const testTeam = await dbUtils.createTeam({ name: "Test Team 1" });
```

## Benefits

- **Faster tests**: No UI interaction needed for setup
- **More reliable**: Eliminates UI timing issues
- **Better isolation**: Clean separation between setup and test logic
- **Reusable**: Can create multiple teams or other resources easily
- **Configurable**: Easy to adapt to different test environments
- **Type safe**: Full TypeScript support with validation

## Security Notes

- The `.env.test.local` file is gitignored and won't be committed
- Only use test tokens, never production tokens
- Consider using short-lived tokens for better security
- In CI/CD, use environment variables instead of files
- All required environment variables are validated at startup

## Error Handling

If required environment variables are missing, you'll see a clear error message:

```
Missing required test environment variables: TEST_AUTH_TOKEN
Please ensure these are set in your .env.test.local file or environment.
```

This helps ensure proper test environment setup before running tests.
