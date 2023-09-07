import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";
import { WorkerParamsProvider } from "../context/WorkerParamsContext";
import { WorkersProvider } from "../context/WorkersContext";

export default function Home() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <WorkerParamsProvider>
          <WorkersProvider>
            <Draft />
          </WorkersProvider>
        </WorkerParamsProvider>
      </LocalizationProvider>
    </div>
  );
}
