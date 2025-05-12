"use client";

import { useState, useEffect } from "react";
// Actions
import { getUser } from "@/app/lib/user";
// Types
import { UserT } from "@/types/user";

export function useUserSelector() {
  const [user, setUser] = useState<UserT | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getUser(); // Fetch user data from backend
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  return {
    user,
    loading,
  };
}
