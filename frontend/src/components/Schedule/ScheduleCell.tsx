import React from "react";
import TableCell from "@mui/material/TableCell";

import { CellT } from "./types";

interface Props {
  cell: CellT;
  displayCBs: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleCell({
  cell,
  displayCBs,
  CBsDisplayed,
}: Props) {
  const hardCBs = cell.constraintBreach.filter((cb) => cb.hardToSoft);

  const noCoverageColor: string = "#E0E0E0";
  const hardBreachColor: string = "#FADBD8";

  const backgroundColor: string =
    displayCBs &&
    hardCBs.length > 0 &&
    hardCBs.some((hardCB) => CBsDisplayed.includes(hardCB.id))
      ? hardBreachColor
      : cell.noCoverage
      ? noCoverageColor
      : "inherit";
  const border: string =
    displayCBs &&
    cell.constraintBreach.length > 0 &&
    cell.constraintBreach.some((cb) => CBsDisplayed.includes(cb.id))
      ? "2px solid red"
      : " 2px inherit";

  console.log("cell", cell);
  console.log("CBsDisplayed", CBsDisplayed);
  console.log("border", border);

  return (
    <TableCell
      component="th"
      scope="row"
      rowSpan={cell.rowSpan}
      sx={{
        backgroundColor: backgroundColor,
        border: border,
      }}
    >
      {cell.value}
    </TableCell>
  );
}
