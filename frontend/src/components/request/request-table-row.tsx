import dayjs from "dayjs";
import React, { ReactElement, useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
// Components
import RequestPanel from "./request-panel";
import { HardSoftButton } from "../buttons/hard-soft-button";
// Styles
import "./request-table-row.css";
// Types
import { RequestT, RequestStatus } from "../../types/request";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import { TeamMembershipRole } from "@/types/team";
import { ShiftWorkerOptionT } from "@/types/constraint";

export default function RequestTableRow({
  lng,
  request,
  workers,
  shifts,
  shiftOptions,
  requestTableFields,
  userWorkerId,
  userTeamRole,
  handleUpdateRequest,
  handleDeleteRequest,
}: {
  lng: string;
  request: RequestT;
  workers: WorkerT[];
  shifts: ShiftT[];
  shiftOptions: ShiftWorkerOptionT[];
  requestTableFields: Record<string, string>[];
  userWorkerId: string | null;
  userTeamRole: TeamMembershipRole;
  handleUpdateRequest: (request: RequestT) => void;
  handleDeleteRequest: (requestId: string) => void;
}) {
  const { t } = useTranslation(lng, "request-page");

  const requestStatus: { name: RequestStatus; label: string }[] = [
    { name: RequestStatus.PENDING, label: t("pending") },
    { name: RequestStatus.APPROVED, label: t("approved") },
    { name: RequestStatus.DENIED, label: t("rejected") },
  ];

  const handleToggleNegative = async () => {
    const updatedRequest: RequestT = {
      ...request,
      negative: !request.negative,
    };
    handleUpdateRequest(updatedRequest);
  };

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

  const getShiftName = (shiftId: string): ReactElement => {
    const shift = shifts.find((shift) => shift.id === shiftId);
    return (
      <div className="name-cell">
        <span>{shift?.name}</span>
        {shift?.deleted && (
          <span className="missing">
            {t("no")} <strong>{shift?.name}</strong> {t("shift").toLowerCase()}
          </span>
        )}
      </div>
    );
  };

  const formatDate = (date: dayjs.Dayjs): string => {
    return dayjs(date).format("dddd, MMM D");
  };

  const getRequestStatus = (status: RequestStatus): JSX.Element => {
    return (
      <div className="request-status-container">
        <FiberManualRecordIcon
          sx={{
            fontSize: "1.1rem",
            color:
              request.status === RequestStatus.APPROVED
                ? "green"
                : request.status === RequestStatus.DENIED && request.hard
                ? "red"
                : request.status === RequestStatus.DENIED && !request.hard
                ? "orange"
                : request.status === RequestStatus.PENDING
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
    <TableRow
      className={`request-row ${request.active ? "active" : "inactive"}`}
      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
    >
      <TableCell sx={{ paddingY: 0 }}>
        <IconButton
          size="small"
          aria-label="add"
          onClick={handleToggleNegative}
        >
          {request.negative ? (
            <BlockIcon sx={{ color: "darkgrey" }} />
          ) : (
            <CheckCircleOutlineIcon sx={{ color: "darkgrey" }} />
          )}
        </IconButton>
      </TableCell>
      {requestTableFields
        .filter((rtf) => rtf.name !== "negative")
        .map((field, index) => (
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
                if (!request.shiftId) {
                  return "SHIFT OPTIONS TO BE IMPLEMENTED";
                } else {
                  return getShiftName(request.shiftId);
                }
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
        <div className="request-row-buttons">
          <RequestPanel
            lng={lng}
            teamId={request.teamId}
            isEdit={true}
            request={request}
            workers={workers.filter((worker) => !worker.deleted)}
            shifts={shifts.filter((shift) => !shift.deleted)}
            shiftOptions={shiftOptions}
            userWorkerId={userWorkerId}
            userTeamRole={userTeamRole}
            handleAddRequest={handleUpdateRequest}
            handleUpdateRequest={handleUpdateRequest}
          />
          <IconButton
            disabled={
              userTeamRole === TeamMembershipRole.MEMBER &&
              (!userWorkerId || request.workerId !== userWorkerId)
            }
            onClick={() => handleDeleteRequest(request.id)}
          >
            <DeleteIcon />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
