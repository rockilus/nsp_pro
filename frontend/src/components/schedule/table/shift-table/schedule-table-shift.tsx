import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
// Components
import DatesHeaderRow from "../shared/dates-header-row";
import DailyShiftDemandRow from "../shared/daily-shift-demand-row";
import ShiftTableRow from "./shift-table-row";
import { getAssignmentsDataByOwnerAndDate } from "../shared/assignment-utils";
import { getRelevantShifts } from "./shift-table-utils";
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  AssignmentDataDictT,
  DailyShiftDemandT,
  ExportOptionsT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ScheduleTableShift({
  lng,
  teamId,
  shifts,
  workers,
  requests,
  assignments,
  dailyShiftDemands,
  scheduleCampaign,
  periodDates,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleExportSchedule,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: AssignmentDataDictT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  const shiftsForHeader = getRelevantShifts(
    shifts,
    dailyShiftDemands,
    assignments
  );
  const shiftIdDateToAssignData = getAssignmentsDataByOwnerAndDate(
    AttributeOwnerType.SHIFT,
    assignments,
    workers,
    shifts,
    breaches,
    requests
  );

  return (
    <TableContainer
      component={Paper}
      style={{ width: "100%", height: "calc(100vh - 104px)" }}
    >
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "white",
          }}
        >
          <DatesHeaderRow
            lng={lng}
            periodDates={periodDates}
            scheduleCampaign={scheduleCampaign}
            handleExportSchedule={handleExportSchedule}
          />
          <DailyShiftDemandRow
            lng={lng}
            selectedDisplay={selectedDisplay}
            teamId={teamId}
            shifts={shifts}
            assignments={assignments}
            dailyShiftDemands={dailyShiftDemands}
            scheduleCampaign={scheduleCampaign}
            periodDates={periodDates}
            handleCreateDSD={handleCreateDSD}
            handleUpdateDSD={handleUpdateDSD}
          />
        </TableHead>
        <TableBody>
          {shiftsForHeader.map((shift, shiftIndex) => (
            <ShiftTableRow
              key={shiftIndex}
              shift={shift}
              assignments={assignments}
              dailyShiftDemands={dailyShiftDemands}
              periodDates={periodDates}
              scheduleCampaign={scheduleCampaign}
              shiftIdDateToAssignData={shiftIdDateToAssignData}
              showBreaches={showBreaches}
              handleCellSelection={handleCellSelection}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
