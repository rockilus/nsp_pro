import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockOutlineIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
// Components
import EditAssignment from "./edit-assignment";
// Styles
import "./assignment-selection.css";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { ScheduleT, ScheduleStatus } from "../../../types/schedule";
import { ObjectiveCategory } from "@/types/breach";
import { AssignmentDataDictT } from "@/types/assignment";
import { AssignmentT } from "@/types/assignment";
import { RequestStatus } from "../../../types/request";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";

export default function AssignmentSelection({
  lng,
  workers,
  shifts,
  schedules,
  selectedAssignment,
  handleUpdateAssignment,
  handleDeleteAssignment,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  selectedAssignment: AssignmentDataDictT | null;
  handleUpdateAssignment: (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null
  ) => void;
  handleDeleteAssignment: (
    assignmentId: string,
    recurrenceId: string | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null
  ) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [selectedAssignmentState, setSelectedAssignmentState] =
    useState<AssignmentT | null>(selectedAssignment?.assignment || null);
  const [selectedAssignSchedule, setSelectedAssignSchedule] =
    useState<ScheduleT | null>(null);

  const handleChangeAssignmentFixed = () => {
    if (!selectedAssignmentState) return;
    handleUpdateAssignment(
      {
        ...selectedAssignmentState,
        fixed: !selectedAssignmentState.fixed,
      },
      null,
      null
    );
  };

  const breachesNoRequests =
    selectedAssignment?.breaches.filter(
      (b) => b.objectiveCategory !== ObjectiveCategory.REQUEST
    ) || [];

  useEffect(() => {
    setSelectedAssignmentState(selectedAssignment?.assignment || null);
    setSelectedAssignSchedule(
      selectedAssignment
        ? schedules.find(
            (s) => s.id === selectedAssignment.assignment.scheduleId
          ) || null
        : null
    );
  }, [selectedAssignment, schedules]);

  return (
    <div>
      <div className="assignment-options-assignment-container">
        <div className="assignment-options-assignment-title-container">
          {selectedAssignmentState && (
            <>
              <span className="assignment-options-assignment-title">
                {t("assignment")}
              </span>
              <Chip
                // icon={
                //   selectedAssignmentState.fixed ? (
                //     <LockOutlineIcon sx={{ fontSize: "0.8rem" }} />
                //   ) : (
                //     <LockOpenIcon sx={{ fontSize: "0.8rem" }} />
                //   )
                // }
                label={
                  selectedAssignmentState.fixed
                    ? `🔒 ${t("locked")}`
                    : `🔓 ${t("unlocked")}`
                }
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
                    color: selectedAssignmentState.fixed
                      ? "#d32f2f"
                      : "#616161",
                  },
                  "& .MuiChip-label": {
                    color: selectedAssignmentState.fixed
                      ? "#d32f2f"
                      : "#616161",
                  },
                  "&:hover": {
                    backgroundColor: selectedAssignmentState.fixed
                      ? "#ef5350"
                      : "#f0f0f0",
                  },
                  "&.MuiChip-outlined": {
                    borderColor: selectedAssignmentState.fixed
                      ? "#d32f2f"
                      : "#e5e7eb",
                  },
                }}
                onClick={handleChangeAssignmentFixed}
              />
            </>
          )}
        </div>
        {selectedAssignment?.assignment ? (
          <EditAssignment
            lng={lng}
            teamId={selectedAssignment.assignment.teamId}
            scheduleId={selectedAssignment.assignment.scheduleId}
            workerSelectedId={selectedAssignment.assignment.workerId}
            shiftSelectedId={selectedAssignment.assignment.shiftId}
            workers={workers}
            shifts={shifts}
            dateSelected={selectedAssignment.assignment.date}
            assignment={selectedAssignment.assignment}
            isEditing={true}
            handleUpdateAssignment={handleUpdateAssignment}
            handleDeleteAssignment={handleDeleteAssignment}
            recurrence={selectedAssignment.recurrence}
          />
        ) : (
          <span className="assignment-options-no-assignment-selected-msg">
            {t("no_assignment_selected_msg")}
          </span>
        )}
      </div>
      {selectedAssignmentState &&
        selectedAssignment &&
        selectedAssignmentState.date.isAfter(
          dayjs.utc(dayjs().startOf("day"))
        ) && (
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
            {selectedAssignment.requests.length === 0 ? (
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
              selectedAssignment.requests.map((request, index) => (
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
                          : request.status === RequestStatus.DENIED
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
