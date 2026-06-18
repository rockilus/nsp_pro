/**
 * auth-signup.spec.ts — serial E2E tests for sign-up and OTP confirmation.
 *
 * These tests create fresh, isolated users per worker. They run in serial
 * mode because the signup → confirm chain is inherently ordered.
 */

import { test, expect } from '@playwright/test';
import { authTestBase } from '../../utils/auth-test-base';

test.describe.serial('Auth — Sign-Up & Confirm Flow', () => {
  test.beforeEach(async ({}, testInfo) => {
    authTestBase.getUserForWorker(testInfo.workerIndex);
  });

  test.afterEach(async ({}, testInfo) => {
    authTestBase.cleanup(testInfo.workerIndex);
  });

  // ── Sign-Up Page ────────────────────────────────────────────────────────

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/en/auth/signup');
    await expect(page.locator('[data-testid="auth-signup-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-firstname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-lastname-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-confirm-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-signup-submit"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-signin-link"]')).toBeVisible();
  });

  test('signup rejects invalid email format', async ({ page }) => {
    await page.goto('/en/auth/signup');
    await page.fill('[data-testid="auth-firstname-input"]', 'Test');
    await page.fill('[data-testid="auth-lastname-input"]', 'User');
    await page.fill('[data-testid="auth-email-input"]', 'not-an-email');
    await page.fill('[data-testid="auth-password-input"]', 'StrongPass1!');
    await page.fill('[data-testid="auth-confirm-password-input"]', 'StrongPass1!');

    // Submit should be blocked by browser validation or backend 422
    await page.click('[data-testid="auth-signup-submit"]');
    // Backend validates EmailStr → 422
    await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('signup rejects password mismatch', async ({ page }) => {
    await page.goto('/en/auth/signup');
    await page.fill('[data-testid="auth-firstname-input"]', 'Test');
    await page.fill('[data-testid="auth-lastname-input"]', 'User');
    await page.fill('[data-testid="auth-email-input"]', 'test@example.com');
    await page.fill('[data-testid="auth-password-input"]', 'StrongPass1!');
    await page.fill('[data-testid="auth-confirm-password-input"]', 'Different1!');
    await page.click('[data-testid="auth-signup-submit"]');
    await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('signup rejects weak password', async ({ page }) => {
    await page.goto('/en/auth/signup');
    await page.fill('[data-testid="auth-firstname-input"]', 'Test');
    await page.fill('[data-testid="auth-lastname-input"]', 'User');
    await page.fill('[data-testid="auth-email-input"]', 'weak@example.com');
    await page.fill('[data-testid="auth-password-input"]', 'weak');
    await page.fill('[data-testid="auth-confirm-password-input"]', 'weak');
    await page.click('[data-testid="auth-signup-submit"]');
    await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  test('signup email already exists', async ({ page }) => {
    await page.goto('/en/auth/signup');
    // Use the known-good user email from global setup
    const knownEmail = process.env.E2E_KNOWN_USER_EMAIL || 'e2e-known-good@test.rockilus.com';
    await page.fill('[data-testid="auth-firstname-input"]', 'Test');
    await page.fill('[data-testid="auth-lastname-input"]', 'User');
    await page.fill('[data-testid="auth-email-input"]', knownEmail);
    await page.fill('[data-testid="auth-password-input"]', 'StrongPass1!');
    await page.fill('[data-testid="auth-confirm-password-input"]', 'StrongPass1!');
    await page.click('[data-testid="auth-signup-submit"]');
    await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
  });

  // ── Sign-Up → OTP Flow ──────────────────────────────────────────────────

  test('signup navigates to OTP page', async ({ page }, testInfo) => {
    const user = authTestBase.getUserForWorker(testInfo.workerIndex);
    await authTestBase.signUpViaUI(page, user);
    await expect(page.locator('[data-testid="auth-otp-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-otp-email"]')).toContainText(user.email);
    await expect(page.locator('[data-testid="auth-otp-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-otp-submit"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-resend-code-button"]')).toBeVisible();
  });

  // ── OTP Confirmation ────────────────────────────────────────────────────

  test('confirm signup with OTP auto-logs in and navigates to schedule', async ({
    page,
  }, testInfo) => {
    const user = authTestBase.getUserForWorker(testInfo.workerIndex);
    await authTestBase.signUpViaUI(page, user);

    // cognito-local uses CODE=123456 — confirm with real OTP
    await page.fill('[data-testid="auth-otp-input"]', '123456');
    await page.click('[data-testid="auth-otp-submit"]');

    // Auto-login should redirect to plan/schedule, not signin
    await page.waitForURL('**/plan/schedule', { timeout: 15000 });
    authTestBase.markConfirmed(testInfo.workerIndex);
  });

  test('confirm signup without stored password redirects to signin', async ({ page }, testInfo) => {
    const user = authTestBase.getUserForWorker(testInfo.workerIndex);
    await authTestBase.signUpViaUI(page, user);

    // Simulate different tab or expired TTL — no password in sessionStorage
    await page.evaluate(() => sessionStorage.clear());

    await page.fill('[data-testid="auth-otp-input"]', '123456');
    await page.click('[data-testid="auth-otp-submit"]');

    // Falls through to signin when auto-login is not possible
    await page.waitForSelector('[data-testid="auth-signin-page"]', { timeout: 15000 });
    authTestBase.markConfirmed(testInfo.workerIndex);
  });

  // ── Unconfirmed User Sign-In ────────────────────────────────────────────

  test('unconfirmed user sees error on signin', async ({ page }, testInfo) => {
    const user = authTestBase.getUserForWorker(testInfo.workerIndex);

    // Sign up but do NOT confirm
    await authTestBase.signUpViaUI(page, user);

    // Try to sign in — user is NOT confirmed
    await page.goto('/en/auth/signin');
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.click('[data-testid="auth-signin-submit"]');

    // Should show "Account not confirmed" error (AuthnUserNotConfirmedError → 403)
    await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
  });
});
