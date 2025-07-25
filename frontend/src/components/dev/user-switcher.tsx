"use client";

import React from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
} from "@mui/material";
import { useAuth } from "../../contexts/dev-auth-context";
import { isDevelopment } from "../../config/env";

export function DevUserSwitcher() {
  const auth = useAuth();

  // Only show in development
  if (!isDevelopment()) {
    return null;
  }

  // Type guard to check if we have the dev-specific methods
  const isDev = "switchUser" in auth && "availableUsers" in auth;
  if (!isDev) {
    return null;
  }

  return (
    <Box sx={{ minWidth: 200, p: 1 }}>
      <Chip
        label="DEV MODE"
        color="warning"
        size="small"
        sx={{ mb: 1, display: "block" }}
      />
      <FormControl fullWidth size="small">
        <InputLabel>Dev User</InputLabel>
        <Select
          value={auth.user?.profile?.sub || ""}
          label="Dev User"
          onChange={(e) => (auth as any).switchUser(e.target.value)}
        >
          {(auth as any).availableUsers.map((user: any) => (
            <MenuItem key={user.id} value={user.id}>
              {user.name} ({user.email})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
