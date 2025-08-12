# Test Authentication Setup

This document explains how to set up authentication for Playwright tests that need to make API calls.

## Environment Setup

1. Create a `.env.test.local` file in the `frontend` directory (this file is already gitignored):

```bash
TEST_AUTH_TOKEN=your-actual-test-token-here
```

2. Replace `your-actual-test-token-here` with a valid authentication token that can be used for testing.

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

The `DatabaseTestUtils.createTeam()` method will automatically use the token from `TEST_AUTH_TOKEN` environment variable:

```typescript
// This will use the API to create a team instead of UI interactions
const testTeam = await dbUtils.createTeam({ name: "Test Team 1" });
```

## Benefits

- **Faster tests**: No UI interaction needed for setup
- **More reliable**: Eliminates UI timing issues
- **Better isolation**: Clean separation between setup and test logic
- **Reusable**: Can create multiple teams or other resources easily

## Security Notes

- The `.env.test.local` file is gitignored and won't be committed
- Only use test tokens, never production tokens
- Consider using short-lived tokens for better security
- In CI/CD, use environment variables instead of files
