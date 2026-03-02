"use client";

import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import AdminUsersTable from "./admin-users-table";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useStartImpersonationWithTarget } from "@/hooks/useAdminImpersonation";
// MUI
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
// Types
import { UserT } from "@/types/user";

interface AdminUsersTabProps {
  lng: string;
}

export default function AdminUsersTab({ lng }: AdminUsersTabProps) {
  const { users, loading, error } = useAdminUsers();
  const startImpersonation = useStartImpersonationWithTarget();
  const [accessError, setAccessError] = useState<string | null>(null);

  const handleAccessAccount = async (userId: string) => {
    const target = users.find((u: UserT) => u.id === userId);
    if (!target) return;

    setAccessError(null);
    try {
      await startImpersonation({
        userId: target.id,
        firstName: target.firstName,
        lastName: target.lastName,
        email: target.email,
        language: target.language,
      });
    } catch (err) {
      console.error("Failed to access account:", err);
      setAccessError(
        err instanceof Error ? err.message : "Failed to access account",
      );
    }
  };

  if (loading) {
    return (
      <Box
        data-testid="admin-users-loading"
        display="flex"
        justifyContent="center"
        alignItems="center"
        p={4}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert data-testid="admin-users-error" severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <div data-testid="admin-users-tab">
      <Typography variant="h5" fontWeight={600} mb={3}>
        Users
      </Typography>
      {accessError && (
        <Alert
          data-testid="admin-access-error"
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setAccessError(null)}
        >
          {accessError}
        </Alert>
      )}
      <AdminUsersTable users={users} onAccessAccount={handleAccessAccount} />
    </div>
  );
}
