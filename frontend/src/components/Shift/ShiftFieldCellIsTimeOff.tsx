import React from "react";

import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";

import { ShiftT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";

interface Props {
  shift: ShiftT;
}

export default function ShiftFieldCellIsTimeOff({ shift }: Props) {
  const updateShift = useShiftStore((state) => state.updateShift);

  const handleToggle = () => {
    const updatedShift = { ...shift, isTimeOff: !shift.isTimeOff };
    updateShift(updatedShift);
  };

  return (
    <TableCell component="th" scope="row">
      <Checkbox checked={shift.isTimeOff} onClick={handleToggle} />
    </TableCell>
  );
}
