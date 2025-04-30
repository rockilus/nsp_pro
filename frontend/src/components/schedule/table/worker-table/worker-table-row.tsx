import React from "react";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import WorkerRowHeaderCell from "./worker-row-header-cell";
import WorkerCell from "./worker-cell";
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  periodDateT,
  ScheduleViewSettingsT,
  ScheduleCellsDictT,
} from "../../../../types/schedule";
import {
  AssignmentT,
  AssignmentDataDictT,
  CreateAssignmentT,
} from "@/types/assignment";

export default function WorkerTableRow({
  lng,
  shifts,
  worker,
  assignments,
  scheduleCampaign,
  periodDates,
  scheduleCellsDict,
  scheduleViewSettings,
  handleAssignmentSelection,
  handleOpenCreateAssignment,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  scheduleCellsDict: ScheduleCellsDictT;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (selectedCell: AssignmentDataDictT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  return (
    <TableRow>
      <WorkerRowHeaderCell
        lng={lng}
        shifts={shifts}
        worker={worker}
        assignments={assignments}
        scheduleCampaign={scheduleCampaign}
      />
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(
          worker.id,
          pDate.date
        );
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] || null;
        return (
          <WorkerCell
            key={dateIndex}
            periodDate={pDate}
            worker={worker}
            scheduleCellData={scheduleCellData}
            scheduleViewSettings={scheduleViewSettings}
            handleAssignmentSelection={handleAssignmentSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
          />
        );
      })}
    </TableRow>
  );
}
