import React, { useState, useEffect, useCallback } from "react";
import EditIcon from "@mui/icons-material/Edit";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

import FixedAssignmentButton from "./FixedAssignmentButton";
import { FixedAssignmentT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";

interface Props {
  fixedAssignment: FixedAssignmentT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FixedAssignmentListItem({
  fixedAssignment,
  workers,
  shifts,
}: Props) {
  const [stringState, setStringState] = useState<string>("");

  const deleteFixedAssignment = useFixedAssignmentStore(
    (state) => state.deleteFixedAssignment
  );

  const createString = useCallback(() => {
    const workerName = workers.find(
      (worker) => worker.id === fixedAssignment.workerId
    )?.name;
    const shiftName = shifts.find(
      (shift) => shift.id === fixedAssignment.shiftId
    )?.name;
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "short",
    };
    const dateString = new Intl.DateTimeFormat("en-US", options).format(
      fixedAssignment.date
    );
    const string = `${workerName} works ${shiftName} on ${dateString}`;
    setStringState(string);
  }, [fixedAssignment, workers, shifts]);

  useEffect(() => {
    createString();
  }, [fixedAssignment, workers, shifts, createString]);

  const handleDeleteFixedAssignment = async () => {
    await deleteFixedAssignment(fixedAssignment.id);
  };

  const editButton = () => {
    return (
      <IconButton edge="end" aria-label="edit" sx={{ marginRight: 0 }}>
        <EditIcon />
      </IconButton>
    );
  };

  return (
    <ListItem
      secondaryAction={
        <>
          <FixedAssignmentButton
            buttonElement={editButton()}
            fixedAssignment={fixedAssignment}
            workers={workers}
            shifts={shifts}
          />
          <IconButton
            edge="end"
            aria-label="delete"
            onClick={handleDeleteFixedAssignment}
          >
            <DeleteIcon />
          </IconButton>
        </>
      }
    >
      <ListItemText primary={stringState} />
    </ListItem>
  );
}
