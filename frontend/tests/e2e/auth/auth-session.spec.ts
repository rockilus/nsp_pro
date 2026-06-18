/**
 * auth-session.spec.ts — parallel E2E tests for sign-in, cookies, refresh, and reset.
 *
 * Each test creates its own isolated, pre-confirmed Cognito user via
 * AuthTestBase.setupConfirmedUser(), preventing cross-test data leakage.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { AuthTestBase } from '../../utils/auth-test-base';

// ── Sign-In Page ──────────────────────────────────────────────────────────

test.describe('Auth — Session', () => {
  const testBasesMap = new Map<string, AuthTestBase>();

  test.beforeEach(async ({}, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    const base = new AuthTestBase();
    await base.setupConfirmedUser();
    testBasesMap.set(testRunId, base);
    (testInfo as any).testRunId = testRunId;
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

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

  test('signin sets HttpOnly cookies and redirects to schedule', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const base = testBasesMap.get(testRunId)!;
    const user = base.getUserForWorker(0);

    await page.goto('/en/auth/signin');
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.click('[data-testid="auth-signin-submit"]');

    // Should redirect to plan/schedule on success
    await page.waitForURL('**/plan/**', { timeout: 15000, waitUntil: 'commit' });

    // Verify cookies
    const cookies = await page.context().cookies();
    const accessCookie = cookies.find((c) => c.name === 'rockilus_access_token');
    const refreshCookie = cookies.find((c) => c.name === 'rockilus_refresh_token');

    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
    expect(accessCookie!.httpOnly).toBe(true);
  });

  // ── Page Refresh Preserves Auth ───────────────────────────────────────────

  test('page refresh preserves auth session', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const base = testBasesMap.get(testRunId)!;
    const user = base.getUserForWorker(0);

    // Sign in
    await page.goto('/en/auth/signin');
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.click('[data-testid="auth-signin-submit"]');
    await page.waitForURL('**/plan/**', { timeout: 15000, waitUntil: 'commit' });

    // Refresh the page — auth should persist via cookies
    await page.reload();
    await page.waitForURL('**/plan/**', { waitUntil: 'commit' });
    // Page should still be on an authenticated page (not redirected to signin)
    expect(page.url()).toContain('/plan/');
  });

  // ── 401 Refresh Interceptor ──────────────────────────────────────────────

  test('401 on API call triggers token refresh', async ({ page, request }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const base = testBasesMap.get(testRunId)!;
    const user = base.getUserForWorker(0);

    // Sign in
    await page.goto('/en/auth/signin');
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.click('[data-testid="auth-signin-submit"]');
    await page.waitForURL('**/plan/**', { timeout: 15000, waitUntil: 'commit' });

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
    await page.waitForURL('**/plan/**', { timeout: 15000, waitUntil: 'commit' });
    expect(page.url()).toContain('/plan/');
  });

  // ── Forgot Password Navigation ────────────────────────────────────────────

  test('forgot password page renders and links back', async ({ page }) => {
    await page.goto('/en/auth/signin');
    await page.click('[data-testid="auth-forgot-password-link"]');
    await expect(page).toHaveURL(/auth\/forgot-password/);

    await expect(page.locator('[data-testid="auth-forgot-password-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-forgot-password-submit"]')).toBeVisible();

    // Navigate back to signin
    await page.click('[data-testid="auth-back-to-signin-link"]');
    await expect(page).toHaveURL(/auth\/signin/);
    await expect(page.locator('[data-testid="auth-signin-page"]')).toBeVisible();
  });

  test('forgot password submits and navigates to reset', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const base = testBasesMap.get(testRunId)!;
    const user = base.getUserForWorker(0);

    await page.goto('/en/auth/forgot-password');
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.click('[data-testid="auth-forgot-password-submit"]');
    await expect(page).toHaveURL(/auth\/reset-password/);
    await expect(page.locator('[data-testid="auth-reset-password-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-otp-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-new-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-confirm-password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-reset-password-submit"]')).toBeVisible();
  });
});
