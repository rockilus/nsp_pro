import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import Box from "@mui/material/Box";
// Components
import ScheduleTableShift from "./ScheduleTableShift";
import ScheduleTableWorker from "./ScheduleTableWorker";

// Types
import { AssignmentT, ScheduleT, ObjectiveBreachT } from "../types";
import { TeamT } from "../../../containers/types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  schedule: ScheduleT;
  assignments: AssignmentT[];
  breaches: ObjectiveBreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  selectedDisplay: string;
  showBreaches: boolean;
  CBsDisplayed: string[];
}

export default function ScheduleDisplay({
  team,
  schedule,
  assignments,
  breaches,
  workers,
  shifts,
  selectedDisplay,
  showBreaches,
  CBsDisplayed,
}: Props) {
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
        team={team}
        shifts={shifts}
        workers={workers}
        assignments={assignments}
        schedule={schedule}
        dates={getDatesFromAssignments(assignments)}
        breaches={breaches}
        showBreaches={showBreaches}
      />
    ),
    worker: (
      <ScheduleTableWorker
        team={team}
        shifts={shifts}
        workers={workers}
        assignments={assignments}
        schedule={schedule}
        dates={getDatesFromAssignments(assignments)}
        breaches={breaches}
        showBreaches={showBreaches}
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
