import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import AddIcon from "@mui/icons-material/Add";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import RemoveIcon from "@mui/icons-material/Remove";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import LHSHEader from "./lhs-header";
// Styles
import "./quick-staffing.css";
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
  onClose,
  handleUpdateSchedule,
}: {
  lng: string;
  shifts: ShiftT[];
  workers: WorkerT[];
  assignments: AssignmentT[];
  schedule: ScheduleT;
  onClose: () => void;
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
    <div className="quick-staffing-container">
      <LHSHEader lhsHeaderTitle={t("quick_staffing")} onClose={onClose} />
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  position: "sticky",
                  left: 0,
                  padding: 0,
                  background: "#FCFCFC",
                }}
              >
                <div className="qs-row-header-container"></div>
              </TableCell>
              {shifts
                .filter(
                  (s) =>
                    s.shiftType === ShiftType.NORMAL ||
                    s.shiftType === ShiftType.DUTY
                )
                .map((shift, shiftIndex) => (
                  <TableCell key={shiftIndex} sx={{ padding: 0 }}>
                    <div className="qs-column-header-container">
                      <span className="qs-column-header-text">
                        {shift.acronym}
                      </span>
                    </div>
                  </TableCell>
                ))}
              <TableCell sx={{ padding: 0, background: "#FCFCFC" }}>
                <div className="qs-column-header-container">
                  <span className="qs-column-header-text">{t("total")}</span>
                </div>
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
                  <div className="qs-row-header-container">
                    <span className="qs-row-header-text">{worker.acronym}</span>
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
                        <div className="qs-cell-container">
                          <div className="qs-cell-staffing-container">
                            <span
                              className={`qs-cell-staffing-text ${
                                quickStaffing
                                  ? quickStaffing.target === staffing
                                    ? "qs-staffing-at-target"
                                    : "qs-staffing-diff-target"
                                  : ""
                              }`}
                              onClick={() => {
                                if (quickStaffing) {
                                  handleDeleteQuickStaffing(
                                    worker.id,
                                    shift.id
                                  );
                                } else {
                                  handleCreateQuickStaffing(
                                    worker.id,
                                    shift.id,
                                    staffing
                                  );
                                }
                              }}
                            >
                              {staffing}
                            </span>
                          </div>
                          {quickStaffing && (
                            <div className="qs-set-target-container">
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
                              <span className="qs-target-text">
                                {quickStaffing.target}
                              </span>
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
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                <TableCell sx={{ background: "#FCFCFC", padding: 0 }}>
                  <div className="qs-cell-container">
                    <div className="qs-cell-staffing-container">
                      <span className="qs-cell-staffing-text">
                        {countAssignments({
                          startDate: schedule.startDate,
                          endDate: schedule.endDate,
                          workerId: worker.id,
                        })}
                      </span>
                    </div>
                  </div>
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
                <div className="qs-row-header-container">
                  <span className="qs-row-header-text">{t("total")}</span>
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
                      <div className="qs-cell-container">
                        <div className="qs-cell-staffing-container">
                          <span className="qs-cell-staffing-text">
                            {staffing}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  );
                })}
              <TableCell sx={{ background: "#FCFCFC", padding: 0 }}>
                <div className="qs-cell-container">
                  <div className="qs-cell-staffing-container">
                    <span className="qs-cell-staffing-text">
                      {countAssignments({
                        startDate: schedule.startDate,
                        endDate: schedule.endDate,
                      })}
                    </span>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
