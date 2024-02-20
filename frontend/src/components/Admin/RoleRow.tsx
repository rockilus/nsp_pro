import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
import TableRow from "@mui/material/TableRow";

import RolePermissionCell from "./RolePermissionsCell";
import { usePermissionStore } from "../../stores/permissionStore";
import { useRoleStore } from "../../stores/roleStore";
import { PermissionT, RoleT } from "./types";

interface Props {
  role: RoleT;
  permissions: PermissionT[];
}

export default function RoleRow({ role, permissions }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [roleState, setRoleState] = useState<RoleT>(role);

  const updateRole = useRoleStore((state) => state.updateRole);
  const deleteRole = useRoleStore((state) => state.deleteRole);

  const handleEditConfirm = () => {
    if (
      roleState.name !== role.name ||
      roleState.description !== role.description
    ) {
      updateRole(roleState);
    }
    setEditingName(false);
    setEditingDescription(false);
  };

  const handleEditCancel = () => {
    setEditingName(false);
    setEditingDescription(false);
    setRoleState(role);
  };

  return (
    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
      <TableCell
        component="th"
        scope="row"
        onClick={() => setEditingName(true)}
      >
        {editingName ? (
          <TextField
            fullWidth
            type="text"
            name="name"
            value={roleState.name}
            onChange={(e) =>
              setRoleState({ ...roleState, name: e.target.value })
            }
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditConfirm();
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            autoFocus
          />
        ) : (
          role.name
        )}
      </TableCell>
      <TableCell
        component="th"
        scope="row"
        onClick={() => setEditingDescription(true)}
      >
        {editingDescription ? (
          <TextField
            fullWidth
            type="text"
            name="description"
            value={roleState.description}
            onChange={(e) =>
              setRoleState({
                ...roleState,
                description: e.target.value,
              })
            }
            onBlur={handleEditConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditConfirm();
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            autoFocus
          />
        ) : (
          role.description
        )}
      </TableCell>
      <RolePermissionCell role={role} permissions={permissions} />
      <TableCell component="th" scope="row">
        <Box sx={{ display: "flex" }}>
          <Button onClick={() => deleteRole(role.id)}>
            <DeleteIcon />
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
