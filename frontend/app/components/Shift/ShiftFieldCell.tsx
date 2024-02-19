import React, { Dispatch, SetStateAction } from "react";

import TableCell from "@mui/material/TableCell";

import ShiftFieldCellColor from "./ShiftFieldCellColor";
import ShiftFieldCellName from "./ShiftFieldCellName";
import ShiftFieldCellStartTime from "./ShiftFieldCellStartTime";
import ShiftFieldCellEndTime from "./ShiftFieldCellEndTime";
import ShiftFieldCellStaff from "./ShiftFieldCellStaff";
import ShiftFieldCellIsTimeOff from "./ShiftFieldCellIsTimeOff";
import { ShiftT } from "./types";

interface Props {
  shift: ShiftT;
  shiftField: string;
  editing: { [key: string]: string };
  setEditing: Dispatch<SetStateAction<{}>>;
}

export default function ShiftFieldCell({
  shift,
  shiftField,
  editing,
  setEditing,
}: Props) {
  return shiftField === "Color" ? (
    <ShiftFieldCellColor shift={shift} />
  ) : shiftField === "Name" ? (
    <ShiftFieldCellName
      shift={shift}
      editing={editing[shift.id] === "Name"}
      setEditing={setEditing}
    />
  ) : shiftField === "Start time" ? (
    <ShiftFieldCellStartTime
      shift={shift}
      editing={editing[shift.id] === "Start time"}
      setEditing={setEditing}
    />
  ) : shiftField === "End time" ? (
    <ShiftFieldCellEndTime
      shift={shift}
      editing={editing[shift.id] === "End time"}
      setEditing={setEditing}
    />
  ) : shiftField === "Staffing" ? (
    <ShiftFieldCellStaff
      shift={shift}
      editing={editing[shift.id] === "Staffing"}
      setEditing={setEditing}
    />
  ) : shiftField === "Is time off" ? (
    <ShiftFieldCellIsTimeOff shift={shift} />
  ) : (
    <TableCell></TableCell>
  );
}
