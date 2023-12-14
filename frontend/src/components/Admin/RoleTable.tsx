import React, { useMemo } from "react";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import RoleRow from "./RoleRow";
import { useRoleStore } from "../../stores/roleStore";
import { PermissionT, RoleT } from "./types";

interface Props {
  roles: RoleT[];
  permissions: PermissionT[];
}

export default function RoleTable({ roles, permissions }: Props) {
  const columnsRole = useMemo(() => ["Name", "Description", "Permissions"], []);

  const addRole = useRoleStore((state) => state.addRole);

  const handleAddRole = () => {
    const newRole: RoleT = {
      id: "",
      name: "",
      description: "",
      permissions: [],
    };
    addRole(newRole);
  };

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            {columnsRole.map((column, colIndex) => (
              <TableCell key={colIndex} component="th" scope="row">
                {column}
              </TableCell>
            ))}
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((role) => (
            <RoleRow key={role.id} role={role} permissions={permissions} />
          ))}
          <TableRow>
            <TableCell colSpan={columnsRole.length}>
              <Button onClick={handleAddRole}>
                <AddIcon />
                New
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
