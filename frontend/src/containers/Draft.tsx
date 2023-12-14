import React, { useState, useEffect } from "react";

import Box from "@mui/material/Box";

import ConstraintConfig from "../components/Constraint/ConstraintConfig";
import ShiftConfig from "../components/Shift/ShiftConfig";
import ScheduleTab from "../components/Schedule/ScheduleTab";
import WorkerConfig from "../components/Worker/WorkerConfig";
import CoverageTab from "../components/Coverage/CoverageTab";
import CoverageSelectorConfig from "../components/CoverageSelector/CoverageSelectorConfig";
import FARConfig from "../components/FixedAssignmentRequest/FARConfig";
import SignIn from "../components/Login/SignIn";
import SignUp from "../components/Login/SignUp";
import MenuAppBar from "../components/AppBar/AppBar";
import Admin from "../components/Admin/Admin";

import { ShiftT } from "../components/Coverage/types";
import { ShiftDefaultT } from "../components/Shift/types";
import { ShiftIdNameT, WorkerIdNameT } from "../components/Schedule/types";
import { useShiftStore } from "../stores/shiftStore";
import { useWorkerStore } from "../stores/workerStore";
import { useUserStore } from "../stores/userStore";

export default function Draft() {
  const [showSignUp, setShowSignUp] = useState(false);

  const shifts = useShiftStore((state) => state.shifts);
  const workers = useWorkerStore((state) => state.workers);
  const user = useUserStore((state) => state.user);

  const fetchUser = useUserStore((state) => state.fetchUser);

  const shiftDefaults = shifts
    ? shifts.map((s) => {
        const shift: ShiftDefaultT = {
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          isTimeOff: s.isTimeOff,
          staffing: s.staffing,
          color: s.color,
        };
        return shift;
      })
    : [];

  const shiftsIdName = shifts
    ? shifts.map((s) => {
        const shift: ShiftIdNameT = {
          id: s.id,
          name: s.name,
        };
        return shift;
      })
    : [];

  const workersIdName = workers
    ? workers.map((w) => {
        const worker: WorkerIdNameT = {
          id: w.id,
          name: w.name,
        };
        return worker;
      })
    : [];

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    // {user && user.role === "admin" && (}
    user ? (
      <div>
        <MenuAppBar />
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <ConstraintConfig workers={workers} shifts={shifts} />
          <WorkerConfig />
          <ShiftConfig />
          <CoverageTab shifts={shiftDefaults} />
          <CoverageSelectorConfig />
          <FARConfig workers={workersIdName} shifts={shiftsIdName} />
          <ScheduleTab workers={workersIdName} shifts={shiftsIdName} />
          <Admin />
        </Box>
      </div>
    ) : showSignUp ? (
      <SignUp setShowSignUp={setShowSignUp} />
    ) : (
      <SignIn setShowSignUp={setShowSignUp} />
    )
  );
}
