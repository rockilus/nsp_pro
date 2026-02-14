import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ShiftColorMappings } from "../../../constants/constants";
import { ShiftType } from "@/types/shift";

export default function AssignmentListItem({
  assignment,
  shift,
  onClick,
}: {
  assignment: any;
  shift: any;
  onClick?: () => void;
}) {
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
        gap: 1,
        p: 1,
        borderRadius: 1,
        cursor: onClick ? "pointer" : "default",
        backgroundColor: mapping.background,
        color: mapping.text,
      }}
      data-testid={`assignment-list-item-${assignment.id}`}
    >
      {/* Duty marker */}
      <Box
        sx={{
          width: 6,
          height: 40,
          borderRadius: 1,
          backgroundColor:
            shift?.shiftType === ShiftType.DUTY
              ? mapping.sample
              : "transparent",
        }}
      />

      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">{shift?.name || "—"}</Typography>
        <Typography variant="caption" color="inherit">
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
