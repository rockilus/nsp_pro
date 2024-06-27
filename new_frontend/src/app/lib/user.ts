import { unstable_noStore as noStore } from "next/cache";
// Types
import { WorkerT, WorkerDimensionT, WorkerPropertyT } from "../../types/worker";
import { UserT } from "../../types/user";
import { User } from "supertokens-web-js/types";

const apiUrlUsers = process.env.NEXT_PUBLIC_API_URL + "/users";

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
    return responseData as UserT;
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
    return responseData as UserT;
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

export async function sendVerificationEmail(userId: string) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlUsers}/${userId}/send-verification-email`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to send verification email: " + responseData.detail
      );
    }
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error(
      "Failed to send verification email, please try again later"
    );
  }
}
