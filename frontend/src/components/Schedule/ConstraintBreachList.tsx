import React from "react";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";

import ConstraintBreachItem from "./ObjectiveBreachItem";
import { ObjectiveBreachT, ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  objectiveBreaches: ObjectiveBreachT[];
  CBsDisplayed: string[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ConstraintBreachList({
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
  const CBsFA: ObjectiveBreachT[] = objectiveBreaches.filter(
    (cb) => cb.objectiveCategory === "fixed_assignment"
  );
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

  const checkedFA: boolean = CBsFA.some((cb) => CBsDisplayed.includes(cb.id));

  const checkColorFA: string = CBsFA.every((cb) => CBsDisplayed.includes(cb.id))
    ? "primary"
    : "default";

  const switchDisplayCBsFA = () => {
    if (CBsFA.every((cb) => CBsDisplayed.includes(cb.id))) {
      removeCBsDisplayed(CBsFA.map((cb) => cb.id));
    } else {
      for (let cb of CBsFA.filter((cb) => !CBsDisplayed.includes(cb.id))) {
        addCBsDisplayed(CBsFA.map((cb) => cb.id));
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
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography>Constraints</Typography>
        </AccordionSummary>
        <AccordionDetails>
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
            <Typography variant="body1">Select all</Typography>
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
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography>Fixed Assignments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignContent: "left",
              alignItems: "center",
            }}
          >
            <Checkbox
              checked={checkedFA}
              color={checkColorFA as "primary" | "default"}
              onClick={switchDisplayCBsFA}
            />
            <Typography variant="body1">Select all</Typography>
          </Box>
          <List dense={true}>
            {CBsFA.map((constraintBreach, index) => (
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
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <Typography>Requests</Typography>
        </AccordionSummary>
        <AccordionDetails>
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
            <Typography variant="body1">Select all</Typography>
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
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
