import React from "react";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import ScheduleCell from "./ScheduleCell";
import { ColumnT, RowT } from "./types";
import {
  ColorNoCoverage,
  ColorPast,
  ColorValidated,
} from "../../utils/constants";

interface Props {
  columns: ColumnT[];
  rows: RowT[];
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleTable({
  columns,
  rows,
  displayCBs,
  CBsDisplayed,
}: Props) {
  // console.log("columns", columns);

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column, colIndex) => (
              <TableCell
                key={colIndex}
                component="th"
                scope="row"
                sx={{
                  backgroundColor:
                    colIndex === 0
                      ? "#FFFFFF"
                      : column.status === "past"
                      ? ColorPast
                      : column.status === "validated"
                      ? ColorValidated
                      : column.noCoverage
                      ? ColorNoCoverage
                      : "inherit",
                  position: colIndex === 0 ? "sticky" : "static",
                  left: colIndex === 0 ? 0 : "auto",
                }}
              >
                {column.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column, colIndex) => {
                const cell =
                  row.find((c) => c.date.isSame(column.date)) || null;
                return (
                  cell && (
                    <ScheduleCell
                      key={rowIndex + colIndex}
                      cell={cell}
                      colIndex={colIndex}
                      displayCBs={displayCBs}
                      CBsDisplayed={CBsDisplayed}
                    />
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
