import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Components
import ScheduleTableShift from "./schedule-table-shift";
import ScheduleTableWorker from "./schedule-table-worker";
// Types
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  SelectedCellT,
  DailyShiftDemandT,
} from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";

dayjs.extend(utc);

export default function ScheduleDisplay({
  teamId,
  schedule,
  startDate,
  endDate,
  assignments,
  dailyShiftDemands,
  breaches,
  workers,
  shifts,
  requests,
  selectedDisplay,
  showBreaches,
  handleCellSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  teamId: string;
  schedule: ScheduleT;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  selectedDisplay: string;
  showBreaches: boolean;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
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
        teamId={teamId}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        schedule={schedule}
        dates={buildDates(startDate, endDate)}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        handleCellSelection={handleCellSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleDeleteDSD={handleDeleteDSD}
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
        handleCellSelection={handleCellSelection}
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
