# Test Configuration and Authentication Setup

This document explains how to set up the test environment configuration for Playwright tests, including environment-aware authentication for API calls.

## Environment-Specific Authentication

### Development Environment (Default)
- Uses `X-Dev-User-ID` and `X-API-Key` headers
- Set `TEST_ENVIRONMENT=development`
- Configure `TEST_USER_ID` and `TEST_API_KEY`

### Staging/Production Environment
- Uses JWT Bearer token authentication
- Set `TEST_ENVIRONMENT=staging` or `TEST_ENVIRONMENT=production`
- Configure `TEST_AUTH_TOKEN`

## Environment Setup

### Local Development Testing (Default)

Create a `.env.test.local` file in the `frontend` directory:

```bash
# Test Environment Configuration
TEST_ENVIRONMENT=development

# Development Authentication (for local testing)
TEST_USER_ID=64e9b7f1e13e4a1a9c8b4567
TEST_API_KEY=ffb1f25b3585109374ac5fefa1728247ce600a27569c8344d779a57e0186cc93

# API and frontend URLs (optional)
TEST_API_URL=http://localhost:4000
TEST_FRONTEND_URL=http://localhost:3000

# Test utilities configuration (optional)
TEST_CONFIRMATION_TOKEN=test-reset-confirm
TEST_DB_RESET_TIMEOUT_MS=30000
TEST_API_READY_TIMEOUT_MS=10000
```

### Staging Environment Testing

For staging environment, update your `.env.test.local`:

```bash
# Test Environment Configuration
TEST_ENVIRONMENT=staging

# Staging Authentication (JWT token)
TEST_AUTH_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...your-staging-jwt-token

# Staging URLs
TEST_API_URL=https://api-staging.nspro.com
TEST_FRONTEND_URL=https://staging.nspro.com
```

## Test Configuration Architecture

The test configuration is centralized in `tests/config/test-config.ts` and provides:

- **Environment Detection**: Automatically detects development vs staging/production
- **Environment-Specific Validation**: Only requires the auth credentials needed for the current environment
- **Type Safety**: All configuration options are typed with TypeScript interfaces
- **Security**: No sensitive values are logged to console
- **Error Handling**: Clear error messages for missing or invalid configuration

### Configuration Options

#### Required (Environment-Specific)
- **Development**: `TEST_USER_ID`, `TEST_API_KEY`
- **Staging/Production**: `TEST_AUTH_TOKEN`

#### Optional
- `TEST_ENVIRONMENT`: Environment type (default: development)
- `TEST_API_URL`: Base URL for the backend API (default: http://localhost:4000)
- `TEST_FRONTEND_URL`: Base URL for the frontend (default: http://localhost:3000)
- `TEST_CONFIRMATION_TOKEN`: Token for test utility endpoints (default: test-reset-confirm)
- `TEST_DB_RESET_TIMEOUT_MS`: Database reset timeout (default: 30000)
- `TEST_API_READY_TIMEOUT_MS`: API ready check timeout (default: 10000)

## How to Get Authentication Credentials

### Development Environment
Use the test user credentials provided by your development environment.

### Staging/Production Environment

#### Option A: Generate via AWS Cognito (Recommended)
```bash
# Use AWS CLI to get a test token
aws cognito-idp admin-initiate-auth \
  --user-pool-id your-user-pool-id \
  --client-id your-client-id \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=test-user@example.com,PASSWORD=TestPassword123!
```

#### Option B: Manual login and extract token
1. Login to your staging application in the browser
2. Open developer tools → Application → Local Storage
3. Find the JWT token and copy it
4. Add it to your `.env.test.local` file

## Usage in Tests

The test configuration is automatically loaded and validated when imported:

```typescript
import { testConfig } from "./config/test-config";

// Configuration is environment-aware
console.log(`Testing in ${testConfig.environment} environment`);
```

The `DatabaseTestUtils.createTeam()` method automatically uses the appropriate authentication:

```typescript
// This will use the correct auth headers based on environment
const testTeam = await dbUtils.createTeam({ name: "Test Team 1" });
```

## Benefits

- **Environment Consistency**: Matches your main application's authentication strategy
- **Security**: Appropriate authentication for each environment
- **Flexibility**: Easy to switch between environments
- **Error Handling**: Clear error messages for missing configuration
- **Type Safety**: Full TypeScript support with proper validation
- **Debugging**: Enhanced logging for test failures

## Security Notes

- The `.env.test.local` file is gitignored and won't be committed
- Only use test tokens, never production tokens
- Consider using short-lived tokens for better security
- In CI/CD, use environment variables instead of files
- Environment-specific validation prevents credential mix-ups

## Error Handling

The system provides clear error messages for different scenarios:

```
Missing required test environment variables for development: TEST_USER_ID, TEST_API_KEY
Environment: development
Please ensure these are set in your .env.test.local file or environment.
```

This helps ensure proper test environment setup before running tests.
