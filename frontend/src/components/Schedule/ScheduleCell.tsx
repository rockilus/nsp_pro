import React from "react";
import TableCell from "@mui/material/TableCell";

import { CellT } from "./types";

interface Props {
  cell: CellT;
}

export default function ScheduleCell({ cell }: Props) {
  const noCoverageColor: string = "#FDEDEC";

  return (
    <TableCell
      component="th"
      scope="row"
      rowSpan={cell.rowSpan}
      sx={{
        backgroundColor: cell.noCoverage ? noCoverageColor : "inherit",
        border: cell.constraintBreach ? "2px solid red" : "inherit",
      }}
    >
      {cell.value}
    </TableCell>
  );
}
