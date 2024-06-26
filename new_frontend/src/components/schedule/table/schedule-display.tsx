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
  ObjectiveBreachT,
  SelectedCellT,
} from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";

dayjs.extend(utc);

export default function ScheduleDisplay({
  schedule,
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
  assignments: AssignmentT[];
  breaches: ObjectiveBreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  selectedDisplay: string;
  showBreaches: boolean;
  CBsDisplayed: string[];
  setSelectedCell: (selectedCell: SelectedCellT | null) => void;
}) {
  const getDatesFromAssignments = (
    assignments: AssignmentT[]
  ): dayjs.Dayjs[] => {
    if (assignments.length === 0) {
      return [];
    }

    let minDate = assignments[0].date;
    let maxDate = assignments[0].date;

    for (let assignment of assignments) {
      if (assignment.date.isBefore(minDate)) {
        minDate = assignment.date;
      }
      if (assignment.date.isAfter(maxDate)) {
        maxDate = assignment.date;
      }
    }

    const dates = [];
    let currentDate = minDate;

    while (currentDate.isBefore(maxDate)) {
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
        dates={getDatesFromAssignments(assignments)}
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
        dates={getDatesFromAssignments(assignments)}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        setSelectedCell={setSelectedCell}
      />
    ),
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        marginLeft: 0,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      {scheduleDisplays[selectedDisplay]}
    </Box>
  );
}
