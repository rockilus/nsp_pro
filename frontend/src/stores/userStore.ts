import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { create } from "zustand";
// Types
import { UserSignInT, UserSignUpT, UserT } from "../components/Login/types";

dayjs.extend(utc);

const apiUrlUser = process.env.NEXT_PUBLIC_API_URL + "/user";

type UserStateT = {
  user: UserT | null;
  fetchUser: () => void;
  signUp: (userSignUp: UserSignUpT) => void;
  signIn: (userSignIn: UserSignInT) => void;
  // updateUser: (updatedUser: UserT) => void;
  signOut: () => void;
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
      if (response.ok) {
        const user: UserT = await response.json();
        set({ user: user });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  },

  signUp: async (userSignUp) => {
    try {
      const response = await fetch(`${apiUrlUser}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userSignUp),
      });
      if (response.ok) {
        const newUser: UserT = await response.json();
        set({ user: newUser });
      }
    } catch (error) {
      throw Error(`Failed to add user: ${error}`);
    }
  },

  signIn: async (userSignIn) => {
    try {
      const response = await fetch(`${apiUrlUser}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams({
          grant_type: userSignIn.grantType,
          username: userSignIn.username,
          password: userSignIn.password,
        }).toString(),
      });
      if (response.ok) {
        const data: UserT = await response.json();
        set({ user: data });
      }
    } catch (error) {
      throw new Error("Invalid username or password");
    }
  },

  // updateUser: async (updatedUser) => {
  //   try {
  //     const response = await fetch(`${apiUrlUser}/${updatedUser.id}`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(updatedUser),
  //     });
  //     const data = await response.json();
  //     const newUser: UserT = toUserT(data);
  //     set((state) => ({
  //       user: state.user.map((s) => (s.id === newUser.id ? newUser : s)),
  //     }));
  //   } catch (error) {
  //     console.error("Failed to update user:", error);
  //   }
  // },

  signOut: async () => {
    try {
      const response = await fetch(`${apiUrlUser}/signout`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        set({ user: null });
      } else {
        throw new Error("Failed to sign out");
      }
    } catch (error) {
      console.log("Failed to sign out:", error);
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
