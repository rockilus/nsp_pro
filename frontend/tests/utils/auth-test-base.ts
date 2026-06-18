/**
 * AuthTestBase — isolated test users per Playwright worker.
 *
 * Mirrors the ScheduleTestBase / RoleTestBase pattern: each worker index
 * gets a unique user slot, preventing cross-test data leakage.
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

  /** Sign up via the auth UI. */
  async signUpViaUI(page: Page, user: AuthTestUser): Promise<void> {
    await page.goto('/en/auth/signup');
    await page.fill('[data-testid="auth-firstname-input"]', user.firstName);
    await page.fill('[data-testid="auth-lastname-input"]', user.lastName);
    await page.fill('[data-testid="auth-email-input"]', user.email);
    await page.fill('[data-testid="auth-password-input"]', user.password);
    await page.fill('[data-testid="auth-confirm-password-input"]', user.password);
    await page.click('[data-testid="auth-signup-submit"]');
    await page.waitForURL('**/auth/otp*');
  }

  /** Confirm sign-up with OTP code. */
  async confirmSignUpViaUI(page: Page, code: string): Promise<void> {
    await page.fill('[data-testid="auth-otp-input"]', code);
    await page.click('[data-testid="auth-otp-submit"]');
    await page.waitForURL('**/auth/signin');
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

/** Shared instance for use across test files. */
export const authTestBase = new AuthTestBase();
