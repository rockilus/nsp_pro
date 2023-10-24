import React, { useState, useEffect, useCallback } from "react";

import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import { ConstraintT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { useConstraintStore } from "../../stores/constraintStore";

interface Props {
  constraint: ConstraintT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintListItem({
  constraint,
  workers,
  shifts,
}: Props) {
  const [stringState, setStringState] = useState<string>("");

  const updateConstraint = useConstraintStore(
    (state) => state.updateConstraint
  );
  const deleteConstraint = useConstraintStore(
    (state) => state.deleteConstraint
  );

  const createString = useCallback(() => {
    const stringArray = [];

    for (let block of constraint.buildBlocks) {
      if (block.name === "worker_id") {
        const workerName = workers.find(
          (worker) => worker.id === block.value
        )?.name;
        stringArray.push(workerName);
      } else if (block.name === "shift_id") {
        const shiftName = shifts.find(
          (shift) => shift.id === block.value
        )?.name;
        stringArray.push(shiftName);
      } else {
        stringArray.push(block.value);
      }
    }

    const string = stringArray.join(" ");
    setStringState(string);
  }, [constraint, workers, shifts]);

  useEffect(() => {
    createString();
  }, [constraint, workers, shifts, createString]);

  const handleDelete = async () => {
    await deleteConstraint(constraint.id);
  };

  const handleToggle = async () => {
    const updatedConstraint = { ...constraint, active: !constraint.active };
    await updateConstraint(updatedConstraint);
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
        <IconButton edge="end" aria-label="delete" onClick={handleDelete}>
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemIcon>
        <Checkbox
          // edge="start"
          checked={constraint.active}
          onClick={handleToggle}
          // tabIndex={-1}
          // disableRipple
        />
      </ListItemIcon>
      {editButton()}
      {/* <FARButton
        buttonElement={editButton()}
        far={constraint}
        workers={workers}
        shifts={shifts}
      /> */}
    </ListItem>
  );
}
