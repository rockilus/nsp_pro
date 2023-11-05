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
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ConstraintBreachItem({
  constraintBreach,
  CBDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: Props) {
  const switchDisplayCB = () => {
    if (CBDisplayed) {
      removeCBsDisplayed([constraintBreach.id]);
    } else {
      addCBsDisplayed([constraintBreach.id]);
    }
  };

  return (
    <ListItem
      sx={{ bgcolor: constraintBreach.hardToSoft ? "#f8d7da" : "inherit" }}
    >
      <ListItemIcon>
        <Checkbox checked={CBDisplayed} onClick={switchDisplayCB} />
      </ListItemIcon>
      <ListItemText primary={constraintBreach.description} />
    </ListItem>
  );
}
