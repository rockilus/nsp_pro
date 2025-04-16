import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FormControl from "@mui/material/FormControl";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockOutlineIcon from "@mui/icons-material/LockOutlined";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Typography from "@mui/material/Typography";
// Components
import EditAssignment from "./edit-assignment";
import LHSHEader from "./lhs-header";
// Styles
import "./assignment-options.css";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { ScheduleT, ScheduleStatus } from "../../../types/schedule";
import { ObjectiveCategory } from "@/types/breach";
import { AssignmentDataDictT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { RequestStatus } from "../../../types/request";

export default function AssignmentOptions({
  lng,
  workers,
  shifts,
  schedules,
  selectedCell,
  onClose,
  handleUpdateAssignment,
  handleDeleteAssignment,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  selectedCell: AssignmentDataDictT | null;
  onClose: () => void;
  handleUpdateAssignment: (assignment: AssignmentT) => void;
  handleDeleteAssignment: (assignmentId: string) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentT | null>(selectedCell?.assignment || null);
  const [selectedAssignSchedule, setSelectedAssignSchedule] =
    useState<ScheduleT | null>(null);

  const handleChangeAssignmentFixed = () => {
    if (!selectedAssignment) return;
    handleUpdateAssignment({
      ...selectedAssignment,
      fixed: !selectedAssignment.fixed,
    });
  };

  const breachesNoRequests =
    selectedCell?.breaches.filter(
      (b) => b.objectiveCategory !== ObjectiveCategory.REQUEST
    ) || [];

  useEffect(() => {
    setSelectedAssignment(selectedCell?.assignment || null);
    setSelectedAssignSchedule(
      selectedCell
        ? schedules.find((s) => s.id === selectedCell.assignment.scheduleId) ||
            null
        : null
    );
  }, [selectedCell, schedules]);

  return (
    <div className="assignment-options-container">
      <LHSHEader lhsHeaderTitle={t("selection")} onClose={onClose} />
      <div className="assignment-options-assignment-container">
        <div className="assignment-options-assignment-title-container">
          {selectedAssignment && (
            <>
              <span className="assignment-options-assignment-title">
                {t("assignment")}
              </span>
              <Chip
                icon={
                  selectedAssignment.fixed ? (
                    <LockOutlineIcon sx={{ fontSize: "0.8rem" }} />
                  ) : (
                    <LockOpenIcon sx={{ fontSize: "0.8rem" }} />
                  )
                }
                label={selectedAssignment.fixed ? t("locked") : t("unlocked")}
                variant="outlined"
                size="small"
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  width: "110px",
                  paddingLeft: "4px",
                  "& .MuiChip-icon": {
                    color: selectedAssignment.fixed ? "#d32f2f" : "#616161",
                  },
                  "& .MuiChip-label": {
                    color: selectedAssignment.fixed ? "#d32f2f" : "#616161",
                  },
                  "&:hover": {
                    backgroundColor: selectedAssignment.fixed
                      ? "#ef5350"
                      : "#f0f0f0",
                  },
                  "&.MuiChip-outlined": {
                    borderColor: selectedAssignment.fixed
                      ? "#d32f2f"
                      : "#e5e7eb",
                  },
                }}
                onClick={handleChangeAssignmentFixed}
              />
            </>
          )}
        </div>
        {selectedCell?.assignment ? (
          <EditAssignment
            lng={lng}
            teamId={selectedCell.assignment.teamId}
            scheduleId={selectedCell.assignment.scheduleId}
            workerSelectedId={selectedCell.assignment.workerId}
            shiftSelectedId={selectedCell.assignment.shiftId}
            workers={workers}
            shifts={shifts}
            dateSelected={selectedCell.assignment.date}
            assignment={selectedCell.assignment}
            isEditing={true}
            handleUpdateAssignment={handleUpdateAssignment}
            handleDeleteAssignment={handleDeleteAssignment}
          />
        ) : (
          <span className="assignment-options-no-assignment-selected-msg">
            {t("no_assignment_selected_msg")}
          </span>
        )}
      </div>
      {selectedAssignment &&
        selectedCell &&
        selectedAssignment.date.isAfter(dayjs.utc(dayjs().startOf("day"))) && (
          <div style={{ marginTop: "10px" }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#3C4043",
              }}
            >
              {t("requests")}
            </span>
            {selectedCell.requests.length === 0 ? (
              <Typography
                align="left"
                sx={{
                  fontSize: "0.8rem",
                  color: "grey.700",
                  fontStyle: "italic",
                }}
              >
                {t("no_requests")}
              </Typography>
            ) : (
              selectedCell.requests.map((request, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                  }}
                >
                  <Typography align="left" sx={{ fontSize: "0.8rem" }}>
                    {`${
                      workers.find((w) => w.id === request.workerId)?.name || ""
                    } - 
  ${shifts.find((s) => s.id === request.shiftId)?.name || ""} - 
  ${
    request.startDate?.isSame(request?.endDate)
      ? request.startDate.format("D MMM YYYY")
      : `${request.startDate.format("D MMM YYYY")} - ${request.endDate.format(
          "D MMM YYYY"
        )}`
  }`}
                  </Typography>
                  <FiberManualRecordIcon
                    sx={{
                      fontSize: "1.1rem",
                      marginLeft: "10px",
                      color:
                        request.status === RequestStatus.APPROVED
                          ? "green"
                          : request.status === RequestStatus.REJECTED
                          ? "red"
                          : request.status === RequestStatus.PENDING
                          ? "grey"
                          : "none",
                    }}
                  />
                </Box>
              ))
            )}
          </div>
        )}
      {selectedAssignSchedule?.status === ScheduleStatus.CAMPAIGN && (
        <div style={{ marginTop: "10px" }}>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#3C4043",
            }}
          >
            {t("breaches")}
          </span>
          {breachesNoRequests.length === 0 ? (
            <Typography
              align="left"
              sx={{
                fontSize: "0.8rem",
                color: "grey.700",
                fontStyle: "italic",
              }}
            >
              {t("no_breach")}
            </Typography>
          ) : (
            breachesNoRequests.map((breach, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                }}
              >
                <Typography align="left" sx={{ fontSize: "0.8rem" }}>
                  {breach.description}
                </Typography>
                <FiberManualRecordIcon
                  sx={{
                    fontSize: "1.1rem",
                    marginLeft: "10px",
                    color: breach.hardToSoft ? "red" : "orange",
                  }}
                />
              </Box>
            ))
          )}
        </div>
      )}
    </div>
  );
}
