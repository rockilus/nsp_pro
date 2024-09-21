import dayjs from "dayjs";
import React, { ReactElement, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import PopoverAnchorElBelow from "../inputs/popover-anchor-el-below";
import RequestPanel from "./request-panel";
import { HardSoftButton } from "../buttons/hard-soft-button";
// Styles
import ".//request-table-row.css";
// Types
import { RequestT } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";

export default function RequestTableRow({
  lng,
  request,
  workers,
  shifts,
  requestTableFields,
  handleUpdateRequest,
  handleDeleteRequest,
}: {
  lng: string;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  requestTableFields: Record<string, string>[];
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
}) {
  const { t } = useTranslation(lng, "request-page");

  const [open, setOpen] = useState<boolean>(false);

  const requestStatus: Record<string, string>[] = [
    { name: "pending", label: t("pending") },
    { name: "approved", label: t("approved") },
    { name: "rejected", label: t("rejected") },
  ];

  const handleToggleHard = async (request: RequestT) => {
    const updatedRequest: RequestT = {
      ...request,
      hard: !request.hard,
    };
    handleUpdateRequest(updatedRequest);
  };

  const getWorkerName = (workerId: string): ReactElement => {
    const worker = workers.find((worker) => worker.id === workerId);
    return (
      <div className="name-cell">
        <span>{worker?.name}</span>
        {worker?.deleted && (
          <span className="missing">
            {t("no")} <strong>{worker?.name}</strong>{" "}
            {t("worker").toLowerCase()}
          </span>
        )}
      </div>
    );
  };

  const getShiftName = (shiftId: string): string | undefined => {
    const shift = shifts.find((shift) => shift.id === shiftId);
    return shift?.name;
  };

  const formatDate = (date: dayjs.Dayjs): string => {
    return dayjs(date).format("dddd, MMM D");
  };

  const getRequestStatus = (status: string): JSX.Element => {
    return (
      <div className="request-status-container">
        <FiberManualRecordIcon
          sx={{
            fontSize: "1.1rem",
            color:
              request.status === "approved"
                ? "green"
                : request.status === "rejected" && request.hard
                ? "red"
                : request.status === "rejected" && !request.hard
                ? "orange"
                : request.status === "pending"
                ? "grey"
                : "none",
          }}
        />
        <span className="request-status">
          {requestStatus.find((requestStatus) => requestStatus.name === status)
            ?.label || ""}
        </span>
      </div>
    );
  };

  return (
    <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
      {requestTableFields.map((field, index) => (
        <TableCell key={index} sx={{ paddingY: 0 }}>
          {(() => {
            if (field.name === "workerId") {
              return getWorkerName(request.workerId);
            } else if (field.name === "date") {
              if (request.startDate.isSame(request.endDate, "day")) {
                return formatDate(request.startDate);
              } else {
                return `${formatDate(request.startDate)} - ${formatDate(
                  request.endDate
                )}`;
              }
            } else if (field.name === "shiftId") {
              return getShiftName(request.shiftId);
            } else if (field.name === "hard") {
              return HardSoftButton(lng, request.hard, () =>
                handleToggleHard(request)
              );
            } else if (field.name === "status") {
              return getRequestStatus(request.status);
            }
          })()}
        </TableCell>
      ))}
      <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
        <Box sx={{ display: "flex" }}>
          <PopoverAnchorElBelow
            buttonContent={
              <IconButton edge="end" aria-label="delete">
                <EditIcon />
              </IconButton>
            }
            content={
              <RequestPanel
                lng={lng}
                request={request}
                workers={workers.filter((worker) => !worker.deleted)}
                shifts={shifts}
                handleClose={() => {
                  setOpen(false);
                }}
                handleAddRequest={handleUpdateRequest}
                handleUpdateRequest={handleUpdateRequest}
              />
            }
            open={open}
            setOpen={setOpen}
          />
          <Button onClick={() => handleDeleteRequest(request.id)}>
            <DeleteIcon />
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
