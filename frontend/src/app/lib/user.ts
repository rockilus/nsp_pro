import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useCallback } from "react";
// Types
import { UserT, toUserT, fromUserT } from "../../types/user";
// Env Vars
import { API_URL } from "./env";
// API Client
import { useApiClient } from "./api-client";
// Auth Context
import { useAuth } from "../../contexts/auth-context";

dayjs.extend(utc);

const apiUrlUsers = API_URL + "/users";

//////////////////////////
// User //
//////////////////////////

// Hook-based function for use in React components
export function useGetUser() {
  const apiClient = useApiClient();
  const { user, isAuthenticated, loading } = useAuth();

  // CRITICAL: Use useCallback to prevent infinite loops
  const getUser = useCallback(async (): Promise<UserT> => {
    // Remove excessive debugging in production to reduce console spam
    if (process.env.NODE_ENV === "development") {
      console.log("� useGetUser called:", {
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
      if (process.env.NODE_ENV === "development") {
        console.log("📡 Making authenticated API request to /users/me");
      }

      const responseData = await apiClient.get<any>("/users/me");

      if (process.env.NODE_ENV === "development") {
        console.log("✅ User data fetched successfully");
      }

      return toUserT(responseData) as UserT;
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

// Temporarily enable legacy function for comparison
export async function getUser(): Promise<UserT> {
  console.warn(
    "⚠️ LEGACY: getUser() called - this should not happen in production!",
    {
      timestamp: new Date().toISOString(),
      stack: new Error().stack?.split("\n").slice(1, 3), // Security: Limit stack trace
    }
  );

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    console.log("📡 Legacy API call to:", `${apiUrlUsers}/me`);
    const response = await fetch(`${apiUrlUsers}/me`, options);
    const responseData = await response.json();
    if (!response.ok) {
      console.error("❌ Legacy API failed:", {
        status: response.status,
        statusText: response.statusText,
        error: responseData.detail,
      });
      throw new Error("Failed to fetch user: " + responseData.detail);
    }
    console.log("✅ Legacy API success");
    return toUserT(responseData) as UserT;
  } catch (error) {
    console.error("❌ Legacy getUser failed:", error);
    throw new Error("Failed to fetch user, please try again later");
  }
}

export async function updateUser(user: UserT): Promise<UserT> {
  // Security: Input validation
  if (!user || !user.id) {
    throw new Error("Invalid user data provided");
  }

  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromUserT(user)),
  };

  try {
    const response = await fetch(`${apiUrlUsers}/${user.id}`, options);
    const responseData = await response.json();

    if (!response.ok) {
      // Security: Sanitize error messages
      const errorMessage =
        responseData.detail || `Update failed with status ${response.status}`;
      throw new Error("Failed to update user: " + errorMessage);
    }

    return toUserT(responseData) as UserT;
  } catch (error) {
    console.error(
      "Failed to update user:",
      error instanceof Error ? error.message : error
    );
    throw new Error("Failed to update user, please try again later");
  }
}

export async function updatePassword(
  passwordData: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  },
  userId: string
): Promise<void> {
  // Security: Input validation
  if (
    !passwordData.currentPassword ||
    !passwordData.newPassword ||
    !passwordData.newPasswordConfirm
  ) {
    throw new Error("All password fields are required");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(passwordData),
  };

  try {
    const response = await fetch(
      `${apiUrlUsers}/${userId}/change-password`,
      options
    );
    const responseData = await response.json();

    if (!response.ok) {
      // Security: Sanitize error messages for password operations
      const errorMessage = responseData.detail || "Password update failed";
      throw new Error("Failed to update password: " + errorMessage);
    }
  } catch (error) {
    console.error(
      "Failed to update password:",
      error instanceof Error ? error.message : error
    );
    throw new Error("Failed to update password, please try again later");
  }
}
