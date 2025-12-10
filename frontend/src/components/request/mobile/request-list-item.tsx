import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { RequestT, RequestStatus, RequestType } from "@/types/request";
import { ShiftT } from "@/types/shift";
import { ShiftWorkerOptionT } from "@/types/constraint";
import { WorkerT } from "@/types/worker";
import {
  getRequestTargetDisplayText,
  getShiftColors,
} from "@/utils/shift-worker-option-display";

interface RequestListItemProps {
  request: RequestT;
  shift: ShiftT | null;
  shiftOptions: ShiftWorkerOptionT[];
  shifts: ShiftT[];
  workers: WorkerT[];
  onClick?: () => void;
  lng: string;
  t: (key: string) => string;
}

export default function RequestListItem({
  request,
  shift,
  shiftOptions,
  shifts,
  workers,
  onClick,
  lng,
  t,
}: RequestListItemProps) {
  const isWork = request.requestType === RequestType.WORK_DEMAND;
  const isLeave = request.requestType === RequestType.LEAVE;

  // Get status info
  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return "success";
      case RequestStatus.DENIED:
        return "error";
      case RequestStatus.DEFERRED:
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return t("pending");
      case RequestStatus.APPROVED:
        return t("approved");
      case RequestStatus.DENIED:
        return t("rejected");
      case RequestStatus.DEFERRED:
        return t("deferred");
      default:
        return "Unknown";
    }
  };

  // Get shift colors for the request
  const shiftColors = getShiftColors(request, shifts);

  // Get date range text
  const dateRangeText = request.startDate.isSame(request.endDate, "day")
    ? request.startDate.format("MMM D")
    : `${request.startDate.format("MMM D")} - ${request.endDate.format(
        "MMM D"
      )}`;

  // Get shift info text
  let shiftInfoText = "";
  if (isLeave) {
    shiftInfoText = shift ? shift.name : t("all_day");
  } else {
    // Work request
    if (request.shiftOptions.length === 0) {
      shiftInfoText = t("no_preferences");
    } else {
      // Use the same utility as the table
      shiftInfoText = getRequestTargetDisplayText(
        request,
        workers,
        shifts,
        t("not")
      );
    }
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1.5,
        borderRadius: 1,
        cursor: onClick ? "pointer" : "default",
        backgroundColor: shiftColors?.background || "#f5f5f5",
        color: shiftColors?.text || "#212121",
        border: `1px solid ${shiftColors?.sample || "#e0e0e0"}`,
      }}
    >
      {/* Header: Type and Status badges */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Chip
          label={isWork ? t("work") : t("leave")}
          size="small"
          sx={{
            backgroundColor: isWork ? "#1976d2" : "#9c27b0",
            color: "white",
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 20,
          }}
        />
        <Chip
          label={getStatusLabel(request.status)}
          size="small"
          color={getStatusColor(request.status) as any}
          sx={{
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 20,
          }}
        />
      </Box>

      {/* Date Range */}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {dateRangeText}
      </Typography>

      {/* Shift Info */}
      <Typography variant="caption" sx={{ opacity: 0.9 }}>
        {shiftInfoText}
      </Typography>
    </Box>
  );
}
