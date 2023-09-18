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

import TimetableBodyCellTemplate from "./TimetableBodyCellTemplate";
import TimetableHeadCellTemplate from "./TimetableHeadCellTemplate";
import TimetableDrawerTemplate from "./TimetableDrawerTemplate";

interface Props {
  columns: Record<string, any>[];
  rows: Record<string, any>[];
  handleAddColumn: (
    label: string,
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
  handleEditBodyCell: (rowId: string, columnId: string, value: any) => void;
  handleDeleteRow: (id: string) => void;
  handleAddCell: (
    value: string,
    timetableId: string,
    timetableCategoryId: string,
    timetableTimeId: string
  ) => void;
  handleUpdateCell: (timetablePropertyId: string, value: string) => void;
  handleDeleteCell: (timetablePropertyId: string) => void;
}

export default function TimetableTableTemplate({
  columns,
  rows,
  handleAddColumn,
  handleEditHeadCell,
  handleDeleteColumn,
  handleEditBodyCell,
  handleDeleteRow,
  handleAddCell,
  handleUpdateCell,
  handleDeleteCell,
}: Props) {
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      {/* {console.log("columns in TableTemplate: ", typeof columns, columns)}
      {console.log("rows in TableTemplate: ", typeof rows, rows)} */}
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {columns.map((column, colIndex) => (
                <TimetableHeadCellTemplate
                  key={colIndex}
                  columnId={column._id}
                  entryType={column.entry_type}
                  entryOptions={column.entry_options}
                  value={column.label}
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
                {columns.map(
                  (column, colIndex) =>
                    row[column._id] && (
                      <TimetableBodyCellTemplate
                        key={colIndex}
                        cellInfo={row[column._id]}
                        handleAddCell={handleAddCell}
                        handleUpdateCell={handleUpdateCell}
                        handleDeleteCell={handleDeleteCell}
                      />
                    )
                )}
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => handleDeleteRow(row._id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TimetableDrawerTemplate
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
        handleAddColumn={handleAddColumn}
      />
    </>
  );
}
