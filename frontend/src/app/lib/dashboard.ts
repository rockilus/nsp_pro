import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Env Vars
import { API_URL } from "./env";
// Types
import { UserDashboardT, toUserDashboardT } from "../../types/user";

dayjs.extend(utc);

const apiUrlDashboard = API_URL + "/admin-dashboard";

//////////////////////////
// Users Dashboard //
//////////////////////////

export const checkUserAuthz = async (): Promise<boolean> => {
  // For static export, we can't make real API calls, so return a default value
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    console.warn(
      "checkUserAuthz: Static export mode, returning mock authorization"
    );
    return true; // Or false, depending on desired behavior for static export
  }

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const url = `${apiUrlDashboard}/check-authz`;
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error("Failed to check user authz");
    }
    return true;
  } catch (error) {
    console.error("Error checking user authorization:", error);
    throw new Error(
      "Error checking user authorization, please try again later"
    );
  }
};

export async function getUsersDashboard(): Promise<UserDashboardT[]> {
  // For static export, return empty array or mock data
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    console.warn(
      "getUsersDashboard: Static export mode, returning empty array"
    );
    return [];
  }

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const url = `${apiUrlDashboard}/users`;
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch shift dimensions: " + responseData.detail
      );
    }
    return responseData.map(toUserDashboardT);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw new Error("Failed to fetch users, please try again later");
  }
}

export async function getUserDashboard(
  userId: string
): Promise<UserDashboardT> {
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const url = `${apiUrlDashboard}/users/${userId}`;
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch shift dimensions: " + responseData.detail
      );
    }
    return toUserDashboardT(responseData);
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user, please try again later");
  }
}

export async function impersonateUser(userId: string): Promise<boolean> {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  };
  try {
    const url = `${apiUrlDashboard}/impersonate`;
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to impersonate user: " + responseData.detail);
    }
    return true;
  } catch (error) {
    console.error("Failed to impersonate user:", error);
    throw new Error("Failed to impersonate user, please try again later");
  }
}

export const stopImpersonation = async (): Promise<boolean> => {
  try {
    const options: RequestInit = {
      method: "POST",
      credentials: "include" as RequestCredentials,
      headers: {
        "Content-Type": "application/json",
      },
    };
    const url = `${apiUrlDashboard}/restore-session`;
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail);
    }
    return true;
  } catch (error) {
    console.error("Failed to restore admin session:", error);
    throw new Error("Failed to restore admin session, please try again later");
  }
};

export async function deleteUser(userId: string): Promise<boolean> {
  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const url = `${apiUrlDashboard}/users/${userId}`;
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete user: " + responseData.detail);
    }
    return true;
  } catch (error) {
    console.error("Failed to delete user:", error);
    throw new Error("Failed to delete user, please try again later");
  }
}
