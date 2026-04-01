"use client";

import { createContext, useContext } from "react";
// Types
import { UserT } from "@/types/user";

type UserContextType = {
  user: UserT | null;
  loading: boolean;
};

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
