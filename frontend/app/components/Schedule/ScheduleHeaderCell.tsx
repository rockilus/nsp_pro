import React from "react";

import TableCell from "@mui/material/TableCell";

import SchedulePanelDialog from "./SchedulePanelDialog";
import { ColumnT } from "./types";
import {
  ColorNoCoverage,
  ColorPast,
  ColorValidated,
} from "../../utils/constants";

interface Props {
  column: ColumnT;
  colIndex: number;
}

export default function ScheduleHeaderCell({ column, colIndex }: Props) {
  return (
    <TableCell
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
        padding: 0,
      }}
    >
      {column.schedule !== null ? (
        <SchedulePanelDialog
          buttonElement={column.name}
          schedule={column.schedule}
        />
      ) : (
        column.name
      )}
    </TableCell>
  );
}
