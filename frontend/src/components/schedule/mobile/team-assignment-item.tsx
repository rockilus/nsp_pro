import React from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
// Types and constants
import { ShiftColorMappings } from "../../../constants/constants";

interface TeamAssignmentItemProps {
  assignment: any;
  worker: any;
  shift: any;
  onClick?: () => void;
}

export default function TeamAssignmentItem({
  assignment,
  worker,
  shift,
  onClick,
}: TeamAssignmentItemProps) {
  const mapping = (shift && ShiftColorMappings[shift.color]) || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const startTime = shift?.startTime?.format
    ? shift.startTime.format("HH:mm")
    : "";
  const endTime = shift?.endTime?.format ? shift.endTime.format("HH:mm") : "";
  const endsNextDay =
    shift && shift.startTime && shift.endTime
      ? !shift.endTime.isSame(shift.startTime, "day")
      : false;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        borderRadius: 1,
        cursor: onClick ? "pointer" : "default",
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        transition: "background-color 0.2s",
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
      }}
    >
      {/* Worker Avatar */}
      <Avatar
        sx={{
          width: 40,
          height: 40,
          bgcolor: "#1a73e8",
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        {worker?.acronym || "?"}
      </Avatar>

      {/* Worker and Shift Details */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
          {worker?.name || "Unknown Worker"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Chip
            label={shift?.name || "—"}
            size="small"
            sx={{
              backgroundColor: mapping.background,
              color: mapping.text,
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          {startTime && endTime ? (
            <>
              {startTime} - {endTime}
              {endsNextDay && <sup>+1</sup>}
            </>
          ) : (
            ""
          )}
        </Typography>
      </Box>
    </Box>
  );
}
