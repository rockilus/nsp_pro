import * as React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import ConstraintConfig from "../components/ConstraintConfig/ConstraintConfig";
import ShiftConfig from "../components/ConfigTables/ShiftConfig";
import WorkerConfig from "../components/ConfigTables/WorkerConfig";

import { serverGetSolver } from "../api/solver";

export default function Draft() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Button variant="contained" color="primary" onClick={serverGetSolver}>
        Solver
      </Button>
      <WorkerConfig />
      <ShiftConfig />
      <ConstraintConfig />
    </Box>
  );
}
