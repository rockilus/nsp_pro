import * as React from "react";

import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import { ConstraintBreachT, ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  constraintBreach: ConstraintBreachT;
  CBDisplayed: boolean;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addCBDisplayed: (id: string) => void;
  removeCBDisplayed: (id: string) => void;
}

export default function ConstraintBreachItem({
  constraintBreach,
  CBDisplayed,
  workers,
  shifts,
  addCBDisplayed,
  removeCBDisplayed,
}: Props) {
  const switchDisplayCB = () => {
    if (CBDisplayed) {
      removeCBDisplayed(constraintBreach.id);
    } else {
      addCBDisplayed(constraintBreach.id);
    }
  };

  return (
    <ListItem>
      <ListItemIcon>
        <Checkbox checked={CBDisplayed} onClick={switchDisplayCB} />
      </ListItemIcon>
      <ListItemText primary={constraintBreach.description} />
    </ListItem>
  );
}
