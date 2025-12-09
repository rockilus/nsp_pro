import { useCallback } from "react";
// Types
import { UserT } from "../types/user";
// API Client
import { UserApi } from "../app/lib/api/userApi";
import { useApiClient } from "../app/lib/api-client";
// Auth Context
import { useAuth } from "../contexts/auth-context";
import { env } from "@/config/env";

//////////////////////////
// Authenticated User Hooks //
//////////////////////////

/**
 * Hook for getting current user data with authentication handling
 */
export function useGetUser() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const getUser = useCallback(async (): Promise<UserT> => {
    // Remove excessive debugging in production to reduce console spam
    if (env.isDevelopment) {
      console.log("🔍 useGetUser called:", {
        timestamp: new Date().toISOString(),
        isAuthenticated,
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
      });
    }

    // Security: Validate authentication state
    if (loading) {
      throw new Error("Authentication still loading - please wait");
    }

    if (!isAuthenticated || !user?.id_token) {
      console.error("❌ Authentication validation failed:", {
        isAuthenticated,
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
        reason: !isAuthenticated ? "not_authenticated" : "missing_id_token",
      });
      throw new Error("User not authenticated - please sign in");
    }

    try {
      if (env.isDevelopment) {
        console.log("📡 Making authenticated API request to /users/me");
      }

      const userData = await UserApi.getCurrentUser(apiClient);

      if (env.isDevelopment) {
        console.log("✅ User data fetched successfully");
      }

      return userData;
    } catch (error) {
      // Security: Log errors without exposing sensitive data
      console.error("❌ Failed to fetch user:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      // Re-throw authentication errors for proper handling
      if (
        error instanceof Error &&
        (error.message.includes("not authenticated") ||
          error.message.includes("Unauthorized"))
      ) {
        throw error;
      }

      throw new Error("Failed to fetch user, please try again later");
    }
  }, [apiClient, isAuthenticated, loading, user]); // Stable dependencies

  return getUser;
}

/**
 * Hook for updating user data
 */
export function useUpdateUser() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  const updateUser = useCallback(
    async (userData: UserT): Promise<UserT> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      try {
        return await UserApi.updateUser(apiClient, userData);
      } catch (error) {
        console.error("❌ Failed to update user:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user]
  );

  return updateUser;
}

/**
 * Hook for updating user password
 */
export function useUpdatePassword() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading, accessToken } = useAuth();

  const updatePassword = useCallback(
    async (
      passwordData: {
        currentPassword: string;
        newPassword: string;
        newPasswordConfirm: string;
      },
      userId: string
    ): Promise<void> => {
      // Security: Validate authentication state
      if (loading) {
        throw new Error("Authentication still loading - please wait");
      }

      if (!isAuthenticated || !user?.id_token) {
        throw new Error("User not authenticated - please sign in");
      }

      if (!accessToken) {
        throw new Error("Access token not available - please sign in again");
      }

      try {
        await UserApi.updatePassword(
          apiClient,
          {
            ...passwordData,
            accessToken,
          },
          userId
        );
      } catch (error) {
        console.error("❌ Failed to update password:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    },
    [apiClient, isAuthenticated, loading, user, accessToken]
  );

  return updatePassword;
}
