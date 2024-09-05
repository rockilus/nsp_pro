import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
// Components
import ScheduleTableShift from "./schedule-table-shift";
import ScheduleTableWorker from "./schedule-table-worker";
// Types
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  SelectedCellT,
} from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";

dayjs.extend(utc);

export default function ScheduleDisplay({
  schedule,
  startDate,
  endDate,
  assignments,
  breaches,
  workers,
  shifts,
  requests,
  selectedDisplay,
  showBreaches,
  CBsDisplayed,
  setSelectedCell,
}: {
  schedule: ScheduleT;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  assignments: AssignmentT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  selectedDisplay: string;
  showBreaches: boolean;
  CBsDisplayed: string[];
  setSelectedCell: (selectedCell: SelectedCellT | null) => void;
}) {
  const buildDates = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
    const dates = [];
    let currentDate = startDate;

    while (currentDate.isBefore(endDate)) {
      dates.push(currentDate);
      currentDate = currentDate.add(1, "day");
    }
    return dates;
  };

  const scheduleDisplays: { [key: string]: JSX.Element } = {
    shift: (
      <ScheduleTableShift
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        schedule={schedule}
        dates={buildDates(startDate, endDate)}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        setSelectedCell={setSelectedCell}
      />
    ),
    worker: (
      <ScheduleTableWorker
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        schedule={schedule}
        dates={buildDates(startDate, endDate)}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        setSelectedCell={setSelectedCell}
      />
    ),
  };

  return scheduleDisplays[selectedDisplay];
  // <Box
  //   sx={{
  //     border: "1px solid grey",
  //     margin: 2,
  //     marginLeft: 0,
  //     overflowX: "auto",
  //     borderRadius: 2,
  //     backgroundColor: "none",
  //   }}
  // >
  //   {scheduleDisplays[selectedDisplay]}
  // </Box>
  // );
}
