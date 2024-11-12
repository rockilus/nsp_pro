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
// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  SelectedCellT,
  DailyShiftDemandT,
  ExportOptionsT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

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
  handleDeleteDSD,
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
  handleCellSelection: (selectedCell: SelectedCellT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
}) {
  // Sorts an array of shifts with the following order:
  // 1. Duty shifts (`ShiftType.DUTY`), ordered by start time.
  // 2. All other shifts, ordered by start time.
  const sortShifts = (shifts: ShiftT[]): ShiftT[] => {
    return [...shifts].sort((a, b) => {
      // Check if 'a' or 'b' is a Duty shift
      const isA_Duty = a.shiftType === ShiftType.DUTY;
      const isB_Duty = b.shiftType === ShiftType.DUTY;

      if (isA_Duty && !isB_Duty) {
        return -1; // 'a' comes before 'b'
      }
      if (!isA_Duty && isB_Duty) {
        return 1; // 'b' comes before 'a'
      }

      // If both are Duty shifts or both are not, sort by startTime
      if (a.startTime.isBefore(b.startTime)) {
        return -1;
      }
      if (a.startTime.isAfter(b.startTime)) {
        return 1;
      }

      return 0; // They are equal in terms of shiftType and startTime
    });
  };

  const shiftIdsInAssignments = new Set(assignments.map((a) => a.shiftId));
  const filteredOrderedShifts = sortShifts(
    shifts.filter((s) => shiftIdsInAssignments.has(s.id))
  );

  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
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
            handleDeleteDSD={handleDeleteDSD}
          />
        </TableHead>
        <TableBody>
          {filteredOrderedShifts
            .filter(
              (s) =>
                s.shiftType === ShiftType.NORMAL ||
                s.shiftType === ShiftType.DUTY
            )
            .map((shift, shiftIndex) => (
              <ShiftTableRow
                key={shiftIndex}
                shift={shift}
                workers={workers}
                requests={requests}
                assignments={assignments}
                dailyShiftDemands={dailyShiftDemands}
                periodDates={periodDates}
                scheduleCampaign={scheduleCampaign}
                breaches={breaches}
                showBreaches={showBreaches}
                handleCellSelection={handleCellSelection}
              />
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
