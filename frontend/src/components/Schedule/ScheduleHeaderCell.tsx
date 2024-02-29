import React from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import SchedulePanelDialog from "./SchedulePanelDialog";
// Types
import { ColumnT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import {
  ColorNoCoverage,
  ColorPast,
  ColorValidated,
} from "../../utils/constants";

interface Props {
  team: TeamT;
  column: ColumnT;
  colIndex: number;
}

export default function ScheduleHeaderCell({ team, column, colIndex }: Props) {
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
          team={team}
          buttonElement={column.name}
          schedule={column.schedule}
        />
      ) : (
        column.name
      )}
    </TableCell>
  );
}
