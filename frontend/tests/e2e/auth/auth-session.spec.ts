/**
 * auth-session.spec.ts — parallel E2E tests for sign-in, cookies, refresh, and reset.
 *
 * Uses a pre-confirmed "known-good" user created in global setup. These tests
 * run in parallel since each test starts from a clean sign-in state.
 */

import { test, expect } from '@playwright/test';
import { authTestBase } from '../../utils/auth-test-base';

const KNOWN_EMAIL = process.env.E2E_KNOWN_USER_EMAIL || 'e2e-known-good@test.rockilus.com';
const KNOWN_PASSWORD = process.env.E2E_KNOWN_USER_PASSWORD || 'KnownGood1!';

// ── Sign-In Page ──────────────────────────────────────────────────────────

test('signin page renders correctly', async ({ page }) => {
  await page.goto('/en/auth/signin');
  await expect(page.locator('[data-testid="auth-signin-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-signin-submit"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-forgot-password-link"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-signup-link"]')).toBeVisible();
});

test('signin invalid credentials shows error', async ({ page }) => {
  await page.goto('/en/auth/signin');
  await page.fill('[data-testid="auth-email-input"]', 'wrong@test.rockilus.com');
  await page.fill('[data-testid="auth-password-input"]', 'WrongPass1!');
  await page.click('[data-testid="auth-signin-submit"]');
  await expect(page.locator('[data-testid="auth-error-message"]')).toBeVisible({ timeout: 5000 });
});

// ── Sign-In → Cookie Verification ────────────────────────────────────────

test('signin sets HttpOnly cookies and redirects to schedule', async ({ page }) => {
  await page.goto('/en/auth/signin');
  await page.fill('[data-testid="auth-email-input"]', KNOWN_EMAIL);
  await page.fill('[data-testid="auth-password-input"]', KNOWN_PASSWORD);
  await page.click('[data-testid="auth-signin-submit"]');

  // Should redirect to plan/schedule on success
  await page.waitForURL('**/plan/schedule', { timeout: 15000 });

  // Verify cookies
  const cookies = await page.context().cookies();
  const accessCookie = cookies.find((c) => c.name === 'rockilus_access_token');
  const refreshCookie = cookies.find((c) => c.name === 'rockilus_refresh_token');

  expect(accessCookie).toBeDefined();
  expect(refreshCookie).toBeDefined();
  expect(accessCookie!.httpOnly).toBe(true);
});

// ── Page Refresh Preserves Auth ───────────────────────────────────────────

test('page refresh preserves auth session', async ({ page }) => {
  // Sign in
  await page.goto('/en/auth/signin');
  await page.fill('[data-testid="auth-email-input"]', KNOWN_EMAIL);
  await page.fill('[data-testid="auth-password-input"]', KNOWN_PASSWORD);
  await page.click('[data-testid="auth-signin-submit"]');
  await page.waitForURL('**/plan/schedule', { timeout: 15000 });

  // Refresh the page — auth should persist via cookies
  await page.reload();
  await page.waitForURL('**/plan/schedule');
  // Page should still be on schedule (not redirected to signin)
  expect(page.url()).toContain('/plan/schedule');
});

// ── 401 Refresh Interceptor ──────────────────────────────────────────────

test('401 on API call triggers token refresh', async ({ page, request }) => {
  // Sign in
  await page.goto('/en/auth/signin');
  await page.fill('[data-testid="auth-email-input"]', KNOWN_EMAIL);
  await page.fill('[data-testid="auth-password-input"]', KNOWN_PASSWORD);
  await page.click('[data-testid="auth-signin-submit"]');
  await page.waitForURL('**/plan/schedule', { timeout: 15000 });

  // Access token cookie should be present
  const cookiesBefore = await page.context().cookies();
  const accessBefore = cookiesBefore.find((c) => c.name === 'rockilus_access_token');
  expect(accessBefore).toBeDefined();

  // Clear only the access token to simulate expiry
  await page.context().clearCookies({ name: 'rockilus_access_token' });

  // Navigate to a page that makes an authenticated API call
  // The api-client's 401 interceptor should trigger a refresh
  await page.goto('/en/plan/schedule');

  // Verify we stay on schedule (refresh interceptor recovered the token)
  await page.waitForURL('**/plan/schedule', { timeout: 15000 });
  expect(page.url()).toContain('/plan/schedule');
});

// ── Forgot Password Navigation ────────────────────────────────────────────

test('forgot password page renders and links back', async ({ page }) => {
  await page.goto('/en/auth/signin');
  await page.click('[data-testid="auth-forgot-password-link"]');
  await page.waitForURL('**/auth/forgot-password');

  await expect(page.locator('[data-testid="auth-forgot-password-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-forgot-password-submit"]')).toBeVisible();

  // Navigate back to signin
  await page.click('[data-testid="auth-back-to-signin-link"]');
  await page.waitForURL('**/auth/signin');
  await expect(page.locator('[data-testid="auth-signin-page"]')).toBeVisible();
});

test('forgot password submits and navigates to reset', async ({ page }) => {
  await page.goto('/en/auth/forgot-password');
  await page.fill('[data-testid="auth-email-input"]', KNOWN_EMAIL);
  await page.click('[data-testid="auth-forgot-password-submit"]');
  await page.waitForURL('**/auth/reset-password*');
  await expect(page.locator('[data-testid="auth-reset-password-page"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-otp-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-new-password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-confirm-password-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="auth-reset-password-submit"]')).toBeVisible();
});
