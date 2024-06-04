import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Stores
import { useSnackBarStore } from "./snackbarStore";
// Types
import { UserT } from "../components/UserProfile/types";

dayjs.extend(utc);

const apiUrlUser = process.env.NEXT_PUBLIC_API_URL + "/users";

type UserStateT = {
  user: UserT | null;
  fetchUser: () => void;
  fetchUserStore: (user: UserT) => void;
  updateUser: (updatedUser: UserT) => void;
  updatePassword: (
    passwordData: {
      currentPassword: string;
      newPassword: string;
      newPasswordConfirm: string;
    },
    userId: string
  ) => void;
  // deleteUser: (id: string) => void;
};

export const useUserStore = create<UserStateT>()((set) => ({
  user: null,

  fetchUser: async () => {
    const options: RequestInit = {
      method: "GET",
      credentials: "include",
    };
    try {
      const response = await fetch(`${apiUrlUser}/me`, options);
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to fetch user: " + responseData.detail,
            "error"
          );
        return;
      }
      const user: UserT = await response.json();
      set({ user: user });
    } catch (error) {
      console.error("Failed to fetch user:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to fetch user, please try again later",
          "error"
        );
    }
  },

  fetchUserStore: (user: UserT) => {
    set({ user: user });
  },

  updateUser: async (updatedUser) => {
    try {
      const response = await fetch(`${apiUrlUser}/${updatedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedUser),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update user: " + responseData.detail,
            "error"
          );
        return;
      }
      const newUser: UserT = responseData;
      set((state) => ({
        user: newUser,
      }));
    } catch (error) {
      console.error("Failed to update user:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update user, please try again later",
          "error"
        );
    }
  },

  updatePassword: async (passwordData, userId) => {
    try {
      const response = await fetch(`${apiUrlUser}/${userId}/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      });
      const responseData = await response.json();
      if (!response.ok) {
        useSnackBarStore
          .getState()
          .updateSnackBar(
            "Failed to update password: " + responseData.detail,
            "error"
          );
        return;
      }
      useSnackBarStore
        .getState()
        .updateSnackBar("Password updated successfully", "success");
    } catch (error) {
      console.error("Failed to update password:", error);
      useSnackBarStore
        .getState()
        .updateSnackBar(
          "Failed to update password, please try again later",
          "error"
        );
    }
  },

  // deleteUser: async (id) => {
  //   try {
  //     await fetch(`${apiUrlUser}/${id}`, {
  //       method: "DELETE",
  //     });
  //     set((state) => ({
  //       user: state.user.filter((s) => s.id !== id),
  //     }));
  //   } catch (error) {
  //     console.error("Failed to delete user:", error);
  //   }
  // },
}));
