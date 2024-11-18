import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { toUserT } from "./user";
// Env Vars
import { API_URL } from "./env";
// Types
import { UserDashboardT } from "../../types/user";

dayjs.extend(utc);

const apiUrlDashboard = API_URL + "/admin-dashboard";

const toUserDashboardT = (data: any): UserDashboardT => {
  return {
    ...data,
    user: data.user ? toUserT(data.user) : null,
  };
};

//////////////////////////
// Users Dashboard //
//////////////////////////

export async function getUsersDashboard() {
  noStore();
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

export async function impersonateUser(userId: string) {
  noStore();
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
