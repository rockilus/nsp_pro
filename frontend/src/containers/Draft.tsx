import * as React from "react";

import Box from "@mui/material/Box";

import ConstraintConfig from "../components/ConstraintConfig/ConstraintConfig";
import ShiftConfig from "../components/Shift/ShiftConfig";
import WorkerConfig from "../components/Worker/WorkerConfig";
import CoveragePanel from "../components/Coverage/CoveragePanel";
import ScheduleConfig from "../components/Schedule/ScheduleConfig";
import CoverageSelectorConfig from "../components/CoverageSelector/CoverageSelectorConfig";

import { ShiftT } from "../components/Coverage/types";
import { ShiftScheduleT, WorkerScheduleT } from "../components/Schedule/types";
import { useShiftStore } from "../stores/shiftStore";
import { useWorkerStore } from "../stores/workerStore";

export default function Draft() {
  const shifts = useShiftStore((state) => state.shifts);
  const workers = useWorkerStore((state) => state.workers);

  const shiftsForCoverage = shifts
    ? shifts.map((s) => {
        const shift: ShiftT = {
          id: s.id,
          name: s.name,
        };
        return shift;
      })
    : [];

  const shiftsForSchedule = shifts
    ? shifts.map((s) => {
        const shift: ShiftScheduleT = {
          id: s.id,
          name: s.name,
        };
        return shift;
      })
    : [];

  const workersForSchedule = workers
    ? workers.map((w) => {
        const worker: WorkerScheduleT = {
          id: w.id,
          name: w.name,
        };
        return worker;
      })
    : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <WorkerConfig />
      <ShiftConfig />
      {shiftsForCoverage.length > 0 && (
        <CoveragePanel shifts={shiftsForCoverage} />
      )}
      <CoverageSelectorConfig />
      {/* <ConstraintConfig /> */}
      <ScheduleConfig workers={workersForSchedule} shifts={shiftsForSchedule} />
    </Box>
  );
}
