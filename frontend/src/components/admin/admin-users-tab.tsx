"use client";

import React from "react";
import Typography from "@mui/material/Typography";
import AdminUsersTable from "./admin-users-table";
import { useAdminUsers } from "@/hooks/useAdminUsers";
// MUI
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

interface AdminUsersTabProps {
  lng: string;
}

export default function AdminUsersTab({ lng }: AdminUsersTabProps) {
  const { users, loading, error } = useAdminUsers();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <div>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Users
      </Typography>
      <AdminUsersTable users={users} onAccessAccount={undefined} />
    </div>
  );
}
