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

import BodyCell from "./BodyCell";
import HeadCell from "./HeadCell";
import CreateDrawer from "./CreateDrawer";
import { ColumnT, RowT, CellT } from "./types";

interface Props {
  columns: ColumnT[];
  rows: RowT[];
  handleAddColumn: (newColumn: ColumnT) => void;
  handleEditHeadCell: (updatedColumn: ColumnT) => void;
  handleDeleteColumn: (columnId: string) => void;
  handleAddRow: (newRow: Record<string, any>) => void;
  handleEditBodyCell: (updatedCell: CellT, defaultColumn: boolean) => void;
  handleDeleteRow: (rowId: string) => void;
}

export default function WorkerShiftTable({
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
                <HeadCell
                  key={colIndex}
                  column={column}
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
                {columns.map((column, colIndex) => {
                  const cell = row.find((c) => c.columnId === column.id);
                  return (
                    cell && (
                      <BodyCell
                        key={colIndex}
                        cell={cell}
                        column={column}
                        editing={bodyEditing[cell.rowId] === column.id}
                        setEditing={setBodyEditing}
                        handleEditCell={handleEditBodyCell}
                      />
                    )
                  );
                })}
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => handleDeleteRow(row[0].rowId)}>
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
      <CreateDrawer
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        handleAddColumn={handleAddColumn}
      />
    </>
  );
}
