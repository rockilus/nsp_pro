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
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  ScheduleT,
  SelectedCellT,
  DailyShiftDemandT,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

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
  schedule,
  dates,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
  handleCreateDSD,
  handleUpdateDSD,
  handleDeleteDSD,
}: {
  lng: string;
  teamId: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  dailyShiftDemands: DailyShiftDemandT[];
  schedule: ScheduleT;
  dates: dayjs.Dayjs[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
  handleDeleteDSD: (dsdId: string, teamId: string) => void;
}) {
  const workerIdsInAssignments = new Set(assignments.map((a) => a.workerId));

  const filteredWorkers = workers.filter((w) =>
    workerIdsInAssignments.has(w.id)
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
          <DatesHeaderRow dates={dates} />
          <DailyShiftDemandRow
            lng={lng}
            selectedDisplay={selectedDisplay}
            teamId={teamId}
            shifts={shifts}
            assignments={assignments}
            dailyShiftDemands={dailyShiftDemands}
            schedule={schedule}
            dates={dates}
            handleCreateDSD={handleCreateDSD}
            handleUpdateDSD={handleUpdateDSD}
            handleDeleteDSD={handleDeleteDSD}
          />
        </TableHead>
        <TableBody>
          {filteredWorkers.map((worker, workerIndex) => (
            <WorkerTableRow
              key={workerIndex}
              lng={lng}
              shifts={shifts}
              worker={worker}
              requests={requests}
              assignments={assignments}
              schedule={schedule}
              periodDates={dates}
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
