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
import WorkerTableRow from "./worker-table-row";
import { buildAssignmentsDataByOwnerAndDate } from "../shared/assignment-utils";
import { getRelevantWorkers } from "./worker-table-utils";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  ScheduleT,
  ExportOptionsT,
  ScheduleStatus,
  periodDateT,
} from "../../../../types/schedule";
import { BreachT } from "@/types/breach";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
import { CreateAssignmentT } from "@/types/assignment";
import { AssignmentDataDictT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { RequestT } from "../../../../types/request";
import { AttributeOwnerType } from "../../../../types/attribute";
import { RecurrenceRuleT } from "@/types/recurrence";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ScheduleTableWorker({
  lng,
  teamId,
  shifts,
  workers,
  requests,
  assignments,
  dailyShiftDemands,
  recurrences,
  scheduleCampaign,
  periodDates,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleExportSchedule,
  handleOpenCreateAssignment,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  recurrences: RecurrenceRuleT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: periodDateT[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: AssignmentDataDictT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleExportSchedule: (exportOptions: ExportOptionsT) => void;
  handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
}) {
  const workersForHeader = getRelevantWorkers(
    workers,
    assignments,
    scheduleCampaign
  );

  const workerIdDateToAssignData = buildAssignmentsDataByOwnerAndDate(
    AttributeOwnerType.WORKER,
    assignments,
    recurrences,
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
          {workersForHeader.map((worker, workerIndex) => (
            <WorkerTableRow
              key={workerIndex}
              lng={lng}
              shifts={shifts}
              worker={worker}
              assignments={assignments}
              workerIdDateToAssignData={workerIdDateToAssignData}
              scheduleCampaign={scheduleCampaign}
              periodDates={periodDates}
              showBreaches={showBreaches}
              handleCellSelection={handleCellSelection}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
