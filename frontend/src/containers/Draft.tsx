import * as React from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import ConstraintConfig from "../components/ConstraintConfig/ConstraintConfig";
import ShiftConfig from "../components/Shift/ShiftConfig";
import WorkerConfig from "../components/Worker/WorkerConfig";
import CoveragePanel from "../components/Coverage/CoveragePanel";

import { serverGetSolver } from "../api/solver";
import { ShiftParamsContext } from "../context/ShiftParamsContext";
import { ShiftT } from "../components/Coverage/types";
import { useShiftStore } from "../stores/shiftStore";

export default function Draft() {
  const shiftParamsContext = React.useContext(ShiftParamsContext);
  const shifts = useShiftStore((state) => state.shifts);

  const findShiftName = (s: any) => {
    const shiftNameParamId = shiftParamsContext.currentShiftParams?.find(
      (p) => p.name === "shift_name"
    )?._id;
    if (!shiftNameParamId) {
      throw Error("Shift params should have shift_name");
    }
    const shiftPropForShiftName = s.shiftProperties.find(
      (p: any) => p.shiftDimensionId === shiftNameParamId
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

  console.log("shiftsForCoverage", shiftsForCoverage);

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
