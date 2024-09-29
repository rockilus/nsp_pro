import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import AdjustIcon from "@mui/icons-material/Adjust";
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import ClearIcon from "@mui/icons-material/Clear";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import RemoveIcon from "@mui/icons-material/Remove";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Types
import { ShiftT, ShiftType } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  AssignmentT,
  ScheduleT,
  QuickStaffingT,
} from "../../../types/schedule";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function QuickStaffingTable({
  lng,
  shifts,
  workers,
  assignments,
  schedule,
  handleUpdateSchedule,
}: {
  lng: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const countAssignments = ({
    startDate,
    endDate,
    workerId,
    shiftId,
  }: {
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    workerId?: string;
    shiftId?: string;
  }) => {
    return assignments.filter((a) => {
      const shift = shifts.find((s) => s.id === a.shiftId);
      return (
        (!workerId || a.workerId === workerId) &&
        (!shiftId || a.shiftId === shiftId) &&
        a.date.isSameOrAfter(startDate) &&
        a.date.isSameOrBefore(endDate) &&
        (shift?.shiftType === ShiftType.NORMAL ||
          shift?.shiftType === ShiftType.DUTY)
      );
    }).length;
  };

  const handleCreateQuickStaffing = (
    workerId: string,
    shiftId: string,
    target: number
  ) => {
    const existingQuickStaffing = schedule.quickStaffings.find(
      (qs) => qs.workerId === workerId && qs.shiftId === shiftId
    );
    if (existingQuickStaffing) {
      return;
    }
    const newQuickStaffing: QuickStaffingT = {
      workerId,
      shiftId,
      target,
    };
    handleUpdateSchedule({
      ...schedule,
      quickStaffings: [...schedule.quickStaffings, newQuickStaffing],
    });
  };

  const handleUpdateQuickStaffing = (
    workerId: string,
    shiftId: string,
    target: number
  ) => {
    if (target < 0) {
      return;
    }
    const newQuickStaffings = schedule.quickStaffings.map((qs) =>
      qs.workerId === workerId && qs.shiftId === shiftId
        ? { ...qs, target }
        : qs
    );
    handleUpdateSchedule({
      ...schedule,
      quickStaffings: newQuickStaffings,
    });
  };

  const handleDeleteQuickStaffing = (workerId: string, shiftId: string) => {
    const newQuickStaffings = schedule.quickStaffings.filter(
      (qs) => qs.workerId !== workerId || qs.shiftId !== shiftId
    );
    handleUpdateSchedule({
      ...schedule,
      quickStaffings: newQuickStaffings,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        margin: "10px 10px 5px 5px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("quick_staffing")}
      </span>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: "50px",
                    padding: "10px",
                  }}
                ></div>
              </TableCell>
              {shifts
                .filter(
                  (s) =>
                    s.shiftType === ShiftType.NORMAL ||
                    s.shiftType === ShiftType.DUTY
                )
                .map((shift, shiftIndex) => (
                  <TableCell key={shiftIndex} sx={{ padding: 0 }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          textAlign: "center",
                          fontWeight: "bold",
                          writingMode: "vertical-rl",
                        }}
                      >
                        {shift.name}
                      </Typography>
                    </div>
                  </TableCell>
                ))}
              <TableCell>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {t("total")}
                </Typography>
              </TableCell>
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
                  <div
                    style={{
                      width: "50px",
                      padding: "10px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      {worker.name}
                    </Typography>
                  </div>
                </TableCell>
                {shifts
                  .filter(
                    (s) =>
                      s.shiftType === ShiftType.NORMAL ||
                      s.shiftType === ShiftType.DUTY
                  )
                  .map((shift, shiftIndex) => {
                    const staffing = countAssignments({
                      startDate: schedule.startDate,
                      endDate: schedule.endDate,
                      workerId: worker.id,
                      shiftId: shift.id,
                    });
                    const quickStaffing = schedule.quickStaffings.find(
                      (qs) =>
                        qs.workerId === worker.id && qs.shiftId === shift.id
                    );
                    return (
                      <TableCell
                        key={shiftIndex}
                        sx={{
                          //   align: "center",
                          padding: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              width: "50px",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: quickStaffing
                                  ? quickStaffing.target === staffing
                                    ? "green"
                                    : "red"
                                  : "black",
                                textAlign: "center",
                                width: "20px",
                                height: "15px",
                                fontWeight: "bold",
                              }}
                            >
                              {staffing}
                            </Typography>
                          </div>
                          {quickStaffing ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                // alignContent: "center",
                                // justifyContent: "center",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                  //   alignContent: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleUpdateQuickStaffing(
                                      worker.id,
                                      shift.id,
                                      quickStaffing.target - 1
                                    )
                                  }
                                  sx={{
                                    width: "15px",
                                    height: "15px",
                                    padding: 0,
                                  }}
                                >
                                  <RemoveIcon sx={{ height: "10px" }} />
                                </IconButton>
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: "grey.500",
                                    textAlign: "center",
                                    width: "20px",
                                    height: "15px",
                                  }}
                                >
                                  {quickStaffing.target}
                                </Typography>

                                <IconButton
                                  onClick={() =>
                                    handleUpdateQuickStaffing(
                                      worker.id,
                                      shift.id,
                                      quickStaffing.target + 1
                                    )
                                  }
                                  sx={{
                                    width: "15px",
                                    height: "15px",
                                    padding: 0,
                                  }}
                                >
                                  <AddIcon sx={{ height: "10px" }} />
                                </IconButton>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                }}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleDeleteQuickStaffing(
                                      worker.id,
                                      shift.id
                                    )
                                  }
                                  sx={{
                                    width: "15px",
                                    height: "15px",
                                    padding: 0,
                                  }}
                                >
                                  <ClearIcon sx={{ height: "10px" }} />
                                </IconButton>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <IconButton
                                onClick={() =>
                                  handleCreateQuickStaffing(
                                    worker.id,
                                    shift.id,
                                    staffing
                                  )
                                }
                                sx={{
                                  width: "15px",
                                  height: "15px",
                                  padding: 0,
                                }}
                              >
                                <AdjustIcon sx={{ height: "10px" }} />
                              </IconButton>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                <TableCell sx={{ background: "#FCFCFC" }}>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {countAssignments({
                      startDate: schedule.startDate,
                      endDate: schedule.endDate,
                      workerId: worker.id,
                    })}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  backgroundColor: "#FCFCFC",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: "50px",
                    padding: "10px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    {t("total")}
                  </Typography>
                </div>
              </TableCell>
              {shifts
                .filter(
                  (s) =>
                    s.shiftType === ShiftType.NORMAL ||
                    s.shiftType === ShiftType.DUTY
                )
                .map((shift, shiftIndex) => {
                  const staffing = countAssignments({
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                    shiftId: shift.id,
                  });
                  return (
                    <TableCell
                      key={shiftIndex}
                      sx={{
                        //   align: "center",
                        padding: 0,
                        background: "#FCFCFC",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {staffing}
                      </Typography>
                    </TableCell>
                  );
                })}
              <TableCell sx={{ background: "#FCFCFC" }}>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {countAssignments({
                    startDate: schedule.startDate,
                    endDate: schedule.endDate,
                  })}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
