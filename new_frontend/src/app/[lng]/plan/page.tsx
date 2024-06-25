"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function Page() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <p>Plan Page</p>
    </LocalizationProvider>
  );
}
