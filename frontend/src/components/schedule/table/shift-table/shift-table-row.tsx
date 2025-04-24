import React from "react";
import dayjs from "dayjs";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import ShiftRowHeaderCell from "./shift-row-header-cell";
import ShiftCell from "./shift-cell";
import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import {
  ScheduleT,
  periodDateT,
  AssignmentsDictT,
  AssignmentDataT,
  ScheduleCellsDictT,
} from "../../../../types/schedule";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";

export default function ShiftTableRow({
  shift,
  assignments,
  dailyShiftDemands,
  periodDates,
  scheduleCampaign,
  shiftIdDateToAssignData,
  scheduleCellsDict,
  showBreaches,
  handleCellSelection,
  handleOpenCreateAssignment,
}: {
  shift: ShiftT;
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  periodDates: periodDateT[];
  scheduleCampaign: ScheduleT | null;
  shiftIdDateToAssignData: AssignmentsDictT;
  scheduleCellsDict: ScheduleCellsDictT;
  showBreaches: boolean;
  handleCellSelection: (selectedCell: AssignmentDataT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  return (
    <TableRow>
      <ShiftRowHeaderCell
        shift={shift}
        assignments={assignments}
        dailyShiftDemands={dailyShiftDemands}
        scheduleCampaign={scheduleCampaign}
      />
      {periodDates.map((pDate, dateIndex) => {
        const scheduleCellDataKey = generateOwnerIdDateKey(
          shift.id,
          pDate.date
        );
        const scheduleCellData = scheduleCellsDict[scheduleCellDataKey] || null;
        return (
          <ShiftCell
            key={dateIndex}
            periodDate={pDate}
            scheduleCampaign={scheduleCampaign}
            shift={shift}
            shiftIdDateToAssignData={shiftIdDateToAssignData}
            scheduleCellData={scheduleCellData}
            showBreaches={showBreaches}
            handleCellSelection={handleCellSelection}
            handleOpenCreateAssignment={handleOpenCreateAssignment}
          />
        );
      })}
    </TableRow>
  );
}
