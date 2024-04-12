import dayjs from "dayjs";
import React from "react";
// MUI
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { red } from "@mui/material/colors";
// Utils
import { getBreachType } from "../../../utils/scheduleUtils";
// Types
import { TeamT } from "../../../containers/types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
import { AssignmentT, ScheduleT, ObjectiveBreachT } from "../types";
import { Box } from "@mui/material";

interface Props {
  team: TeamT;
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedules: ScheduleT[];
  dates: dayjs.Dayjs[];
  breaches: ObjectiveBreachT[];
  showBreaches: boolean;
}

export default function ScheduleTableWorker({
  team,
  shifts,
  workers,
  assignments,
  schedules,
  dates,
  breaches,
  showBreaches,
}: Props) {
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
            {dates.map((date, dateIndex) => (
              <TableCell key={dateIndex} sx={{ padding: 0 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "grey.500",
                      textAlign: "center",
                    }}
                  >
                    {date.format("MMM")}
                  </Typography>
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
          {workers.map((worker, workerIndex) => (
            <TableRow key={workerIndex}>
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
                  {worker.name}
                </Box>
              </TableCell>
              {dates.map((date, dateIndex) => {
                const targetAs = assignments.filter(
                  (a) => a.workerId === worker.id && a.date.isSame(date, "date")
                );

                return (
                  <TableCell key={dateIndex} sx={{ align: "center" }}>
                    {targetAs.map((a, aIndex) => {
                      const shift = shifts.find((s) => s.id === a.shiftId);
                      const targetBs = breaches.filter((b) =>
                        b.variables.find(
                          (v) =>
                            v.workerId === a.workerId &&
                            v.date.isSame(a.date, "date")
                        )
                      );
                      const backColor = getBreachType(targetBs);
                      return (
                        <Box
                          key={aIndex}
                          sx={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: showBreaches
                              ? backColor === "hardBreach"
                                ? red[200]
                                : backColor === "softBreach"
                                ? red[100]
                                : "none"
                              : "none",
                          }}
                        >
                          {a && shift && shift.name}
                        </Box>
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
