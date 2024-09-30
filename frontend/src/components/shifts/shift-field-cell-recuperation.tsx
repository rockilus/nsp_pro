import React, { Dispatch, SetStateAction, useState } from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
// Types
import {
  ShiftT,
  ShiftLeaveType,
  ShiftRestType,
  ShiftType,
} from "../../types/shift";

export default function ShiftFieldCellRecuperation({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const handleEditConfirm = () => {
    if (
      shift.leaveType !== ShiftLeaveType.NONE ||
      shift.restType === ShiftRestType.OFF
    ) {
      return;
    }
    if (shift.restType === ShiftRestType.RECUPERATION) {
      handleUpdateShift({ ...shift, restType: ShiftRestType.NONE });
    } else {
      handleUpdateShift({ ...shift, restType: ShiftRestType.RECUPERATION });
    }
  };

  return (
    <TableCell
      component="th"
      scope="row"
      sx={{
        paddingY: 0,
        cursor:
          shift.leaveType === ShiftLeaveType.NONE &&
          shift.restType !== ShiftRestType.OFF
            ? "pointer"
            : "default",
      }}
    >
      <Checkbox
        checked={shift.restType === ShiftRestType.RECUPERATION}
        onChange={handleEditConfirm}
      />
    </TableCell>
  );
}
