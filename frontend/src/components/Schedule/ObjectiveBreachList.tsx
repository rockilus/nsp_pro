import React from "react";
// MUI
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
// Components
import ConstraintBreachItem from "./ObjectiveBreachItem";
// Types
import { ObjectiveBreachT } from "./types";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";

interface Props {
  objectiveBreaches: ObjectiveBreachT[];
  CBsDisplayed: string[];
  workers: WorkerT[];
  shifts: ShiftT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ObjectiveBreachList({
  objectiveBreaches,
  CBsDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: Props) {
  const CBsConstraint: ObjectiveBreachT[] = objectiveBreaches
    .filter((cb) => cb.objectiveCategory === "constraint")
    .sort((a, b) => (a.hardToSoft ? -1 : 1));
  const CBsRequest: ObjectiveBreachT[] = objectiveBreaches.filter(
    (cb) => cb.objectiveCategory === "request"
  );

  const checkedConstraint: boolean = CBsConstraint.some((cb) =>
    CBsDisplayed.includes(cb.id)
  );

  const checkColorConstraint: string = CBsConstraint.every((cb) =>
    CBsDisplayed.includes(cb.id)
  )
    ? "primary"
    : "default";

  const switchDisplayCBsConstraint = () => {
    if (CBsConstraint.every((cb) => CBsDisplayed.includes(cb.id))) {
      removeCBsDisplayed(CBsConstraint.map((cb) => cb.id));
    } else {
      for (let cb of CBsConstraint.filter(
        (cb) => !CBsDisplayed.includes(cb.id)
      )) {
        addCBsDisplayed(CBsConstraint.map((cb) => cb.id));
      }
    }
  };

  const checkedRequest: boolean = CBsRequest.some((cb) =>
    CBsDisplayed.includes(cb.id)
  );

  const checkColorRequest: string = CBsRequest.every((cb) =>
    CBsDisplayed.includes(cb.id)
  )
    ? "primary"
    : "default";

  const switchDisplayCBsRequest = () => {
    if (CBsRequest.every((cb) => CBsDisplayed.includes(cb.id))) {
      removeCBsDisplayed(CBsRequest.map((cb) => cb.id));
    } else {
      for (let cb of CBsRequest.filter((cb) => !CBsDisplayed.includes(cb.id))) {
        addCBsDisplayed(CBsRequest.map((cb) => cb.id));
      }
    }
  };

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
      {CBsConstraint.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignContent: "left",
              alignItems: "center",
            }}
          >
            <Checkbox
              checked={checkedConstraint}
              color={checkColorConstraint as "primary" | "default"}
              onClick={switchDisplayCBsConstraint}
            />
            <Typography>Constraints</Typography>
          </Box>
          <List dense={true}>
            {CBsConstraint.map((constraintBreach, index) => (
              <ConstraintBreachItem
                key={index}
                objectiveBreach={constraintBreach}
                CBDisplayed={CBsDisplayed.includes(constraintBreach.id)}
                workers={workers}
                shifts={shifts}
                addCBsDisplayed={addCBsDisplayed}
                removeCBsDisplayed={removeCBsDisplayed}
              />
            ))}
          </List>
        </Box>
      )}
      {CBsRequest.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignContent: "left",
              alignItems: "center",
            }}
          >
            <Checkbox
              checked={checkedRequest}
              color={checkColorRequest as "primary" | "default"}
              onClick={switchDisplayCBsRequest}
            />
            <Typography>Requests</Typography>
          </Box>
          <List dense={true}>
            {CBsRequest.map((constraintBreach, index) => (
              <ConstraintBreachItem
                key={index}
                objectiveBreach={constraintBreach}
                CBDisplayed={CBsDisplayed.includes(constraintBreach.id)}
                workers={workers}
                shifts={shifts}
                addCBsDisplayed={addCBsDisplayed}
                removeCBsDisplayed={removeCBsDisplayed}
              />
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}
