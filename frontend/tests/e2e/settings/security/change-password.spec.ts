/**
 * change-password.spec.ts — E2E tests for the secure change-password flow.
 *
 * Each test uses an isolated, pre-confirmed Cognito user via
 * AuthTestBase.setupConfirmedUser(). Backend responses are mocked via
 * page.route() to avoid depending on real Cognito cookie-based auth
 * in the E2E browser context. Client-side validation tests exercise
 * the dialog's inline error handling without touching the network.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { AuthTestBase, AuthTestUser } from '../../../utils/auth-test-base';
import { DatabaseTestUtils } from '../../../utils/database-utils';
import { testConfig } from '../../../utils/test-config';

const SECURITY_URL = `${testConfig.frontendUrl}/en/plan/settings/security`;

// ── Context ────────────────────────────────────────────────────────────────

interface PasswordChangeContext {
  authBase: AuthTestBase;
  dbUtils: DatabaseTestUtils;
  user: AuthTestUser;
}

const testContextMap = new Map<string, PasswordChangeContext>();

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Mock GET /users/me so the AuthContext + useGetUser hook resolve the
 * test user.  Without this mock the cookie-less dev-mode fetch returns
 * 401 and the security page never renders the profile rows.
 */
async function mockUserMeResponse(page: any, user: AuthTestUser): Promise<void> {
  await page.route('**/users/me', (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: user.sub,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        language: 'en',
        signUpAt: Math.floor(Date.now() / 1000),
        impersonatingUserId: null,
        systemRole: null,
      }),
    });
  });
}

/**
 * Authenticate the page as the given user via dev-mode headers and
 * install the /users/me mock so the auth context resolves.
 */
async function setupTest(page: any, context: PasswordChangeContext): Promise<void> {
  await context.dbUtils.authenticatePageAsUser(page, context.user.sub);
  await mockUserMeResponse(page, context.user);
}

// ── Test Suite ─────────────────────────────────────────────────────────────

