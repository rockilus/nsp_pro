import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Components
import ScheduleTableShift from "./shift-table/schedule-table-shift";
import ScheduleTableWorker from "./worker-table/schedule-table-worker";
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
  lng,
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
  lng: string;
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

  const periodDates = buildDates(startDate, endDate);

  const scheduleDisplays: { [key: string]: JSX.Element } = {
    shift: (
      <ScheduleTableShift
        lng={lng}
        teamId={teamId}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        schedule={schedule}
        periodDates={periodDates}
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
        lng={lng}
        teamId={teamId}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        schedule={schedule}
        dates={periodDates}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        handleCellSelection={handleCellSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleDeleteDSD={handleDeleteDSD}
      />
    ),
  };

  return scheduleDisplays[selectedDisplay];
}
