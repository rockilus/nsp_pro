"use client";

import React from "react";
// Types
import { UserT } from "@/types/user";
// MUI
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

interface AdminUsersTableProps {
  users: UserT[];
  /**
   * Called when the "Access account" button is clicked.
   * Left undefined until the impersonation feature is implemented.
   */
  onAccessAccount?: (userId: string) => void;
}

export default function AdminUsersTable({
  users,
  onAccessAccount,
}: AdminUsersTableProps) {
  if (users.length === 0) {
    return (
      <Typography
        data-testid="admin-no-users-message"
        color="text.secondary"
        sx={{ mt: 2 }}
      >
        No users found.
      </Typography>
    );
  }

  return (
    <TableContainer
      data-testid="admin-users-table"
      component={Paper}
      variant="outlined"
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>First name</strong>
            </TableCell>
            <TableCell>
              <strong>Last name</strong>
            </TableCell>
            <TableCell>
              <strong>Email</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Actions</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} data-testid={`user-row-${user.id}`} hover>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell align="right">
                <Button
                  data-testid={`access-account-btn-${user.id}`}
                  variant="outlined"
                  size="small"
                  disabled={!onAccessAccount}
                  onClick={() => onAccessAccount?.(user.id)}
                >
                  Access account
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
