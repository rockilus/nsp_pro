import * as React from "react";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";

import ConstraintBreachItem from "./ConstraintBreachItem";
import { ConstraintBreachT, ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  constraintBreaches: ConstraintBreachT[];
  CBsDisplayed: string[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addCBDisplayed: (id: string) => void;
  removeCBDisplayed: (id: string) => void;
}

export default function ConstraintBreachList({
  constraintBreaches,
  CBsDisplayed,
  workers,
  shifts,
  addCBDisplayed,
  removeCBDisplayed,
}: Props) {
  // const selectAllCBs = () => {
  //   if (CBsDisplayed.length > 0) {
  //     CBsDisplayed.map((id) => removeCBDisplayed(id));
  //   } else {
  //     constraintBreaches.map((cb) => addCBDisplayed(cb.id));
  //   }
  // };

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      <List dense={true}>
        {/* <> */}
        {/* <ListItem>
            <ListItemIcon>
              <Checkbox
                checked={CBsDisplayed.length > 0}
                color={
                  CBsDisplayed.length > 0 &&
                  CBsDisplayed.length < constraintBreaches.length
                    ? "default"
                    : "primary"
                }
                onClick={selectAllCBs}
              />
            </ListItemIcon>
            <ListItemText />
          </ListItem> */}
        {constraintBreaches.map((constraintBreach, index) => (
          <ConstraintBreachItem
            key={index}
            constraintBreach={constraintBreach}
            CBDisplayed={CBsDisplayed.includes(constraintBreach.id)}
            workers={workers}
            shifts={shifts}
            addCBDisplayed={addCBDisplayed}
            removeCBDisplayed={removeCBDisplayed}
          />
        ))}
        {/* </> */}
      </List>
    </Box>
  );
}
