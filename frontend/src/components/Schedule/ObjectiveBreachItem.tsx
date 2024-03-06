import * as React from "react";

import Checkbox from "@mui/material/Checkbox";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import { ObjectiveBreachT, ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  objectiveBreach: ObjectiveBreachT;
  CBDisplayed: boolean;
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ConstraintBreachItem({
  objectiveBreach,
  CBDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: Props) {
  const switchDisplayCB = () => {
    if (CBDisplayed) {
      removeCBsDisplayed([objectiveBreach.id]);
    } else {
      addCBsDisplayed([objectiveBreach.id]);
    }
  };

  return (
    <ListItem
      sx={{ bgcolor: objectiveBreach.hardToSoft ? "#f8d7da" : "inherit" }}
    >
      <ListItemIcon>
        <Checkbox checked={CBDisplayed} onClick={switchDisplayCB} />
      </ListItemIcon>
      <ListItemText primary={objectiveBreach.description} />
    </ListItem>
  );
}
