import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";
import { WorkerParamsProvider } from "../context/WorkerParamsContext";
import { WorkersProvider } from "../context/WorkersContext";
import { ShiftParamsProvider } from "../context/ShiftParamsContext";
import { ShiftsProvider } from "../context/ShiftsContext";
import { ConstraintParamsProvider } from "../context/ConstraintParamsContext";
import { ConstraintsProvider } from "../context/ConstraintsContext";
import CoveragePanel from "../components/Coverage/CoveragePanel";

export default function Home() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <WorkerParamsProvider>
          <WorkersProvider>
            <ShiftParamsProvider>
              <ShiftsProvider>
                <ConstraintParamsProvider>
                  <ConstraintsProvider>
                            <Draft />
                  </ConstraintsProvider>
                </ConstraintParamsProvider>
              </ShiftsProvider>
            </ShiftParamsProvider>
          </WorkersProvider>
        </WorkerParamsProvider>
        <CoveragePanel/>
      </LocalizationProvider>
    </div>
  );
}
