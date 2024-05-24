import React, { Dispatch, SetStateAction } from "react";

import TableCell from "@mui/material/TableCell";

import ShiftFieldCellColor from "./ShiftFieldCellColor";
import ShiftFieldCellName from "./ShiftFieldCellName";
import ShiftFieldCellStartTime from "./ShiftFieldCellStartTime";
import ShiftFieldCellEndTime from "./ShiftFieldCellEndTime";
import ShiftFieldCellStaff from "./ShiftFieldCellStaff";
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
  return shiftField === "color" ? (
    <ShiftFieldCellColor shift={shift} />
  ) : shiftField === "name" ? (
    <ShiftFieldCellName
      shift={shift}
      editing={editing[shift.id] === "name"}
      setEditing={setEditing}
    />
  ) : shiftField === "start_time" ? (
    <ShiftFieldCellStartTime
      shift={shift}
      editing={editing[shift.id] === "start_time"}
      setEditing={setEditing}
    />
  ) : shiftField === "end_time" ? (
    <ShiftFieldCellEndTime
      shift={shift}
      editing={editing[shift.id] === "end_time"}
      setEditing={setEditing}
    />
  ) : shiftField === "staffing" ? (
    <ShiftFieldCellStaff
      shift={shift}
      editing={editing[shift.id] === "staffing"}
      setEditing={setEditing}
    />
  ) : (
    <TableCell></TableCell>
  );
}
