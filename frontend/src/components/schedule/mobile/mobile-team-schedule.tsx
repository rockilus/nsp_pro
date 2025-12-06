import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Local components
import DateCarousel from "./date-carousel";
import TeamAssignmentItem from "./team-assignment-item";
// Types
import { ShiftRestType } from "@/types/shift";

interface MobileTeamScheduleProps {
  lng: string;
  weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  today: dayjs.Dayjs;
  assignments: any[];
  workers: any[];
  shifts: any[];
  setActiveAssignment: (assignment: any) => void;
  setSheetOpen: (open: boolean) => void;
  onVisibleMonthChange: (month: string) => void;
  onScrollToTodayReady: (handler: () => void) => void;
}

export default function MobileTeamSchedule({
  lng,
  weeks,
  today,
  assignments,
  workers,
  shifts,
  setActiveAssignment,
  setSheetOpen,
  onVisibleMonthChange,
  onScrollToTodayReady,
}: MobileTeamScheduleProps) {
  // Select today by default
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(today);

  // Filter assignments for the selected date
  const selectedDateAssignments = useMemo(() => {
    const dateKey = selectedDate.utc().format("YYYY-MM-DD");
    const dayAssignments = assignments.filter((a) => {
      const assignmentDate = dayjs(a.date).utc().format("YYYY-MM-DD");
      return assignmentDate === dateKey;
    });

    // Filter out recuperation shifts
    const filtered = dayAssignments.filter((a) => {
      const shift = shifts.find((s) => s.id === a.shiftId);
      return shift && shift.restType !== ShiftRestType.RECUPERATION;
    });

    // Sort by shift start time
    return filtered.sort((a, b) => {
      const sa = shifts.find((s) => s.id === a.shiftId);
      const sb = shifts.find((s) => s.id === b.shiftId);
      if (!sa || !sb) return 0;
      if (sa.startTime && sb.startTime) {
        if (sa.startTime.isBefore(sb.startTime)) return -1;
        if (sa.startTime.isAfter(sb.startTime)) return 1;
      }
      return 0;
    });
  }, [selectedDate, assignments, shifts]);

  const handleAssignmentClick = (assignment: any) => {
    setActiveAssignment(assignment);
    setSheetOpen(true);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Horizontal date carousel - fixed at top */}
      <Box sx={{ flexShrink: 0 }}>
        <DateCarousel
          weeks={weeks}
          today={today}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onVisibleMonthChange={onVisibleMonthChange}
          onScrollToTodayReady={onScrollToTodayReady}
        />
      </Box>

      {/* Assignments list - scrollable */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          pb: 8,
        }}
      >
        {selectedDateAssignments.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "50vh",
              padding: 3,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No assignments for {selectedDate.format("MMMM D, YYYY")}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {selectedDateAssignments.map((assignment) => {
              const worker = workers.find((w) => w.id === assignment.workerId);
              const shift = shifts.find((s) => s.id === assignment.shiftId);

              return (
                <TeamAssignmentItem
                  key={assignment.id}
                  assignment={assignment}
                  worker={worker}
                  shift={shift}
                  onClick={() => handleAssignmentClick(assignment)}
                />
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
