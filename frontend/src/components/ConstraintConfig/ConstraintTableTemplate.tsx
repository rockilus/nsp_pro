import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";

import ConstraintDrawerTemplate from "./ConstraintDrawerTemplate";
import ConstraintRowTemplate from "./ConstraintRowTemplate";

interface Props {
  columns: string[];
  rows: Record<string, any>[];
  constraintParams: Record<string, any>;
  handleAddRow: (newRow: Record<string, any>) => void;
  handleEditRow: (rowId: string, constraint: Record<string, any>) => void;
  handleEditRowStatus: (rowId: string, active: boolean) => void;
  handleDeleteRow: (id: string) => void;
}

export default function ConstraintTableTemplate({
  columns,
  rows,
  constraintParams,
  handleAddRow,
  handleEditRow,
  handleEditRowStatus,
  handleDeleteRow,
}: Props) {
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            {rows.map((row, rowIndex) => (
              <ConstraintRowTemplate
                key={rowIndex}
                constraintParams={constraintParams}
                row={row}
                handleEditRow={handleEditRow}
                handleEditRowStatus={handleEditRowStatus}
                handleDeleteRow={handleDeleteRow}
              />
            ))}
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Button onClick={toggleDrawer}>
                  <AddIcon />
                  New
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <ConstraintDrawerTemplate
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        constraintParams={constraintParams}
        handleAddRow={handleAddRow}
      />
    </>
  );
}
