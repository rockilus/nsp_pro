"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { env } from "../config/env";

// Match the production auth context interface
interface DevUser {
  id_token?: string | null;
  profile?: {
    sub?: string;
    email?: string;
    name?: string;
  };
}

interface DevAuthContextType {
  user: DevUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  switchUser: (userId: string) => void;
  availableUsers: Array<{
    id: string;
    name: string;
    email: string;
    first_name: string;
    last_name: string;
  }>;
}

const DevAuthContext = createContext<DevAuthContextType | undefined>(undefined);

// Export with same name as production auth hook
export function useAuth(): DevAuthContextType {
  const context = useContext(DevAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a DevAuthProvider");
  }
  return context;
}

const DEV_USERS = [
  {
    id: env.devUserId, // Use the configured dev user ID
    name: "Dev User",
    email: "dev@nsp-pro.com",
    first_name: "Dev",
    last_name: "User",
  },
  {
    id: "admin-user-456",
    name: "Admin User",
    email: "admin@nsp-pro.com",
    first_name: "Admin",
    last_name: "User",
  },
];

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored dev user
    const savedUserId = localStorage.getItem("dev-auth-user");
    if (savedUserId) {
      const user = DEV_USERS.find((u) => u.id === savedUserId);
      if (user) {
        setCurrentUserId(user.id);
      }
    } else {
      // Default to first user (primary dev user from env)
      setCurrentUserId(DEV_USERS[0].id);
      localStorage.setItem("dev-auth-user", DEV_USERS[0].id);
    }
    setLoading(false);
  }, []);

  const switchUser = (userId: string): void => {
    const user = DEV_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUserId(user.id);
      localStorage.setItem("dev-auth-user", user.id);
      // Force page reload to reset any cached API calls
      window.location.reload();
    }
  };

  // Create user object that matches production auth interface
  const user: DevUser | null = currentUserId
    ? {
        id_token: currentUserId, // Use user ID as token in development
        profile: {
          sub: currentUserId,
          email:
            DEV_USERS.find((u) => u.id === currentUserId)?.email ||
            "dev@nsp-pro.com",
          name:
            DEV_USERS.find((u) => u.id === currentUserId)?.name || "Dev User",
        },
      }
    : null;

  const contextValue: DevAuthContextType = {
    user,
    loading,
    isAuthenticated: !!currentUserId,
    switchUser,
    availableUsers: DEV_USERS,
  };

  return (
    <DevAuthContext.Provider value={contextValue}>
      {children}
    </DevAuthContext.Provider>
  );
}
