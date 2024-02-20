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

import PermissionRow from "./PermissionRow";
import { usePermissionStore } from "../../stores/permissionStore";
import { PermissionT } from "./types";

interface Props {
  permissions: PermissionT[];
}

export default function PermissionTable({ permissions }: Props) {
  const columnsPermission = useMemo(() => ["Name", "Description"], []);

  const addPermission = usePermissionStore((state) => state.addPermission);

  const handleAddPermission = () => {
    const newPermission: PermissionT = {
      id: "",
      name: "",
      description: "",
    };
    addPermission(newPermission);
  };

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            {columnsPermission.map((column, colIndex) => (
              <TableCell key={colIndex} component="th" scope="row">
                {column}
              </TableCell>
            ))}
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {permissions.map((permission) => (
            <PermissionRow key={permission.id} permission={permission} />
          ))}
          <TableRow>
            <TableCell colSpan={columnsPermission.length}>
              <Button onClick={handleAddPermission}>
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
