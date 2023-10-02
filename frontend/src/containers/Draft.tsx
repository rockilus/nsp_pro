import * as React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import ConstraintConfig from "../components/ConstraintConfig/ConstraintConfig";
import ShiftConfig from "../components/Shift/ShiftConfig";
import WorkerConfig from "../components/Worker/WorkerConfig";
import CoveragePanel from "../components/Coverage/CoveragePanel";

import { serverGetSolver } from "../api/solver";
import { ShiftT } from "../components/Coverage/types";
import { useShiftStore } from "../stores/shiftStore";
import { useShiftDimensionStore } from "../stores/shiftDimensionStore";

export default function Draft() {
  const shifts = useShiftStore((state) => state.shifts);
  const shiftDimensions = useShiftDimensionStore(
    (state) => state.shiftDimensions
  );

  const shiftsForCoverage = shifts
    ? shifts.map((s) => {
        const shift: ShiftT = {
          id: s.id,
          name: s.name,
        };
        return shift;
      })
    : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <Button variant="contained" color="primary" onClick={serverGetSolver}>
        Solver
      </Button>
      <WorkerConfig />
      <ShiftConfig />
      {shiftsForCoverage.length > 0 && (
        <CoveragePanel shifts={shiftsForCoverage} />
      )}
      <ConstraintConfig />
    </Box>
  );
}
