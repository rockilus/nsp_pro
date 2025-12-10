import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { RequestT, RequestStatus, RequestType } from "@/types/request";
import { ShiftT } from "@/types/shift";
import { ShiftWorkerOptionT, SWOIdTypes } from "@/types/constraint";
import { WorkerT } from "@/types/worker";
import {
  getShiftWorkerOptionDisplayText,
  getShiftColors,
  getRequestStatusColor,
  getRequestStatusLabel,
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

  // Get shift colors for the request
  const shiftColors = getShiftColors(request, shifts);

  // Get emoji indicator
  const getEmoji = () => {
    if (isLeave) return "🏖️";
    return request.negative ? "🙅" : "🙋";
  };

  // Get shift names to display
  const getShiftNames = (): { name: string; color: string }[] => {
    if (isLeave) {
      return shift
        ? [{ name: shift.name, color: shift.color }]
        : [{ name: t("all_day"), color: "grey" }];
    } else {
      // Work request - get shift names from shiftOptions
      if (request.shiftOptions.length === 0) {
        return [{ name: t("no_preferences"), color: "grey" }];
      }

      const shiftNames = request.shiftOptions
        .filter((swo) => swo.idType === SWOIdTypes.SHIFT)
        .map((swo) => {
          const foundShift = shifts.find((s) => s.id === swo.id);
          return foundShift
            ? { name: foundShift.name, color: foundShift.color }
            : { name: swo.name as string, color: "grey" };
        });

      // If no shifts found in options, show the option names
      if (shiftNames.length === 0) {
        return request.shiftOptions.map((swo) => ({
          name: getShiftWorkerOptionDisplayText(swo, workers, shifts, t("not")),
          color: "grey",
        }));
      }

      return shiftNames;
    }
  };

  // Check if request spans multiple days
  const isMultiDay = !request.startDate.isSame(request.endDate, "day");

  // Get date range text with weekday
  const dateRangeText = isMultiDay
    ? `${request.startDate.format("ddd, MMM D")} - ${request.endDate.format(
        "ddd, MMM D"
      )}`
    : null;

  const shiftNamesList = getShiftNames();
  const emoji = getEmoji();

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
        backgroundColor: isLeave ? "#ffebee" : "#fff",
        border: "1px solid #e0e0e0",
      }}
    >
      {/* First line: Emoji + Shift names */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Typography variant="body2" sx={{ fontSize: "1.2rem" }}>
          {emoji}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, fontSize: "0.875rem" }}
        >
          {shiftNamesList.map((s) => s.name).join(", ")}
        </Typography>
      </Box>

      {/* Second line: Date range (only if multi-day) */}
      {isMultiDay && dateRangeText && (
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, fontSize: "0.875rem" }}
        >
          {dateRangeText}
        </Typography>
      )}

      {/* Third line: Status chip */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Chip
          label={getRequestStatusLabel(request.status, t)}
          size="small"
          color={getRequestStatusColor(request.status) as any}
          sx={{
            fontWeight: 500,
            fontSize: "0.7rem",
            height: 20,
          }}
        />
      </Box>
    </Box>
  );
}
