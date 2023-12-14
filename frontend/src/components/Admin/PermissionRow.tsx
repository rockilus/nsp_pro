import React, { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import TableCell from "@mui/material/TableCell";
import TextField from "@mui/material/TextField";
import TableRow from "@mui/material/TableRow";

import { usePermissionStore } from "../../stores/permissionStore";
import { PermissionT } from "./types";

interface Props {
  permission: PermissionT;
}

export default function PermissionRow({ permission }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [permissionState, setPermissionState] =
    useState<PermissionT>(permission);

  const updatePermission = usePermissionStore(
    (state) => state.updatePermission
  );
  const deletePermission = usePermissionStore(
    (state) => state.deletePermission
  );

  const handleEditConfirm = () => {
    if (
      permissionState.name !== permission.name ||
      permissionState.description !== permission.description
    ) {
      updatePermission(permissionState);
    }
    setEditingName(false);
    setEditingDescription(false);
  };

  const handleEditCancel = () => {
    setEditingName(false);
    setEditingDescription(false);
    setPermissionState(permission);
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
            value={permissionState.name}
            onChange={(e) =>
              setPermissionState({ ...permissionState, name: e.target.value })
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
          permission.name
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
            value={permissionState.description}
            onChange={(e) =>
              setPermissionState({
                ...permissionState,
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
          permission.description
        )}
      </TableCell>
      <TableCell component="th" scope="row">
        <Box sx={{ display: "flex" }}>
          <Button onClick={() => deletePermission(permission.id)}>
            <DeleteIcon />
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
