import React, { useState } from "react";

import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import ConstraintBreachItem from "./ConstraintBreachItem";
import { ConstraintBreachT, ShiftIdNameT, WorkerIdNameT } from "./types";

interface Props {
  constraintBreaches: ConstraintBreachT[];
  CBsDisplayed: string[];
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}

export default function ConstraintBreachList({
  constraintBreaches,
  CBsDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: Props) {
  const CBsConstraint: ConstraintBreachT[] = constraintBreaches
    .filter((cb) => cb.category === "constraint")
    .sort((a, b) => (a.hardToSoft ? -1 : 1));
  const CBsFA: ConstraintBreachT[] = constraintBreaches.filter(
    (cb) => cb.category === "fixed_assignment"
  );
  const CBsRequest: ConstraintBreachT[] = constraintBreaches.filter(
    (cb) => cb.category === "request"
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
                constraintBreach={constraintBreach}
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
          <List dense={true}>
            {CBsFA.map((constraintBreach, index) => (
              <ConstraintBreachItem
                key={index}
                constraintBreach={constraintBreach}
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
          <List dense={true}>
            {CBsRequest.map((constraintBreach, index) => (
              <ConstraintBreachItem
                key={index}
                constraintBreach={constraintBreach}
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
