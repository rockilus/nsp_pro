import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ShiftColorMappings } from "../../constants/constants";
import { ShiftType } from "@/types/shift";

dayjs.extend(utc);

export default function AssignmentDialog({
  open,
  onClose,
  assignment,
  shift,
  worker,
}: {
  open: boolean;
  onClose: () => void;
  assignment: any | null;
  shift?: any | null;
  worker?: any | null;
}) {
  if (!assignment || !shift) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">No assignment data</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const colors = ShiftColorMappings[shift.color] || {
    background: "#f5f5f5",
    sample: "#9e9e9e",
    text: "#212121",
  };

  const shiftStart = dayjs.utc(shift.startTime);
  const shiftEnd = dayjs.utc(shift.endTime);

  const startMinutes = shiftStart.hour() * 60 + shiftStart.minute();
  const endMinutes = shiftEnd.hour() * 60 + shiftEnd.minute();

  const isMidnightNextDay =
    endMinutes === 0 &&
    shiftEnd.isSame(shiftStart.add(1, "day").startOf("day"));

  const endsNextDay =
    !isMidnightNextDay &&
    (shiftEnd.isBefore(shiftStart) ||
      !shiftEnd.isSame(shiftStart, "day") ||
      endMinutes < startMinutes);

  const assignmentDay = assignment.date
    ? dayjs.utc(assignment.date)
    : dayjs.utc();

  const startDayLabel = assignmentDay.format("dddd D MMMM");
  const startTimeLabel = shiftStart.format("H:mm");

  const endDayLabel = endsNextDay
    ? assignmentDay.add(1, "day").format("dddd D MMMM")
    : startDayLabel;
  const endTimeLabel = shiftEnd.format("H:mm");

  const sameDayDisplay = `${startDayLabel} ⋅ ${startTimeLabel} - ${endTimeLabel}`;
  const overnightDisplay = `${startDayLabel} ${startTimeLabel} - ${endDayLabel} ${endTimeLabel}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{shift?.name || "Assignment"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          {/* Duty marker */}
          <Box
            sx={{
              width: 6,
              height: 48,
              borderRadius: 1,
              backgroundColor:
                shift.shiftType === ShiftType.DUTY
                  ? colors.sample
                  : "transparent",
              mt: 0.5,
            }}
          />

          <Box sx={{ flex: 1 }}>
            {worker && (
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
                {worker.name}
              </Typography>
            )}
            <Typography variant="body1" sx={{ mb: 1 }}>
              {endsNextDay ? overnightDisplay : sameDayDisplay}
            </Typography>

            {/* Additional details could go here (worker, notes, etc.) */}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
