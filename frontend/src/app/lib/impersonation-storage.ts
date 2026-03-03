/**
 * Thin, dependency-free helpers for reading impersonation state from
 * sessionStorage. Kept in a separate module so that both api-client.ts and
 * useAdminImpersonation.ts can import from here without creating a circular
 * dependency.
 */

export const IMPERSONATION_SESSION_KEY = "admin_impersonation_target";

export interface StoredImpersonationTarget {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  language: string;
  token: string;
}

/**
 * Returns the full impersonation target stored in sessionStorage, or null.
 * Safe to call from server components — returns null on the server.
 */
export function getImpersonationTarget(): StoredImpersonationTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredImpersonationTarget) : null;
  } catch {
    return null;
  }
}

/**
 * Returns only the JWT from sessionStorage, or null.
 * Used by the API client to attach the X-Impersonation-Token request header.
 */
export function getImpersonationToken(): string | null {
  return getImpersonationTarget()?.token ?? null;
}

/**
 * Returns true if the stored impersonation token is expired or absent.
 * Decodes the JWT payload without a library — no signature verification
 * needed here since expiry is checked only to skip a doomed API call.
 */
export function isImpersonationTokenExpired(): boolean {
  const token = getImpersonationToken();
  if (!token) return true;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const payload = JSON.parse(
      atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")),
    );
    const exp: number | undefined = payload.exp;
    if (typeof exp !== "number") return true;
    // Add a 10-second buffer so we don't issue a request that expires in flight
    return Date.now() / 1000 >= exp - 10;
  } catch {
    return true;
  }
}

/**
 * Removes the impersonation session key from sessionStorage.
 */
export function clearImpersonationTarget(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);
}
