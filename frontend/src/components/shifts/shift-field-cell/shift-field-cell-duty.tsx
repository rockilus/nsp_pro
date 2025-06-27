import React from "react";
// MUI
import Checkbox from "@mui/material/Checkbox";
import TableCell from "@mui/material/TableCell";
// Types
import {
  ShiftT,
  ShiftLeaveType,
  ShiftRestType,
  ShiftType,
} from "../../../types/shift";

export default function ShiftFieldCellDuty({
  shift,
  handleUpdateShift,
}: {
  shift: ShiftT;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  const handleEditConfirm = () => {
    if (shift.shiftType === ShiftType.DUTY) {
      handleUpdateShift({ ...shift, shiftType: ShiftType.NORMAL });
    } else {
      handleUpdateShift({ ...shift, shiftType: ShiftType.DUTY });
    }
  };

  return (
    <TableCell
      component="th"
      scope="row"
      sx={{
        paddingY: 0,
        textAlign: "center",
        cursor:
          shift.leaveType === ShiftLeaveType.NONE &&
          shift.restType !== ShiftRestType.OFF
            ? "pointer"
            : "default",
      }}
    >
      <Checkbox
        checked={shift.shiftType === ShiftType.DUTY}
        onChange={handleEditConfirm}
      />
    </TableCell>
  );
}
