import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import Draft from "./Draft";

export default function Home() {
  console.log("user locale:", Intl.DateTimeFormat().resolvedOptions().locale);
  console.log(
    "user timezone:",
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Draft />
      </LocalizationProvider>
    </div>
  );
}
