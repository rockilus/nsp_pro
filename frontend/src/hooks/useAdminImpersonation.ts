import { useCallback } from "react";
// API Client
import { AdminApi } from "@/app/lib/api/adminApi";
import { useApiClient } from "@/app/lib/api-client";
// Auth Context
import { useAuth } from "@/contexts/auth-context";
import { env } from "@/config/env";

export const IMPERSONATION_SESSION_KEY = "admin_impersonation_target";

export interface ImpersonationTarget {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  language: string;
}

/**
 * Returns the currently active impersonation target from sessionStorage,
 * or null if no impersonation is active.
 * Safe to call from server and client components (returns null on server).
 */
export function getImpersonationTarget(): ImpersonationTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_SESSION_KEY);
    return raw ? (JSON.parse(raw) as ImpersonationTarget) : null;
  } catch {
    return null;
  }
}

/**
 * Hook for starting admin impersonation of a target user account.
 *
 * On success:
 *  - Writes impersonating_user_id on the admin's DB record (server-side)
 *  - Stores the target user info in sessionStorage for the banner
 *  - Navigates to the target user's default page
 */
export function useStartImpersonation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(
    async (targetUserId: string): Promise<void> => {
      if (loading)
        throw new Error("Authentication still loading - please wait");
      if (!isAuthenticated || !user?.id_token)
        throw new Error("User not authenticated - please sign in");
      if (!targetUserId) throw new Error("Target user ID is required");

      if (env.isDevelopment) {
        console.log("🔍 useStartImpersonation: starting impersonation", {
          targetUserId,
        });
      }

      const adminUser = await AdminApi.startImpersonation(
        apiClient,
        targetUserId,
      );

      // adminUser is the updated admin record; we need the target user's info.
      // The API returns the updated admin DTO after writing impersonatingUserId.
      // Fetch target from sessionStorage context is not needed since we already
      // have the target ID; navigate using the admin's language as fallback and
      // let the target info come from the updated admin impersonatingUserId.
      // For the banner we store what the caller provides (id + minimal info).
      const target: ImpersonationTarget = {
        userId: targetUserId,
        firstName: adminUser.impersonatingUserId ?? targetUserId, // will be overridden below
        lastName: "",
        email: "",
        language: adminUser.language,
      };

      // We need to store the target user's display info. The `startImpersonation`
      // endpoint returns the ADMIN's updated user record, not the target's.
      // Callers (AdminUsersTab) pass the full UserT they already have, so we
      // rely on the component to call the enriched variant below.
      sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(target));

      window.location.href = `/${adminUser.language}/plan/workers`;
    },
    [apiClient, isAuthenticated, loading, user],
  );
}

/**
 * Enriched variant used by AdminUsersTab where the full target UserT is known
 * before the API call. Stores proper display info in sessionStorage.
 */
export function useStartImpersonationWithTarget() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(
    async (target: ImpersonationTarget): Promise<void> => {
      if (loading)
        throw new Error("Authentication still loading - please wait");
      if (!isAuthenticated || !user?.id_token)
        throw new Error("User not authenticated - please sign in");

      if (env.isDevelopment) {
        console.log(
          "🔍 useStartImpersonationWithTarget: impersonating",
          target.userId,
        );
      }

      await AdminApi.startImpersonation(apiClient, target.userId);

      sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(target));

      // Navigate to the target user's default page in their language
      window.location.href = `/${target.language}/plan/workers`;
    },
    [apiClient, isAuthenticated, loading, user],
  );
}

/**
 * Hook for stopping admin impersonation and returning to the admin panel.
 */
export function useStopAdminImpersonation() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  return useCallback(async (): Promise<void> => {
    if (loading) throw new Error("Authentication still loading - please wait");
    if (!isAuthenticated || !user?.id_token)
      throw new Error("User not authenticated - please sign in");

    if (env.isDevelopment) {
      console.log("🔍 useStopAdminImpersonation: stopping impersonation");
    }

    await AdminApi.stopImpersonation(apiClient);

    sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);

    window.location.href = "/en/admin/users";
  }, [apiClient, isAuthenticated, loading, user]);
}
