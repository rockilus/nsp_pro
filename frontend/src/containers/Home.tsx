import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";
import { WorkerParamsProvider } from "../context/WorkerParamsContext";
import { ShiftParamsProvider } from "../context/ShiftParamsContext";
import { ConstraintParamsProvider } from "../context/ConstraintParamsContext";
import { ConstraintsProvider } from "../context/ConstraintsContext";

export default function Home() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <WorkerParamsProvider>
          <ShiftParamsProvider>
            <ConstraintParamsProvider>
              <ConstraintsProvider>
                <Draft />
              </ConstraintsProvider>
            </ConstraintParamsProvider>
          </ShiftParamsProvider>
        </WorkerParamsProvider>
      </LocalizationProvider>
    </div>
  );
}
