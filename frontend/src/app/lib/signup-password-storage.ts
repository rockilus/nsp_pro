/**
 * Thin helper for temporarily storing the sign-up password so the OTP page can
 * auto-login after confirmation.
 *
 * The password is held in sessionStorage with a 10-minute TTL. sessionStorage
 * is tab-scoped and cleared when the tab closes, so the password never
 * outlives the sign-up session.
 */
const SIGNUP_PW_KEY = 'rockilus_signup_password';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface SignupPasswordEntry {
  password: string;
  expiresAt: number;
}

export function storeSignupPassword(password: string): void {
  if (typeof window === 'undefined') return;
  const entry: SignupPasswordEntry = {
    password,
    expiresAt: Date.now() + TTL_MS,
  };
  sessionStorage.setItem(SIGNUP_PW_KEY, JSON.stringify(entry));
}

export function retrieveSignupPassword(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SIGNUP_PW_KEY);
    if (!raw) return null;
    const entry: SignupPasswordEntry = JSON.parse(raw);
    if (typeof entry.password !== 'string' || typeof entry.expiresAt !== 'number') {
      sessionStorage.removeItem(SIGNUP_PW_KEY);
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      sessionStorage.removeItem(SIGNUP_PW_KEY);
      return null;
    }
    sessionStorage.removeItem(SIGNUP_PW_KEY);
    return entry.password;
  } catch {
    sessionStorage.removeItem(SIGNUP_PW_KEY);
    return null;
  }
}

export function clearSignupPassword(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SIGNUP_PW_KEY);
}
