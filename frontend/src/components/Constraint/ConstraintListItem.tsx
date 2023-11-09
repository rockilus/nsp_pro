import React, { useState, useEffect, useCallback } from "react";

import Checkbox from "@mui/material/Checkbox";
import DeleteIcon from "@mui/icons-material/Delete";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";

import ConstraintButton from "./ConstraintButton";
import { ConstraintT, TreeNodeT } from "./types";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";
import { useConstraintStore } from "../../stores/constraintStore";

interface Props {
  constraint: ConstraintT;
  tree: TreeNodeT;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

export default function ConstraintListItem({
  constraint,
  tree,
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
      } else if (
        ["shift_id", "shift_id_reference", "shift_id_relative"].includes(
          block.name
        )
      ) {
        const shiftIds = block.value as string[];
        const shiftName = shifts.find(
          (shift) => shiftIds.indexOf(shift.id) !== -1
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
        <ListItemText
          primary={stringState}
          secondary={constraint.hard ? "Hard" : `Soft (${constraint.priority})`}
          style={{ color: "black" }}
        />
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
        <Checkbox checked={constraint.active} onClick={handleToggle} />
      </ListItemIcon>
      <ConstraintButton
        buttonElement={editButton()}
        constraint={constraint}
        tree={tree}
        workers={workers}
        shifts={shifts}
      />
    </ListItem>
  );
}
