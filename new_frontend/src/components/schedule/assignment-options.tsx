import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Typography from "@mui/material/Typography";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { AssignmentT, SelectedCellT } from "../../types/schedule";

export default function AssignmentOptions({
  lng,
  workers,
  shifts,
  assignments,
  selectedCell,
  selectedDisplay,
  setSelectedCell,
  handleUpdateAssignment,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
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

  const handleClose = () => {
    setSelectedCell(null);
  };

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
    (b) => b.objectiveCategory !== "request"
  );

  useEffect(() => {
    setSelectedAssignment(
      assignments.find((a) => a.id === selectedCell.assignment.id) ||
        selectedCell.assignment
    );
  }, [selectedCell, assignments]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        margin: 2,
        marginLeft: 0,
        width: "400px",
        border: "1px solid grey",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: 45,
          }}
        >
          <Typography
            variant="subtitle1"
            align="left"
            sx={{ fontWeight: "bold" }}
          >
            {t("selection")}
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <CloseIcon color="disabled" />
        </IconButton>
      </Box>
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: 25,
            width: "300px",
            paddingLeft: 1,
            borderBottom: "1px solid lightgrey",
            backgroundColor: "grey.100",
          }}
        >
          <Typography
            // variant="body2"
            align="left"
            sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
          >
            {t("assignment")}
          </Typography>
        </Box>
        {selectedAssignment.fixed || selectedAssignment.status !== "wip" ? (
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
                    paddingLeft: "10px",
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
                    paddingLeft: "10px",
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
            {selectedAssignment.status === "wip" && (
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
              <Typography
                align="left"
                sx={{ fontSize: "0.8rem", paddingLeft: "10px" }}
              >
                {`${selectedCell.shift.name} - 
            ${selectedAssignment.date.format("D MMM YYYY")}: ${
                  selectedCell.worker.name
                }`}
              </Typography>
            )}
            {selectedDisplay === "worker" && (
              <Typography
                align="left"
                sx={{ fontSize: "0.8rem", paddingLeft: "10px" }}
              >
                {`${selectedCell.worker.name} -
            ${selectedAssignment.date.format("D MMM YYYY")}: ${
                  selectedCell.shift.name
                }`}
              </Typography>
            )}
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
              {t("set")}
            </Button>
          </Box>
        )}
      </Box>
      {selectedAssignment.date.isAfter(dayjs.utc(dayjs().startOf("day"))) && (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              minHeight: 25,
              width: "300px",
              paddingLeft: 1,
              borderBottom: "1px solid lightgrey",
              backgroundColor: "grey.100",
            }}
          >
            <Typography
              // variant="body2"
              align="left"
              sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
            >
              {t("requests")}
            </Typography>
          </Box>
          {selectedCell.requests.length === 0 ? (
            <Typography
              align="left"
              sx={{
                fontSize: "0.8rem",
                paddingLeft: "10px",
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
                <Typography
                  align="left"
                  sx={{ fontSize: "0.8rem", paddingLeft: "10px" }}
                >
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
        </Box>
      )}
      {selectedAssignment.status === "wip" && (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              minHeight: 25,
              width: "300px",
              paddingLeft: 1,
              borderBottom: "1px solid lightgrey",
              backgroundColor: "grey.100",
            }}
          >
            <Typography
              // variant="body2"
              align="left"
              sx={{ fontWeight: "bold", fontSize: "0.8rem" }}
            >
              {t("breaches")}
            </Typography>
          </Box>
          {breachesNoRequests.length === 0 ? (
            <Typography
              align="left"
              sx={{
                fontSize: "0.8rem",
                paddingLeft: "10px",
                color: "grey.700",
                fontStyle: "italic",
              }}
            >
              {t("no_breaches")}
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
                <Typography
                  align="left"
                  sx={{ fontSize: "0.8rem", paddingLeft: "10px" }}
                >
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
        </Box>
      )}
    </Box>
  );
}
