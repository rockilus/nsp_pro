import React, { Dispatch, SetStateAction } from "react";
// MUI
import TableCell from "@mui/material/TableCell";
// Components
import ShiftFieldCellColor from "./shift-field-cell-color";
import ShiftFieldCellName from "./shift-field-cell-name";
import ShiftFieldCellDuty from "./shift-field-cell-duty";
import ShiftFieldCellRecuperation from "./shift-field-cell-recuperation";
import ShiftFieldCellStartTime from "./shift-field-cell-start-time";
import ShiftFieldCellEndTime from "./shift-field-cell-end-time";
import ShiftFieldCellStaff from "./shift-field-cell-staff";
// Types
import { ShiftT } from "../../../types/shift";

export default function ShiftFieldCell({
  lng,
  shift,
  shifts,
  shiftField,
  editing,
  setEditing,
  handleUpdateShift,
}: {
  lng: string;
  shift: ShiftT;
  shifts: ShiftT[];
  shiftField: string;
  editing: { [key: string]: string };
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateShift: (updatedShift: ShiftT) => void;
}) {
  return shiftField === "color" ? (
    <ShiftFieldCellColor shift={shift} handleUpdateShift={handleUpdateShift} />
  ) : shiftField === "name" ? (
    <ShiftFieldCellName
      lng={lng}
      shift={shift}
      editing={editing[shift.id] === "name"}
      setEditing={setEditing}
      handleUpdateShift={handleUpdateShift}
    />
  ) : shiftField === "duty" ? (
    <ShiftFieldCellDuty shift={shift} handleUpdateShift={handleUpdateShift} />
  ) : shiftField === "recuperation" ? (
    <ShiftFieldCellRecuperation
      lng={lng}
      shift={shift}
      editing={editing[shift.id] === "recuperation"}
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
