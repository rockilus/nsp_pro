import React, { useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import ConstraintList from "./ConstraintList";
import ConstraintSentence from "./ConstraintSentence";
import NewConstraint from "./NewConstraint";
import { useConstraintStore } from "../../stores/constraintStore";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

// At most 2 consecutive days off
const selectors = [
  {
    name: "operator",
    options: ["at most", "at least", "exactly"],
    selected: ["at most"],
    multiple: false,
  },
  {
    name: "#",
    options: [],
    selected: ["2"],
    multiple: false,
  },
  {
    name: "timing",
    options: ["consecutive"],
    selected: ["consecutive"],
    multiple: false,
  },
  {
    name: "shift",
    options: ["days off", "morning", "afternoon", "evening", "night"],
    selected: ["days off"],
    multiple: true,
  },
];

const shift_selector = {
  name: "shift",
  options: ["off", "morning", "afternoon", "evening", "night"],
  selected: ["off"],
  multiple: true,
};

export default function ConstraintTab({ workers, shifts }: Props) {
  const constraints = useConstraintStore((state) => state.constraints);
  const fetchConstraints = useConstraintStore(
    (state) => state.fetchConstraints
  );

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  const createButton = () => {
    return (
      <Button variant="contained" color="primary" startIcon={<AddIcon />}>
        Create
      </Button>
    );
  };

  return (
    <Box style={{ width: "100%", backgroundColor: "white" }}>
      <ConstraintSentence selectors={selectors} />
      <Typography variant="h4" align="left" color="black">
        Constraints Configuration
      </Typography>
      <NewConstraint
        constraint={{
          id: "",
          text: "",
          hard: true,
          priority: "medium",
          active: true,
        }}
        handleClose={() => {}}
      />
      <ConstraintList constraints={constraints} />
    </Box>
  );
}
