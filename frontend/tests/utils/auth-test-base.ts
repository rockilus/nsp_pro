/**
 * AuthTestBase — isolated test users per Playwright test.
 *
 * Each test creates its own AuthTestBase instance, stored in a per-test Map
 * keyed by testRunId. This ensures every test gets a unique Cognito user,
 * preventing cross-test data leakage. Mirrors the ScheduleTestBase pattern.
 */

import { Page, APIRequestContext } from '@playwright/test';
import { testConfig } from './test-config';

export interface AuthTestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmed: boolean;
}

export class AuthTestBase {
  private users = new Map<number, AuthTestUser>();

  /** Each Playwright worker gets its own isolated user slot. */
  getUserForWorker(workerIndex: number): AuthTestUser {
    if (!this.users.has(workerIndex)) {
      const id = Math.random().toString(36).slice(2, 10);
      this.users.set(workerIndex, {
        email: `e2e-auth-${id}@test.rockilus.com`,
        password: 'TestPass1!',
        firstName: 'E2E',
        lastName: `Auth-${id}`,
        confirmed: false,
      });
    }
    return this.users.get(workerIndex)!;
  }

  markConfirmed(workerIndex: number): void {
    const u = this.users.get(workerIndex);
    if (u) u.confirmed = true;
  }

  cleanup(workerIndex: number): void {
    this.users.delete(workerIndex);
  }

  /** Admin-confirms the user in Cognito via the test-utils endpoint. */
  async adminConfirmUser(request: APIRequestContext, email: string): Promise<void> {
    const resp = await request.post(`${testConfig.apiUrl}/test-utils/confirm-cognito-user`, {
      data: { email },
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': testConfig.devApiKey,
      },
    });
    if (!resp.ok()) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(`adminConfirmUser failed: ${resp.status()} ${JSON.stringify(body)}`);
    }
  }

  /**
   * Creates a confirmed Cognito user via the API (signup + admin-confirm).
   * Uses plain fetch() so it's callable from beforeEach without the request fixture.
   */
  async setupConfirmedUser(): Promise<AuthTestUser> {
    const user = this.getUserForWorker(0);

    const signupResp = await fetch(`${testConfig.apiUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        password: user.password,
        confirm_password: user.password,
      }),
    });
    if (!signupResp.ok) {
      const body = await signupResp.json().catch(() => ({}));
      throw new Error(
        `setupConfirmedUser signup failed: ${signupResp.status} ${JSON.stringify(body)}`,
      );
    }

    const confirmResp = await fetch(`${testConfig.apiUrl}/test-utils/confirm-cognito-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': testConfig.devApiKey,
      },
      body: JSON.stringify({ email: user.email }),
    });
    if (!confirmResp.ok) {
      const body = await confirmResp.json().catch(() => ({}));
      throw new Error(
        `setupConfirmedUser confirm failed: ${confirmResp.status} ${JSON.stringify(body)}`,
      );
    }

    this.markConfirmed(0);
    return user;
  }

  /** Sign up via the auth UI. */
  async signUpViaUI(page: Page, user: AuthTestUser): Promise<void> {
    await page.goto('/en/auth/signup');
    await page.fill('[data-testid="auth-firstname-input"]', user.firstName);
    await page.fill('[data-testid="auth-lastname-input"]', user.lastName);
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.fill('[data-testid="auth-confirm-password-input"]', user.password);
    await page.click('[data-testid="auth-signup-submit"]');
    await page.waitForSelector('[data-testid="auth-otp-page"]', { timeout: 15000 });
  }

  /** Confirm sign-up with OTP code. A new user without teams lands on the teams page. */
  async confirmSignUpViaUI(page: Page, code: string): Promise<void> {
    await page.fill('[data-testid="auth-otp-input"]', code);
    await page.click('[data-testid="auth-otp-submit"]');
    await page.waitForURL('**/plan/**', { timeout: 15000, waitUntil: 'commit' });
  }

  /** Sign in via the auth UI. */
  async signInViaUI(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/en/auth/signin');
    await page.fill('[data-testid="auth-email-input"]', email);
    await page.fill('[data-testid="auth-password-input"]', password);
    await page.click('[data-testid="auth-signin-submit"]');
  }

  /** Get HttpOnly cookies from the page context. */
  async getAuthCookies(page: Page) {
    return page.context().cookies();
  }
}

/** Shared instance for backward-compatible use. Prefer per-test instances via Map pattern for isolation. */
export const authTestBase = new AuthTestBase();
