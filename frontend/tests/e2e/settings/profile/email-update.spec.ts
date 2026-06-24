/**
 * email-update.spec.ts — E2E tests for the secure email update flow.
 *
 * Each test creates its own isolated, pre-confirmed Cognito user via
 * AuthTestBase.setupConfirmedUser(), preventing cross-test data leakage.
 * DatabaseTestUtils is used to verify MongoDB state after updates.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { AuthTestBase, AuthTestUser } from '../../../utils/auth-test-base';
import { DatabaseTestUtils } from '../../../utils/database-utils';
import { testConfig } from '../../../utils/test-config';

const PROFILE_URL = `${testConfig.frontendUrl}/en/plan/settings/personal-info`;
const NEW_EMAIL_DOMAIN = 'updated.test.rockilus.com';

// ── Context ────────────────────────────────────────────────────────────────

interface EmailUpdateContext {
  authBase: AuthTestBase;
  dbUtils: DatabaseTestUtils;
  user: AuthTestUser;
}

const testContextMap = new Map<string, EmailUpdateContext>();

// ── Helpers ────────────────────────────────────────────────────────────────

function uniqueEmail(prefix: string): string {
  const id = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${id}@${NEW_EMAIL_DOMAIN}`;
}

/**
 * Mock GET /users/me to return the test user's data so the profile page
 * renders the correct email. The frontend's useGetUser() hook calls this
 * endpoint and would otherwise return the env-level dev user's data.
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

async function setupTest(page: any, context: EmailUpdateContext): Promise<void> {
  // Set dev-mode auth headers so the backend identifies the correct user
  await context.dbUtils.authenticatePageAsUser(page, context.user.sub);
  // Mock /users/me so the frontend renders test user's data
  await mockUserMeResponse(page, context.user);
}

// ── Test Suite ─────────────────────────────────────────────────────────────

test.describe('Email Update Flow', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const authBase = new AuthTestBase();
    const dbUtils = new DatabaseTestUtils();
    const user = await authBase.setupConfirmedUser();

    const context: EmailUpdateContext = { authBase, dbUtils, user };
    testContextMap.set(testRunId, context);

    await setupTest(page, context);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  // ── Happy Path ───────────────────────────────────────────────────────

  test('full email update flow — happy path', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('happy');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    // Verify current email displayed
    await expect(page.locator('[data-testid="profile-email-value"]')).toContainText(user.email);

    // Open dialog
    await page.click('[data-testid="profile-email-edit-button"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).toBeVisible();

    // Step 1 — Sudo: enter valid password
    await expect(page.locator('[data-testid="email-update-step-sudo"]')).toBeVisible();
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Step 2 — New email: enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Step 3 — OTP: verify email NOT yet changed in DB
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    const emailBeforeOtp = await dbUtils.getUserEmail(user.sub);
    expect(emailBeforeOtp).toBe(user.email);

    // Enter valid OTP (cognito-local uses 123456)
    await page.fill('[data-testid="email-update-otp-container"] input', '123456');
    await page.click('[data-testid="email-update-otp-submit"]');

    // Step 4 — Success
    await expect(page.locator('[data-testid="email-update-step-success"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="email-update-success"]')).toContainText(
      'Email updated',
    );

    // Verify DB email IS updated
    const emailAfterOtp = await dbUtils.getUserEmail(user.sub);
    expect(emailAfterOtp).toBe(newEmail);
  });

  // ── Edge Cases ───────────────────────────────────────────────────────

  test('invalid password in sudo step shows error', async ({ page }) => {
    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).toBeVisible();

    // Enter wrong password
    await page.fill('[data-testid="email-update-sudo-password"]', 'WrongPass1!');
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Error should appear
    await expect(page.locator('[data-testid="email-update-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Still on sudo step — submit button visible
    await expect(page.locator('[data-testid="email-update-sudo-submit"]')).toBeVisible();
    // NOT advanced to new-email step
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).not.toBeVisible();
  });

  test('invalid email format shows error', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();

    // Enter invalid email
    await page.fill('[data-testid="email-update-new-email-input"]', 'not-an-email');
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Error should appear (backend validates EmailStr → 422)
    await expect(page.locator('[data-testid="email-update-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Still on new-email step
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
  });

  test('invalid OTP shows error and stays on OTP step', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('bad-otp');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Enter invalid OTP
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    await page.fill('[data-testid="email-update-otp-container"] input', '000000');
    await page.click('[data-testid="email-update-otp-submit"]');

    // Error should appear
    await expect(page.locator('[data-testid="email-update-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Still on OTP step
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-update-otp-submit"]')).toBeVisible();
  });

  test('resend OTP clears code input and stays on OTP step', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('resend');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Enter some OTP digits then resend
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    await page.fill('[data-testid="email-update-otp-container"] input', '111111');

    // Intercept change-email call for resend
    const resendPromise = page.waitForResponse(
      (res) => res.url().includes('/auth/change-email') && res.status() === 200,
    );
    await page.click('[data-testid="email-update-otp-resend"]');
    await resendPromise;

    // Still on OTP step
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    // OTP input should be cleared (value reset after resend)
    const otpInput = page.locator('[data-testid="email-update-otp-container"] input');
    await expect(otpInput).toHaveValue('');
  });

  test('closing dialog mid-flow resets state', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).toBeVisible();

    // Enter password to advance
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();

    // Close dialog via cancel
    await page.click('[data-testid="email-update-cancel"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).not.toBeVisible();

    // Re-open — should be back at sudo step
    await page.click('[data-testid="profile-email-edit-button"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-update-step-sudo"]')).toBeVisible();
  });

  test('email not updated in DB until OTP verified', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils, user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('not-yet');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email and send code
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // OTP step reached — verify DB still has old email
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    const emailBeforeOtp = await dbUtils.getUserEmail(user.sub);
    expect(emailBeforeOtp).toBe(user.email);

    // Close without entering OTP
    await page.click('[data-testid="email-update-cancel"]');

    // Verify DB STILL has old email
    const emailAfterClose = await dbUtils.getUserEmail(user.sub);
    expect(emailAfterClose).toBe(user.email);
  });

  test('page refresh during OTP flow resets dialog state', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('refresh');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    // Re-setup mocks after navigation
    await setupTest(page, testContextMap.get(testRunId)!);

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Reach OTP step
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-setup mocks after refresh
    await setupTest(page, testContextMap.get(testRunId)!);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    // Dialog should be closed after refresh
    await expect(page.locator('[data-testid="email-update-dialog"]')).not.toBeVisible();

    // Re-open — should be back at sudo step
    await page.click('[data-testid="profile-email-edit-button"]');
    await expect(page.locator('[data-testid="email-update-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-update-step-sudo"]')).toBeVisible();
  });

  test('expired verification code shows specific error', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('expired');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Mock expired verification code response
    await page.route('**/users/verify-email', (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error_code: 'expired_verification_code',
            message: 'Verification code has expired',
          },
        }),
      });
    });

    // Enter OTP and submit
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    await page.fill('[data-testid="email-update-otp-container"] input', '123456');
    await page.click('[data-testid="email-update-otp-submit"]');

    // Error with expired code message should appear
    await expect(page.locator('[data-testid="email-update-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Still on OTP step
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    // Resend button still available
    await expect(page.locator('[data-testid="email-update-otp-resend"]')).toBeVisible();
  });

  test('invalid verification code shows specific error', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { user } = testContextMap.get(testRunId)!;
    const newEmail = uniqueEmail('inval-code');

    await page.goto(PROFILE_URL);
    await expect(page.locator('[data-testid="profile-email-value"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.click('[data-testid="profile-email-edit-button"]');

    // Pass sudo
    await page.fill('[data-testid="email-update-sudo-password"]', user.password);
    await page.click('[data-testid="email-update-sudo-submit"]');

    // Enter new email
    await expect(page.locator('[data-testid="email-update-step-new-email"]')).toBeVisible();
    await page.fill('[data-testid="email-update-new-email-input"]', newEmail);
    await page.click('[data-testid="email-update-new-email-submit"]');

    // Mock invalid verification code response
    await page.route('**/users/verify-email', (route: any) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            error_code: 'invalid_verification_code',
            message: 'Invalid verification code',
          },
        }),
      });
    });

    // Enter OTP and submit
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
    await page.fill('[data-testid="email-update-otp-container"] input', '123456');
    await page.click('[data-testid="email-update-otp-submit"]');

    // Error with invalid code message should appear
    await expect(page.locator('[data-testid="email-update-error"]')).toBeVisible({
      timeout: 5_000,
    });

    // Still on OTP step
    await expect(page.locator('[data-testid="email-update-step-verify-otp"]')).toBeVisible();
  });
});
