import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "react-i18next";
// MUI
import AdjustIcon from "@mui/icons-material/Adjust";
import AddIcon from "@mui/icons-material/Add";
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
// Stores
import { useScheduleStore } from "../../stores/scheduleStore";
// Types
import { Box } from "@mui/material";
import { ShiftT } from "../Shift/types";
import { WorkerT } from "../Worker/types";
import { AssignmentT, ScheduleT, QuickStaffingT } from "./types";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface Props {
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
}

export default function QuickStaffingTable({
  shifts,
  workers,
  assignments,
  schedule,
}: Props) {
  const { t } = useTranslation();

  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

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
    return assignments.filter(
      (a) =>
        (!workerId || a.workerId === workerId) &&
        (!shiftId || a.shiftId === shiftId) &&
        a.date.isSameOrAfter(startDate) &&
        a.date.isSameOrBefore(endDate) &&
        !shifts.find((s) => s.id === a.shiftId)?.isTimeOff
    ).length;
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
    updateSchedule({
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
    updateSchedule({
      ...schedule,
      quickStaffings: newQuickStaffings,
    });
  };

  const handleDeleteQuickStaffing = (workerId: string, shiftId: string) => {
    const newQuickStaffings = schedule.quickStaffings.filter(
      (qs) => qs.workerId !== workerId || qs.shiftId !== shiftId
    );
    updateSchedule({
      ...schedule,
      quickStaffings: newQuickStaffings,
    });
  };

  return (
    <Box
      sx={{
        border: "1px solid grey",
        width: "400px",
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell
                colSpan={shifts.filter((s) => !s.isTimeOff).length + 2}
                sx={{ paddingY: 0 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 45,
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {t("schedule.quick_staffing")}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
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
              {shifts
                .filter((s) => !s.isTimeOff)
                .map((shift, shiftIndex) => (
                  <TableCell key={shiftIndex} sx={{ padding: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {shift.name}
                    </Typography>
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
                  {t("common.total")}
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
                  <Box
                    sx={{
                      width: "100px",
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
                  </Box>
                </TableCell>
                {shifts
                  .filter((s) => !s.isTimeOff)
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
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
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
                          </Box>
                          {quickStaffing ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                // alignContent: "center",
                                // justifyContent: "center",
                              }}
                            >
                              <Box
                                sx={{
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
                              </Box>
                              <Box
                                sx={{
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
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{
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
                            </Box>
                          )}
                        </Box>
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
                <Box
                  sx={{
                    width: "100px",
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
                    {t("common.total")}
                  </Typography>
                </Box>
              </TableCell>
              {shifts
                .filter((s) => !s.isTimeOff)
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
    </Box>
  );
}
