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
