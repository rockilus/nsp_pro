import React from "react";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

interface Props {
  columns: Record<string, any>[];
  rows: Record<string, any>[];
}

export default function ScheduleTable({ columns, rows }: Props) {
  //   console.log("columns", columns, "rows", rows);

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            {columns.map((column, colIndex) => (
              <TableCell key={colIndex} component="th" scope="row">
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
                  row.find(
                    (r: Record<string, any>) =>
                      r.column.getTime() === column.date.getTime()
                  ) || null;
                // console.log("row", row, "column", column);
                // console.log("cell", cell);

                return (
                  cell && (
                    <TableCell
                      key={rowIndex + colIndex}
                      component="th"
                      scope="row"
                      rowSpan={cell?.rowSpan || 1}
                    >
                      {cell?.value || ""}
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
