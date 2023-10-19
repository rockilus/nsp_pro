import React, { useState, useEffect, useCallback } from "react";

import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import Typography from "@mui/material/Typography";

import FARButton from "./FARButton";
import { FarT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/RequestStore";

interface Props {
  far: FarT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function FARListItem({ far, workers, shifts }: Props) {
  const [stringState, setStringState] = useState<string>("");

  const deleteFixedAssignment = useFixedAssignmentStore(
    (state) => state.deleteFixedAssignment
  );
  const deleteRequest = useRequestStore((state) => state.deleteRequest);

  const createString = useCallback(() => {
    const workerName = workers.find(
      (worker) => worker.id === far.workerId
    )?.name;
    const shiftName = shifts.find((shift) => shift.id === far.shiftId)?.name;
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "short",
    };
    const dateString = new Intl.DateTimeFormat("en-US", options).format(
      far.date
    );
    const string = `${workerName} works ${shiftName} on ${dateString}`;
    setStringState(string);
  }, [far, workers, shifts]);

  useEffect(() => {
    createString();
  }, [far, workers, shifts, createString]);

  const handleDeleteFar = async () => {
    if (far.isFA) {
      await deleteFixedAssignment(far.id);
    } else {
      await deleteRequest(far.id);
    }
  };

  const editButton = () => {
    return (
      <ListItemButton>
        <ListItemIcon>
          {far.isFA ? <AssignmentTurnedInIcon /> : <QuestionAnswerIcon />}
        </ListItemIcon>
        <Typography variant="caption">{stringState}</Typography>
      </ListItemButton>
    );
  };

  return (
    <ListItem
      secondaryAction={
        <IconButton edge="end" aria-label="delete" onClick={handleDeleteFar}>
          <DeleteIcon />
        </IconButton>
      }
      style={{
        backgroundColor:
          far.status === "approved"
            ? "#d4edda"
            : far.status === "rejected"
            ? "#f8d7da"
            : "transparent",
      }}
      // style={{ backgroundColor: "#f8d7da" }}
      // style={{ backgroundColor: "transparent" }}
    >
      <FARButton
        buttonElement={editButton()}
        far={far}
        workers={workers}
        shifts={shifts}
      />
    </ListItem>
  );
}
