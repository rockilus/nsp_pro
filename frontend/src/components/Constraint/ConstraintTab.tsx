import React, { useEffect } from "react";

import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import ConstraintList from "./ConstraintList";
import ConstraintButton from "./ConstraintButton";
import NewConstraint from "./NewConstraint";
import { useConstraintStore } from "../../stores/constraintStore";
import { ShiftIdNameT, WorkerIdNameT } from "../Schedule/types";

interface Props {
  workers: WorkerIdNameT[];
  shifts: ShiftIdNameT[];
}

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
