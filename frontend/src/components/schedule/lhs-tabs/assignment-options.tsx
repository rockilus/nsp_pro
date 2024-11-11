import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Typography from "@mui/material/Typography";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  AssignmentT,
  SelectedCellT,
  ObjectiveCategory,
  ScheduleT,
  ScheduleStatus,
} from "../../../types/schedule";
import { set } from "zod";

export default function AssignmentOptions({
  lng,
  workers,
  shifts,
  schedules,
  assignments,
  selectedCell,
  selectedDisplay,
  setSelectedCell,
  handleUpdateAssignment,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  assignments: AssignmentT[];
  selectedCell: SelectedCellT;
  selectedDisplay: string;
  setSelectedCell: (selectedCell: SelectedCellT | null) => void;
  handleUpdateAssignment: (assignment: AssignmentT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentT>(
    assignments.find((a) => a.id === selectedCell.assignment.id) ||
      selectedCell.assignment
  );
  const [selectedAssignSchedule, setSelectedAssignSchedule] =
    useState<ScheduleT | null>(null);

  const handleChangeAssignmentFixed = () => {
    handleUpdateAssignment({
      ...selectedAssignment,
      fixed: !selectedAssignment.fixed,
    });
  };

  const handleChangeAssignmentWorker = (event: SelectChangeEvent) => {
    handleUpdateAssignment({
      ...selectedAssignment,
      workerId: event.target.value as string,
    });
  };

  const handleChangeAssignmentShift = (event: SelectChangeEvent) => {
    handleUpdateAssignment({
      ...selectedAssignment,
      shiftId: event.target.value as string,
    });
  };

  const breachesNoRequests = selectedCell.breaches.filter(
    (b) => b.objectiveCategory !== ObjectiveCategory.REQUEST
  );

  useEffect(() => {
    const newSelectedAssignment =
      assignments.find((a) => a.id === selectedCell.assignment.id) ||
      selectedCell.assignment;
    const newSelectedAssignSchedule =
      schedules.find((s) => s.id === newSelectedAssignment.scheduleId) || null;
    setSelectedAssignment(newSelectedAssignment);
    setSelectedAssignSchedule(newSelectedAssignSchedule);
  }, [selectedCell, assignments, schedules]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        padding: "10px 10px 5px 10px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("selection")}
      </span>
      <div style={{ marginTop: "10px" }}>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#3C4043",
          }}
        >
          {t("assignment")}
        </span>
        {selectedAssignment.fixed ||
        selectedAssignSchedule?.status !== ScheduleStatus.CAMPAIGN ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {selectedDisplay === "shift" && (
              <Box>
                <Typography
                  align="left"
                  sx={{
                    fontSize: "0.8rem",
                  }}
                >
                  {`${selectedCell.shift.name} - 
            ${selectedAssignment.date.format("D MMM YYYY")}:`}
                </Typography>
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectedAssignment.workerId}
                    onChange={handleChangeAssignmentWorker}
                    sx={{
                      fontSize: "0.8rem",
                      height: "25px",
                      width: "100px",
                      paddingY: 0,
                    }}
                  >
                    {workers.map((worker, index) => (
                      <MenuItem key={index} value={worker.id}>
                        {worker.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {selectedDisplay === "worker" && (
              <Box>
                <Typography
                  align="left"
                  sx={{
                    fontSize: "0.8rem",
                  }}
                >
                  {`${selectedCell.worker.name} - 
            ${selectedAssignment.date.format("D MMM YYYY")}:`}
                </Typography>
                <FormControl fullWidth>
                  <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    value={selectedAssignment.shiftId}
                    onChange={handleChangeAssignmentShift}
                    sx={{
                      fontSize: "0.8rem",
                      height: "25px",
                      width: "100px",
                      paddingY: 0,
                    }}
                  >
                    {shifts.map((shift, index) => (
                      <MenuItem key={index} value={shift.id}>
                        {shift.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            {selectedAssignSchedule?.status === ScheduleStatus.CAMPAIGN && (
              <Button
                onClick={handleChangeAssignmentFixed}
                sx={{
                  borderRadius: 4,
                  textTransform: "none",
                  fontSize: "0.8rem",
                  border: "1px solid",
                  height: "20px",
                  color: "grey.700",
                  paddingY: 0,
                  paddingX: 0,
                }}
              >
                {t("unset")}
              </Button>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {selectedDisplay === "shift" && (
              <Typography align="left" sx={{ fontSize: "0.8rem" }}>
                {`${selectedCell.shift.name} - 
            ${selectedAssignment.date.format("D MMM YYYY")}: ${
                  selectedCell.worker.name
                }`}
              </Typography>
            )}
            {selectedDisplay === "worker" && (
              <Typography align="left" sx={{ fontSize: "0.8rem" }}>
                {`${selectedCell.worker.name} -
            ${selectedAssignment.date.format("D MMM YYYY")}: ${
                  selectedCell.shift.name
                }`}
              </Typography>
            )}
            <Button
              onClick={handleChangeAssignmentFixed}
              sx={{
                borderRadius: "4px",
                textTransform: "none",
                fontSize: "0.8rem",
                border: "1px solid rgb(229, 231, 235)",
                height: "20px",
                color: "grey.700",
                paddingY: 0,
                paddingX: 0,
              }}
            >
              {t("set")}
            </Button>
          </Box>
        )}
      </div>
      {selectedAssignment.date.isAfter(dayjs.utc(dayjs().startOf("day"))) && (
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
                      request.status === "approved"
                        ? "green"
                        : request.status === "rejected"
                        ? "red"
                        : request.status === "pending"
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
