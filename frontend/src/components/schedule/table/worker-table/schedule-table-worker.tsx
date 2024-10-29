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
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <DatesHeaderRow dates={dates} />{" "}
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
              dates={dates}
              breaches={breaches}
              showBreaches={showBreaches}
              selectedDisplay={selectedDisplay}
              handleCellSelection={handleCellSelection}
            />
            // <TableRow key={workerIndex}>
            //   <TableCell
            //     sx={{
            //       position: "sticky",
            //       left: 0,
            //       backgroundColor: "#FFFFFF",
            //       padding: 0,
            //     }}
            //   >
            //     <Box
            //       sx={{
            //         width: "100px",
            //         padding: "10px",
            //       }}
            //     >
            //       {worker.name}
            //     </Box>
            //   </TableCell>
            //   {dates.map((date, dateIndex) => {
            //     const targetAs = assignments.filter(
            //       (a) => a.workerId === worker.id && a.date.isSame(date, "date")
            //     );

            //     return (
            //       <TableCell
            //         key={dateIndex}
            //         sx={{
            //           align: "center",
            //         }}
            //       >
            //         {targetAs.map((a, aIndex) => {
            //           const shift = shifts.find((s) => s.id === a.shiftId);
            //           const targetBs = breaches.filter((b) =>
            //             b.variables.find(
            //               (v) =>
            //                 v.workerId === a.workerId &&
            //                 v.date.isSame(a.date, "date")
            //             )
            //           );
            //           const targetRequests = requests.filter(
            //             (r) =>
            //               r.workerId === a.workerId &&
            //               r.startDate.isSameOrBefore(a.date, "date") &&
            //               r.endDate.isSameOrAfter(a.date, "date")
            //           );
            //           return (
            //             shift && (
            //               <ScheduleTableCellContent
            //                 key={aIndex}
            //                 worker={worker}
            //                 shift={shift}
            //                 requests={targetRequests}
            //                 assignment={a}
            //                 breaches={targetBs}
            //                 showBreaches={showBreaches}
            //                 selectedDisplay={selectedDisplay}
            //                 handleCellSelection={handleCellSelection}
            //               />
            //             )
            //           );
            //         })}
            //       </TableCell>
            //     );
            //   })}
            // </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
