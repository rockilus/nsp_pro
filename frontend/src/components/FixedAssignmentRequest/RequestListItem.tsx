import React, { useState, useEffect, useCallback } from "react";
// MUI
import DeleteIcon from "@mui/icons-material/Delete";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
// Components
import RequestButton from "./RequestButton";
// Stores
import { useRequestStore } from "../../stores/requestStore";
// Types
import { RequestT } from "./types";
import { TeamT } from "../../containers/types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
}

export default function RequestListItem({
  team,
  request,
  workers,
  shifts,
}: Props) {
  const [stringState, setStringState] = useState<string>("");

  const deleteRequest = useRequestStore((state) => state.deleteRequest);

  const createString = useCallback(() => {
    const workerName = workers.find(
      (worker) => worker.id === request.workerId
    )?.name;
    const shiftName = shifts.find(
      (shift) => shift.id === request.shiftId
    )?.name;
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "short",
    };
    const dateString = new Intl.DateTimeFormat("en-US", options).format(
      request.date
    );
    const string = `${workerName} works ${shiftName} on ${dateString}`;
    setStringState(string);
  }, [request, workers, shifts]);

  useEffect(() => {
    createString();
  }, [request, workers, shifts, createString]);

  const handleDeleteRequest = () => {
    deleteRequest(request.id, team.id);
  };

  const editButton = () => {
    return (
      <ListItemButton>
        <Typography variant="caption">{stringState}</Typography>
      </ListItemButton>
    );
  };

  return (
    <ListItem
      secondaryAction={
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={handleDeleteRequest}
        >
          <DeleteIcon />
        </IconButton>
      }
      style={{
        backgroundColor:
          request.status === "approved"
            ? "#d4edda"
            : request.status === "rejected"
            ? "#f8d7da"
            : "transparent",
      }}
    >
      <RequestButton
        team={team}
        buttonElement={editButton()}
        request={request}
        workers={workers}
        shifts={shifts}
      />
    </ListItem>
  );
}
