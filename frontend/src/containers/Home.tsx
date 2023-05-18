import React from "react";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import ConfigTabs from "./ConfigTabs";
import NavAppBar from "./NavAppBar";
import { AuthProvider } from "../context/AuthContext";
import { DoctorsProvider } from "../context/DoctorsContext";
import { HospitalProvider } from "../context/HospitalContext";
import { ScheduleProvider } from "../context/ScheduleContext";

export default function Home() {
  return (
    <div>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <HospitalProvider>
            <DoctorsProvider>
              <ScheduleProvider>
                <NavAppBar />
                <ConfigTabs />
              </ScheduleProvider>
            </DoctorsProvider>
          </HospitalProvider>
        </AuthProvider>
      </LocalizationProvider>
    </div>
  );
}
