import React, { useState } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import BodyCellTemplate from "./BodyCellTemplate";
import HeadCellTemplate from "./HeadCellTemplate";
import DrawerTemplate from "./DrawerTemplate";

interface Props {
  columns: Record<string, any>[];
  rows: Record<string, any>[];
  handleAddColumn: (
    name: string,
    entryType: string,
    entryOptions: string[]
  ) => void;
  handleEditHeadCell: (
    columnId: string,
    value: any,
    entryType: string,
    entryOptions: string[]
  ) => void;
  handleDeleteColumn: (columnId: string) => void;
  handleAddRow: (newRow: Record<string, any>) => void;
  handleEditBodyCell: (
    rowId: string,
    columnId: string,
    value: any,
    defaultColumn: boolean
  ) => void;
  handleDeleteRow: (id: string) => void;
}

export default function TableTemplate({
  columns,
  rows,
  handleAddColumn,
  handleEditHeadCell,
  handleDeleteColumn,
  handleAddRow,
  handleEditBodyCell,
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
          <TableHead>
            <TableRow>
              {columns.map((column, colIndex) => (
                <HeadCellTemplate
                  key={colIndex}
                  columnId={column.id}
                  entryType={column.entryType}
                  entryOptions={column.entryOptions}
                  value={column.name}
                  defaultColumn={column.defaultColumn}
                  handleEditCell={handleEditHeadCell}
                  handleDeleteColumn={handleDeleteColumn}
                />
              ))}
              <TableCell>
                <Button onClick={toggleDrawer}>
                  <AddIcon />
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                {columns.map((column, colIndex) => (
                  <BodyCellTemplate
                    key={colIndex}
                    columnId={column.id}
                    rowId={row.id}
                    columnName={column.name}
                    entryType={column.entryType}
                    entryOptions={column.entryOptions}
                    value={row[column.name]}
                    defaultColumn={column.defaultColumn}
                    editing={bodyEditing[row.id] === column.id}
                    setEditing={setBodyEditing}
                    handleEditCell={handleEditBodyCell}
                  />
                ))}
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => handleDeleteRow(row.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={columns.length}>
                <Button onClick={handleAddRow}>
                  <AddIcon />
                  New
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <DrawerTemplate
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        handleAddColumn={handleAddColumn}
      />
    </>
  );
}
