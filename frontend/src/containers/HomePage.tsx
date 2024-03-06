import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";

export default function HomePage() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Draft />
      </LocalizationProvider>
    </div>
  );
}
