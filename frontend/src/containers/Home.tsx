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
import { TimetablesProvider } from "../context/TimetablesContext";
import { TimetableCategoriesProvider } from "../context/TimetableCategoriesContext";
import { TimetableTimesProvider } from "../context/TimetableTimesContext";
import { TimetablePropertiesProvider } from "../context/TimetablePropertiesContext";

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
                    <TimetablesProvider>
                      <TimetableCategoriesProvider>
                        <TimetableTimesProvider>
                          <TimetablePropertiesProvider>
                            <Draft />
                          </TimetablePropertiesProvider>
                        </TimetableTimesProvider>
                      </TimetableCategoriesProvider>
                    </TimetablesProvider>
                  </ConstraintsProvider>
                </ConstraintParamsProvider>
              </ShiftsProvider>
            </ShiftParamsProvider>
          </WorkersProvider>
        </WorkerParamsProvider>
      </LocalizationProvider>
    </div>
  );
}
