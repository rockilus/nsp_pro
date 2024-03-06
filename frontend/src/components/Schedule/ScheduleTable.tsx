import React from "react";
// MUI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import ScheduleCell from "./ScheduleCell";
import ScheduleHeaderCell from "./ScheduleHeaderCell";
// Types
import { ColumnT, RowT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  columns: ColumnT[];
  rows: RowT[];
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleTable({
  team,
  columns,
  rows,
  displayCBs,
  CBsDisplayed,
}: Props) {
  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table" stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column, colIndex) => (
              <ScheduleHeaderCell
                key={colIndex}
                team={team}
                column={column}
                colIndex={colIndex}
              />
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
