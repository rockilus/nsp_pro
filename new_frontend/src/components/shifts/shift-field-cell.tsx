import React, { Dispatch, SetStateAction } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import ShiftFieldCellColor from "./shift-field-cell-color";
import ShiftFieldCellName from "./shift-field-cell-name";
import ShiftFieldCellStartTime from "./shift-field-cell-start-time";
import ShiftFieldCellEndTime from "./shift-field-cell-end-time";
import ShiftFieldCellStaff from "./shift-field-cell-staff";
// Types
import { ShiftT } from "../../types/shift";

export default function ShiftFieldCell({
  shift,
  shiftField,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  shift: ShiftT;
  shiftField: string;
  editing: { [key: string]: string };
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  return shiftField === "color" ? (
    <ShiftFieldCellColor shift={shift} handleUpdateShift={handleUpdateShift} />
  ) : shiftField === "name" ? (
    <ShiftFieldCellName
      shift={shift}
      editing={editing[shift.id] === "name"}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === "start_time" ? (
    <ShiftFieldCellStartTime
      shift={shift}
      editing={editing[shift.id] === "start_time"}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === "end_time" ? (
    <ShiftFieldCellEndTime
      shift={shift}
      editing={editing[shift.id] === "end_time"}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === "staffing" ? (
    <ShiftFieldCellStaff
      shift={shift}
      editing={editing[shift.id] === "staffing"}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : (
    <TableCell></TableCell>
  );
}
