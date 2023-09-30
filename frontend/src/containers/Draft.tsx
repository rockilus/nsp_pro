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

  const findShiftName = (s: any) => {
    const shiftDimensionNameId = shiftDimensions?.find(
      (p) => p.name === "Shift Name"
    )?.id;
    if (!shiftDimensionNameId) {
      throw Error("Shift params should have shift_name");
    }
    const shiftPropForShiftName = s.shiftProperties.find(
      (p: any) => p.shiftDimensionId === shiftDimensionNameId
    );
    if (!shiftPropForShiftName) {
      return "No shift name";
      // throw Error(
      //   `Shift should have property for param id ${shiftNameParamId}`
      // );
    }

    return shiftPropForShiftName.value;
  };

  const shiftsForCoverage = shifts
    ? shifts.map((s) => {
        const shift: ShiftT = {
          id: s.id,
          name: findShiftName(s),
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
