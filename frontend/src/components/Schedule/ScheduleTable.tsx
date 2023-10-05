import React from "react";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { ColumnT, RowT } from "./types";

interface Props {
  columns: ColumnT[];
  rows: RowT[];
}

export default function ScheduleTable({ columns, rows }: Props) {
  // console.log("columns", columns, "rows", rows);

  const noCoverageColor: string = "#FDEDEC";

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            {columns.map((column, colIndex) => (
              <TableCell
                key={colIndex}
                component="th"
                scope="row"
                sx={{
                  backgroundColor: column.noCoverage
                    ? noCoverageColor
                    : "inherit",
                }}
              >
                {column.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              {columns.map((column, colIndex) => {
                const cell =
                  row.find((c) => c.date.getTime() === column.date.getTime()) ||
                  null;
                return (
                  cell && (
                    <TableCell
                      key={rowIndex + colIndex}
                      component="th"
                      scope="row"
                      rowSpan={cell.rowSpan}
                      sx={{
                        backgroundColor: column.noCoverage
                          ? noCoverageColor
                          : "inherit",
                      }}
                    >
                      {cell.value}
                    </TableCell>
                  )
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
