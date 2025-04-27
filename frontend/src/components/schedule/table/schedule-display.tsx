import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Components
import ScheduleTableShift from "./shift-table/schedule-table-shift";
import ScheduleTableWorker from "./worker-table/schedule-table-worker";
// Types
import {
  ScheduleT,
  ExportOptionsT,
  periodDateT,
  AssignmentDataT,
  ScheduleCellDataT,
  ScheduleViewSettingsT,
} from "../../../types/schedule";
import { BreachT } from "@/types/breach";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { AssignmentT, CreateAssignmentT } from "@/types/assignment";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";
import { RecurrenceRuleT } from "@/types/recurrence";

dayjs.extend(utc);

export default function ScheduleDisplay({
  lng,
  teamId,
  scheduleCampaign,
  periodDates,
  assignments,
  dailyShiftDemands,
  recurrences,
  breaches,
  workers,
  shifts,
  requests,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleExportSchedule,
  handleOpenCreateAssignment,
}: {
  lng: string;
  teamId: string;
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  recurrences: RecurrenceRuleT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
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
        recurrences={recurrences}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        handleAssignmentSelection={handleAssignmentSelection}
        handleDemandSelection={handleDemandSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleExportSchedule={handleExportSchedule}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
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
        recurrences={recurrences}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        handleAssignmentSelection={handleAssignmentSelection}
        handleCreateDSD={handleCreateDSD}
        handleUpdateDSD={handleUpdateDSD}
        handleExportSchedule={handleExportSchedule}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
      />
    ),
  };

  return scheduleDisplays[scheduleViewSettings.groupBy];
}
