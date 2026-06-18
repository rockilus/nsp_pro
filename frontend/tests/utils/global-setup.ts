/**
 * Global setup for Playwright tests
 *
 * This file runs before all tests and ensures:
 * 1. Backend API is running and accessible
 * 2. Test utilities are available
 * 3. Database can be reset successfully
 * 4. Default test user is created for authentication
 *
 * Note: Role-based tests (owner vs member) create their own users per test
 * using RoleTestBase.setupRoleTests(). This global setup creates a default
 * owner user for backward compatibility with existing tests.
 */

import { chromium, FullConfig } from '@playwright/test';
import { DatabaseTestUtils } from './database-utils';
import { testConfig } from './test-config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  const dbUtils = new DatabaseTestUtils();

  try {
    // Wait for all required services to be ready
    console.log('⏳ Waiting for services to be ready...');
    await dbUtils.waitForServicesReady(30000); // 30 second timeout
    console.log('✅ All services are ready');

    // Check test utilities health
    console.log('🔍 Checking test utilities health...');
    const health = await dbUtils.checkHealth();

    if (!health.test_utilities_available) {
      throw new Error('Test utilities are not available. Please check environment configuration.');
    }
    console.log('✅ Test utilities are healthy and available');

    // Perform initial database reset to ensure clean state
    console.log('🗃️ Performing initial database reset...');
    const resetResult = await dbUtils.resetAllData();
    console.log(`✅ Initial database reset completed: ${resetResult.operation_id}`);
    console.log(`   Reset ${resetResult.collections_reset.length} collections`);

    // Reset cognito-local users to ensure clean Cognito state
    console.log('🔐 Resetting cognito-local users...');
    try {
      const cognitoReset = await dbUtils.resetCognitoLocal();
      console.log(`✅ Cognito-local reset: ${cognitoReset.message}`);
    } catch (error) {
      console.warn('⚠️ Cognito-local reset failed, continuing:', error);
    }

    // Create test user after database reset
    console.log('👤 Creating test user...');
    try {
      const userResult = await dbUtils.createTestUser();
      console.log('✅ Test user created successfully');
      console.log(`   ${userResult.message}`);
    } catch (error) {
      console.error('❌ Failed to create test user:', error);
      // Don't fail the entire setup if user creation fails
      // Tests can handle authentication scenarios individually
      console.warn('⚠️ Continuing with setup despite user creation failure');
    }

    // Create second test user for multi-user test scenarios
    console.log('👤 Creating second test user...');
    try {
      const user2Result = await dbUtils.createTestUser({
        user_id: testConfig.devUserId2 || '64e9b7f1e13e4a1a9c8b4568',
        email: 'testuser2@example.com',
        username: 'testuser2',
        first_name: 'Test',
        last_name: 'User2',
      });
      console.log('✅ Second test user created successfully');
      console.log(`   ${user2Result.message}`);
    } catch (error) {
      console.error('❌ Failed to create second test user:', error);
      console.warn('⚠️ Continuing with setup despite second user creation failure');
    }

    // Create known-good Cognito user for auth session E2E tests
    console.log('🔐 Creating known-good Cognito user for auth session tests...');
    const knownUserEmail = 'e2e-known-good@test.rockilus.com';
    const knownUserPassword = 'KnownGood1!';
    try {
      // sign_up now handles Cognito creation + MongoDB onboarding
      const signupResp = await fetch(`${testConfig.apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: knownUserEmail,
          first_name: 'Known',
          last_name: 'Good',
          password: knownUserPassword,
          confirm_password: knownUserPassword,
        }),
      });
      if (!signupResp.ok) {
        const err = await signupResp.json().catch(() => ({}));
        console.warn(`⚠️ Known-good user signup returned ${signupResp.status}:`, err);
      } else {
        console.log('✅ Known-good user signed up and onboarded');
      }

      // Admin-confirm the user (bypass OTP — needed for test setup, idempotent)
      const confirmResp = await fetch(`${testConfig.apiUrl}/test-utils/confirm-cognito-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testConfig.devApiKey,
        },
        body: JSON.stringify({ email: knownUserEmail }),
      });
      if (!confirmResp.ok) {
        const err = await confirmResp.json().catch(() => ({}));
        console.warn(`⚠️ Known-good user confirm returned ${confirmResp.status}:`, err);
      } else {
        console.log('✅ Known-good user confirmed');
      }

      // Expose via env for test files to read
      process.env.E2E_KNOWN_USER_EMAIL = knownUserEmail;
      process.env.E2E_KNOWN_USER_PASSWORD = knownUserPassword;
      console.log(`✅ Known-good Cognito user created: ${knownUserEmail}`);
    } catch (error) {
      console.warn('⚠️ Known-good Cognito user creation failed:', error);
    }

    // Optional: Verify we can create and query a browser for testing
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Quick connectivity test to the frontend
    try {
      await page.goto('http://localhost:3000', { timeout: 10000 });
      console.log('✅ Frontend is accessible');
    } catch (error) {
      console.warn('⚠️ Frontend may not be ready:', error);
      // Don't fail setup if frontend isn't ready - tests will handle this
    }

    await browser.close();

    console.log('🎉 Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('not ready')) {
        console.error('💡 Make sure the backend API Gateway is running on http://localhost:8000');
      } else if (error.message.includes('test utilities')) {
        console.error('💡 Make sure ENVIRONMENT=test or ENVIRONMENT=development is set');
      } else if (error.message.includes('Test user creation')) {
        console.error('💡 Make sure the DEV_API_KEY environment variable is set correctly');
      }
    }

    throw error;
  }
}

export default globalSetup;
