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
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { AssignmentT, CreateAssignmentT } from "@/types/assignment";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RequestT } from "../../../types/request";
import { RecurrenceRuleT } from "@/types/recurrence";
import { TeamWithMembership } from "@/types/team";

dayjs.extend(utc);

export default function ScheduleDisplay({
  lng,
  teamWithMembership,
  scheduleCampaign,
  periodDates,
  assignments,
  shiftDemands,
  recurrences,
  breaches,
  workers,
  shifts,
  requests,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleDemandSelection,
  handleRequestSelection,
  handleExportSchedule,
  handleOpenCreateAssignment,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  assignments: AssignmentT[];
  shiftDemands: ShiftDemandDTO[];
  recurrences: RecurrenceRuleT[];
  breaches: BreachT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedAssignment: AssignmentDataT) => void;
  handleDemandSelection: (scheduleCellData: ScheduleCellDataT) => void;
  handleRequestSelection?: (request: RequestT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const scheduleDisplays: { [key: string]: JSX.Element } = {
    shift: (
      <ScheduleTableShift
        lng={lng}
        teamWithMembership={teamWithMembership}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        shiftDemands={shiftDemands}
        recurrences={recurrences}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        handleAssignmentSelection={handleAssignmentSelection}
        handleDemandSelection={handleDemandSelection}
        handleExportSchedule={handleExportSchedule}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
      />
    ),
    worker: (
      <ScheduleTableWorker
        lng={lng}
        teamWithMembership={teamWithMembership}
        shifts={shifts}
        workers={workers}
        requests={requests}
        assignments={assignments}
        shiftDemands={shiftDemands}
        recurrences={recurrences}
        scheduleCampaign={scheduleCampaign}
        periodDates={periodDates}
        breaches={breaches}
        scheduleViewSettings={scheduleViewSettings}
        handleAssignmentSelection={handleAssignmentSelection}
        handleRequestSelection={handleRequestSelection}
        handleExportSchedule={handleExportSchedule}
        handleOpenCreateAssignment={handleOpenCreateAssignment}
      />
    ),
  };

  return scheduleDisplays[scheduleViewSettings.groupBy];
}
