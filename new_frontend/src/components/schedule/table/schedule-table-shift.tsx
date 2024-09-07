import React from "react";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Components
import ScheduleTableCellContent from "./schedule-table-cell-content";
// Utils
import { getCellBackgroundColor } from "../../data-display/schedule-utils";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  BreachT,
  SelectedCellT,
} from "../../../types/schedule";
import { RequestT } from "../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function ScheduleTableShift({
  shifts,
  workers,
  requests,
  assignments,
  schedule,
  dates,
  breaches,
  showBreaches,
  selectedDisplay,
  handleCellSelection,
}: {
  shifts: ShiftT[];
  workers: WorkerT[];
  requests: RequestT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  dates: dayjs.Dayjs[];
  breaches: BreachT[];
  showBreaches: boolean;
  selectedDisplay: string;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
}) {
  return (
    <TableContainer component={Paper} style={{ width: "100%" }}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                position: "sticky",
                left: 0,
                backgroundColor: "#FFFFFF",
                padding: 0,
              }}
            >
              <Box
                sx={{
                  width: "100px",
                  padding: "10px",
                }}
              ></Box>
            </TableCell>
            <TableCell
              sx={{
                position: "sticky",
                left: "100px",
                backgroundColor: "#FFFFFF",
              }}
            ></TableCell>
            {dates.map((date, dateIndex) => (
              <TableCell
                key={dateIndex}
                sx={{
                  padding: 0,
                  backgroundColor: getCellBackgroundColor(date, schedule),
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "0.8rem", textAlign: "center" }}>
                    {date.format("ddd")}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {date.format("DD")}
                  </Typography>
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {shifts
            .filter((s) => !s.isTimeOff)
            .map((shift, shiftIndex) => (
              <TableRow key={shiftIndex}>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#FFFFFF",
                    padding: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: "100px",
                      padding: "10px",
                    }}
                  >
                    {shift.name}
                  </Box>
                </TableCell>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: "100px",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {shift.startTime.format("HH:mm")}
                  <br />
                  {shift.endTime.format("HH:mm")}
                  {!shift.endTime.isSame(shift.startTime, "day") && (
                    <sup>+1</sup>
                  )}
                </TableCell>
                {dates.map((date, dateIndex) => {
                  const targetAs = assignments.filter(
                    (a) => a.shiftId === shift.id && a.date.isSame(date, "date")
                  );

                  return (
                    <TableCell
                      key={dateIndex}
                      sx={{
                        align: "center",
                        backgroundColor: getCellBackgroundColor(date, schedule),
                      }}
                    >
                      {targetAs.map((a, aIndex) => {
                        const worker =
                          workers.find((w) => w.id === a.workerId) || null;
                        const targetBs = breaches.filter((b) =>
                          b.variables.find(
                            (v) =>
                              v.workerId === a.workerId &&
                              v.date.isSame(a.date, "date")
                            // v.shiftId === a.shiftId
                          )
                        );
                        const targetRequests = requests.filter(
                          (r) =>
                            r.workerId === a.workerId &&
                            r.startDate.isSameOrBefore(a.date, "date") &&
                            r.endDate.isSameOrAfter(a.date, "date")
                        );
                        return (
                          worker && (
                            <ScheduleTableCellContent
                              key={aIndex}
                              worker={worker}
                              shift={shift}
                              requests={targetRequests}
                              assignment={a}
                              schedule={schedule}
                              breaches={targetBs}
                              showBreaches={showBreaches}
                              selectedDisplay={selectedDisplay}
                              handleCellSelection={handleCellSelection}
                            />
                          )
                        );
                      })}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