test.describe('Change Password Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const authBase = new AuthTestBase();
    const dbUtils = new DatabaseTestUtils();
    const user = await authBase.setupConfirmedUser();

    const context: PasswordChangeContext = { authBase, dbUtils, user };
    testContextMap.set(testRunId, context);

    await setupTest(page, context);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  // ── Happy Path ───────────────────────────────────────────────────────

  test('happy path — valid password change closes dialog', async ({ page }) => {
    // Mock the change-password endpoint to return success
    await page.route('**/users/*/change-password', (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password updated successfully' }),
      });
    });

    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    // Open dialog
    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Fill valid data
    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-new"]', 'NewValidPass2!');
    await page.fill('[data-testid="change-password-confirm"]', 'NewValidPass2!');

    // Submit
    await page.click('[data-testid="change-password-submit"]');

    // Dialog should close on success
    await expect(page.locator('[data-testid="change-password-dialog"]')).not.toBeVisible({
      timeout: 5_000,
    });
  });

  // ── Invalid Current Password ─────────────────────────────────────────

  test('invalid current password shows error and stays open', async ({ page }) => {
    // Mock to return 401 (wrong credentials)
    await page.route('**/users/*/change-password', (route: any) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Incorrect credentials' }),
      });
    });

    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Wrong current password
    await page.fill('[data-testid="change-password-current"]', 'WrongPassword1!');
    await page.fill('[data-testid="change-password-new"]', 'SomeValidPass2!');
    await page.fill('[data-testid="change-password-confirm"]', 'SomeValidPass2!');

    await page.click('[data-testid="change-password-submit"]');

    // Error banner should appear
    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Dialog must stay open
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Submit button still present (user can correct and retry)
    await expect(page.locator('[data-testid="change-password-submit"]')).toBeVisible();
  });

  // ── Passwords Do Not Match ───────────────────────────────────────────

  test('passwords do not match shows client-side error', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-new"]', 'ValidNewPass2!');
    await page.fill('[data-testid="change-password-confirm"]', 'DifferentPass3!');

    await page.click('[data-testid="change-password-submit"]');

    // Client-side error — no network call
    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator('[data-testid="change-password-error"]')).toContainText(
      'Passwords do not match',
    );

    // Dialog stays open
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();
  });

  // ── Same Old and New Password ────────────────────────────────────────

  test('same old and new password shows client-side error', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Current === new
    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-new"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-confirm"]', 'TestPass1!');

    await page.click('[data-testid="change-password-submit"]');

    // Client-side error
    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator('[data-testid="change-password-error"]')).toContainText(
      'must be different',
    );

    // Dialog stays open
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();
  });

  // ── Empty Current Password ───────────────────────────────────────────

  test('empty current password shows validation error', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Leave current blank, fill new
    await page.fill('[data-testid="change-password-new"]', 'SomeValidPass2!');
    await page.fill('[data-testid="change-password-confirm"]', 'SomeValidPass2!');

    await page.click('[data-testid="change-password-submit"]');

    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator('[data-testid="change-password-error"]')).toContainText(
      'Please enter a password',
    );
  });

  // ── Empty New Password ───────────────────────────────────────────────

  test('empty new password shows validation error', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Fill current but leave new blank
    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-confirm"]', 'SomePass');

    await page.click('[data-testid="change-password-submit"]');

    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 3_000,
    });
    await expect(page.locator('[data-testid="change-password-error"]')).toContainText(
      'Please enter a password',
    );
  });

  // ── Weak New Password (Cognito Policy Violation) ─────────────────────

  test('weak new password (policy violation) shows server error', async ({ page }) => {
    const policyMessage =
      'Password did not conform with policy: Password must have uppercase characters';

    // Mock 400 response from Cognito policy enforcement
    await page.route('**/users/*/change-password', (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: policyMessage }),
      });
    });

    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Weak password — passes client-side validation, fails server-side
    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-new"]', 'weak');
    await page.fill('[data-testid="change-password-confirm"]', 'weak');

    await page.click('[data-testid="change-password-submit"]');

    // Server-side error should appear with the Cognito policy message
    await expect(page.locator('[data-testid="change-password-error"]')).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.locator('[data-testid="change-password-error"]')).toContainText('uppercase');

    // Dialog stays open for correction
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();
  });

  // ── Cancel Resets Form ───────────────────────────────────────────────

  test('cancel resets form state on reopen', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // Fill some fields
    await page.fill('[data-testid="change-password-current"]', 'TestPass1!');
    await page.fill('[data-testid="change-password-new"]', 'SomeNewPass2!');
    await page.fill('[data-testid="change-password-confirm"]', 'SomeNewPass2!');

    // Cancel
    await page.click('[data-testid="change-password-cancel"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).not.toBeVisible();

    // Reopen — fields must be blank
    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    await expect(page.locator('[data-testid="change-password-current"]')).toHaveValue('');
    await expect(page.locator('[data-testid="change-password-new"]')).toHaveValue('');
    await expect(page.locator('[data-testid="change-password-confirm"]')).toHaveValue('');

    // No error from previous state
    await expect(page.locator('[data-testid="change-password-error"]')).not.toBeVisible();
  });

  // ── Visibility Toggle ────────────────────────────────────────────────

  test('visibility toggle switches input type', async ({ page }) => {
    await page.goto(SECURITY_URL);
    await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="change-password-trigger"]');
    await expect(page.locator('[data-testid="change-password-dialog"]')).toBeVisible();

    // All inputs should start as type="password"
    const currentInput = page.locator('[data-testid="change-password-current"]');
    await expect(currentInput).toHaveAttribute('type', 'password');

    // Toggle visibility
    await page.click('[data-testid="change-password-current-toggle"]');
    await expect(currentInput).toHaveAttribute('type', 'text');

    // Toggle back
    await page.click('[data-testid="change-password-current-toggle"]');
    await expect(currentInput).toHaveAttribute('type', 'password');

    // Confirm new password field also works
    const newInput = page.locator('[data-testid="change-password-new"]');
    await expect(newInput).toHaveAttribute('type', 'password');
    await page.click('[data-testid="change-password-new-toggle"]');
    await expect(newInput).toHaveAttribute('type', 'text');

    // Confirm field toggle
    const confirmInput = page.locator('[data-testid="change-password-confirm"]');
    await expect(confirmInput).toHaveAttribute('type', 'password');
    await page.click('[data-testid="change-password-confirm-toggle"]');
    await expect(confirmInput).toHaveAttribute('type', 'text');
  });
});
