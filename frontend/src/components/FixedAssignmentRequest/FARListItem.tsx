import React, { useState, useEffect, useCallback } from "react";
// MUI
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteIcon from "@mui/icons-material/Delete";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import Typography from "@mui/material/Typography";
// Components
import FARButton from "./FARButton";
// Stores
import { useFixedAssignmentStore } from "../../stores/fixedAssignmentStore";
import { useRequestStore } from "../../stores/requestStore";
// Types
import { FarT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  far: FarT;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function FARListItem({ team, far, workers, shifts }: Props) {
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

  const handleDeleteFar = () => {
    if (far.isFA) {
      deleteFixedAssignment(far.id, team.id);
    } else {
      deleteRequest(far.id, team.id);
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
        team={team}
        buttonElement={editButton()}
        far={far}
        workers={workers}
        shifts={shifts}
      />
    </ListItem>
  );
}
