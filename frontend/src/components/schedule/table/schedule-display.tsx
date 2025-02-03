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
  AssignmentDataDictT,
  DailyShiftDemandT,
  ExportOptionsT,
  ScheduleStatus,
} from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";

dayjs.extend(utc);

export default function ScheduleDisplay({
  lng,
  teamId,
  scheduleCampaign,
  periodDates,
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
  handleExportSchedule,
}: {
  lng: string;
  teamId: string;
  scheduleCampaign: ScheduleT | null;
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  selectedDisplay: string;
  showBreaches: boolean;
  handleCellSelection: (selectedCell: AssignmentDataDictT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
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
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        handleCellSelection={handleCellSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleDeleteDSD={handleDeleteDSD}
        handleExportSchedule={handleExportSchedule}
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
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        showBreaches={showBreaches}
        selectedDisplay={selectedDisplay}
        handleCellSelection={handleCellSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleDeleteDSD={handleDeleteDSD}
        handleExportSchedule={handleExportSchedule}
      />
    ),
  };

  return scheduleDisplays[selectedDisplay];
}
