import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { UserT } from "../../types/user";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlUsers = API_URL + "/users";

export const toUserT = (data: any): UserT => {
  return {
    ...data,
    signUpAt: dayjs.utc(data.signUpAt),
  };
};

//////////////////////////
// User //
//////////////////////////

export async function getUser() {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlUsers}/me`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch user: " + responseData.detail);
    }
    return toUserT(responseData) as UserT;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user, please try again later");
  }
}

export async function updateUser(user: UserT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  };
  try {
    const response = await fetch(`${apiUrlUsers}/${user.id}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update user: " + responseData.detail);
    }
    return toUserT(responseData) as UserT;
  } catch (error) {
    console.error("Failed to update user:", error);
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
) {
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
      throw new Error("Failed to update password: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to update password:", error);
    throw new Error("Failed to update password, please try again later");
  }
}
