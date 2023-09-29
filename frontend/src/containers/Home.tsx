import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";
import { ConstraintParamsProvider } from "../context/ConstraintParamsContext";
import { ConstraintsProvider } from "../context/ConstraintsContext";

export default function Home() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ConstraintParamsProvider>
          <ConstraintsProvider>
            <Draft />
          </ConstraintsProvider>
        </ConstraintParamsProvider>
      </LocalizationProvider>
    </div>
  );
}
