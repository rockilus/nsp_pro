import React from "react";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";

import { useRoleStore } from "../../stores/roleStore";
import { PermissionT, RoleT } from "./types";
import { PermissionMenuHeight } from "../../utils/constants";

interface Props {
  role: RoleT;
  permissions: PermissionT[];
}

export default function RolePermissionCell({ role, permissions }: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const updateRole = useRoleStore((state) => state.updateRole);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleAddPermission = (permissionName: string) => {
    const newRole = {
      ...role,
      permissions: [...role.permissions, permissionName],
    };
    updateRole(newRole);
    setAnchorEl(null);
  };

  return (
    <TableCell component="th" scope="row">
      <Box
        aria-controls={open ? "long-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        sx={{ cursor: "pointer", width: "100%", height: "20px" }}
      >
        {role.permissions.map((pName, index) => (
          <Chip
            key={index}
            label={pName}
            onDelete={() => {
              const newRole = {
                ...role,
                permissions: role.permissions.filter((p) => p !== pName),
              };
              updateRole(newRole);
            }}
          />
        ))}
      </Box>
      <Menu
        id="long-menu"
        MenuListProps={{
          "aria-labelledby": "long-button",
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            style: {
              maxHeight: PermissionMenuHeight * 4.5,
              width: "20ch",
            },
          },
        }}
      >
        {permissions
          .filter((p) => !role.permissions.includes(p.name))
          .map((permission) => (
            <MenuItem
              key={permission.id}
              onClick={() => handleAddPermission(permission.name)}
            >
              {permission.name}
            </MenuItem>
          ))}
      </Menu>
    </TableCell>
  );
}
