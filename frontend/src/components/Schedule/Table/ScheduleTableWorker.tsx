import dayjs from "dayjs";
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
import {
  getBreachType,
  getCellBackgroundColor,
} from "../../../utils/scheduleUtils";
// Types
import { Box } from "@mui/material";
import { TeamT } from "../../../containers/types";
import { ShiftT } from "../../Shift/types";
import { WorkerT } from "../../Worker/types";
import { AssignmentT, ObjectiveBreachT, ScheduleT } from "../types";

interface Props {
  team: TeamT;
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  dates: dayjs.Dayjs[];
  breaches: ObjectiveBreachT[];
  showBreaches: boolean;
}

export default function ScheduleTableWorker({
  team,
  shifts,
  workers,
  assignments,
  schedule,
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
                      backgroundColor: getCellBackgroundColor(date, schedule),
                    }}
                  >
                    {date.format("MMM")}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      textAlign: "center",
                      backgroundColor: getCellBackgroundColor(date, schedule),
                    }}
                  >
                    {date.format("ddd")}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      backgroundColor: getCellBackgroundColor(date, schedule),
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
                  <TableCell
                    key={dateIndex}
                    sx={{
                      align: "center",
                      backgroundColor: getCellBackgroundColor(date, schedule),
                    }}
                  >
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
