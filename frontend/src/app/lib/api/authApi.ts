/**
 * Auth API client — unauthenticated endpoints for the custom auth UI.
 *
 * All requests use ``credentials: 'include'`` so the backend can set
 * and read HttpOnly cookies.  No Authorization header is needed in
 * production; in dev mode the existing X-Dev-User-ID bypass still
 * applies (managed by the main api-client).
 */

import { env } from '../../../config/env';

const BASE = env.apiUrl;

interface FetchOpts {
  body?: Record<string, unknown>;
}

async function _post(endpoint: string, body: Record<string, unknown> = {}): Promise<Response> {
  const resp = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return resp;
}

async function _postJson<T = Record<string, unknown>>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const resp = await _post(endpoint, body);
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    const detail = (data as any).detail;
    let message: string;
    let errorCode: string | undefined;
    if (Array.isArray(detail)) {
      message = detail.map((d: any) => d.msg).join('; ') || `${resp.status} ${resp.statusText}`;
    } else if (typeof detail === 'object' && detail !== null) {
      message = detail.message || `${resp.status} ${resp.statusText}`;
      errorCode = detail.error_code;
    } else {
      message = detail || `${resp.status} ${resp.statusText}`;
    }
    const err = Object.assign(new Error(message), { errorCode, status: resp.status });
    throw err;
  }
  return resp.json();
}

export interface SignUpData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ConfirmCodeData {
  email: string;
  code: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ConfirmForgotPasswordData {
  email: string;
  code: string;
  new_password: string;
}

export interface ChangeEmailData {
  new_email: string;
}

export interface VerifyEmailData {
  code: string;
}

export interface VerifyEmailSyncResponse {
  status: string;
  email: string;
}

export interface ResendCodeData {
  email: string;
}

export class AuthApi {
  static async signUp(data: SignUpData): Promise<void> {
    await _postJson('/auth/signup', data as unknown as Record<string, unknown>);
  }

  static async confirmSignUp(data: ConfirmCodeData): Promise<void> {
    await _postJson('/auth/confirm-signup', data as unknown as Record<string, unknown>);
  }

  static async signIn(data: SignInData): Promise<void> {
    await _postJson('/auth/signin', data as unknown as Record<string, unknown>);
  }

  static async refresh(): Promise<void> {
    await _postJson('/auth/refresh', {});
  }

  static async signOut(): Promise<void> {
    await _postJson('/auth/signout', {});
  }

  static async forgotPassword(data: ForgotPasswordData): Promise<void> {
    await _postJson('/auth/forgot-password', data as unknown as Record<string, unknown>);
  }

  static async confirmForgotPassword(data: ConfirmForgotPasswordData): Promise<void> {
    await _postJson('/auth/confirm-forgot-password', data as unknown as Record<string, unknown>);
  }

  static async changeEmail(data: ChangeEmailData): Promise<void> {
    await _postJson('/auth/change-email', data as unknown as Record<string, unknown>);
  }

  static async verifyEmail(data: VerifyEmailData): Promise<void> {
    await _postJson('/auth/verify-email', data as unknown as Record<string, unknown>);
  }

  static async verifyEmailSync(data: VerifyEmailData): Promise<VerifyEmailSyncResponse> {
    return _postJson<VerifyEmailSyncResponse>(
      '/users/verify-email',
      data as unknown as Record<string, unknown>,
    );
  }

  static async resendCode(data: ResendCodeData): Promise<void> {
    await _postJson('/auth/resend-code', data as unknown as Record<string, unknown>);
  }
}
