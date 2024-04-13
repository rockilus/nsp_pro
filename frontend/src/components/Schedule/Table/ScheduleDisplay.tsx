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
  schedules: ScheduleT[];
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
  schedules,
  assignments,
  breaches,
  workers,
  shifts,
  selectedDisplay,
  showBreaches,
  CBsDisplayed,
}: Props) {
  const getDates = (schedules: ScheduleT[]): dayjs.Dayjs[] => {
    const dates = new Set<string>();
    for (let schedule of schedules) {
      if (schedule.startDate && schedule.endDate) {
        let currentDate = schedule.startDate;
        while (currentDate <= schedule.endDate) {
          dates.add(dayjs.utc(currentDate).format("YYYY-MM-DD"));
          currentDate = currentDate.add(1, "day");
        }
      }
    }
    return Array.from(dates)
      .map((date) => dayjs.utc(date))
      .sort((a, b) => a.valueOf() - b.valueOf());
  };

  const scheduleDisplays: { [key: string]: JSX.Element } = {
    shift: (
      <ScheduleTableShift
        team={team}
        shifts={shifts}
        workers={workers}
        assignments={assignments}
        schedules={schedules}
        dates={getDates(schedules)}
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
        schedules={schedules}
        dates={getDates(schedules)}
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
