/**
 * Example component showing how to use the UserApi in development vs production
 */

"use client";

import React, { useEffect, useState } from "react";
import { UserApi } from "../app/lib/api/userApi";
import { useApiClient } from "../app/lib/api-client";
import { isDevelopment } from "../config/env";
import { UserT } from "../types/user";
import { DevUserSwitcher } from "./dev/user-switcher";

export function UserProfile() {
  const [user, setUser] = useState<UserT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get API client - same interface for both dev and production
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Same call for both development and production
        const userData = await UserApi.getCurrentUser(apiClient);
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [apiClient]);

  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      {isDevelopment() && <DevUserSwitcher />}

      <h2>User Profile</h2>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Name:</strong> {user.first_name} {user.last_name}
      </p>

      {isDevelopment() && (
        <p>
          <em>Running in development mode</em>
        </p>
      )}
    </div>
  );
}
