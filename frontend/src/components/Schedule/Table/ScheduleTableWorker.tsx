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

// Types
import { TeamT } from "../../../containers/types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
import { AssignmentT, ScheduleT } from "../types";
import { Box } from "@mui/material";

interface Props {
  team: TeamT;
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedules: ScheduleT[];
  dates: dayjs.Dayjs[];
}

export default function ScheduleTableWorker({
  team,
  shifts,
  workers,
  assignments,
  schedules,
  dates,
}: Props) {
  console.log("dates", dates);
  console.log("assignments", assignments);

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
                const assignment = assignments.find(
                  (a) => a.workerId === worker.id && a.date.isSame(date, "date")
                );

                return (
                  <TableCell key={dateIndex} align="center">
                    {assignment &&
                      shifts.find((s) => s.id === assignment.shiftId)?.name}
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
