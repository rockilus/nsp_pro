import React, { useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ShiftColorMappings } from "../../../constants/constants";
import { ShiftType } from "../../../types/shift";

dayjs.extend(utc);

interface WeekGridProps {
  week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  assignmentsByDate: Map<string, any[]>;
  shifts: any[];
  today: dayjs.Dayjs;
  setActiveAssignment: (assignment: any) => void;
  setSheetOpen: (open: boolean) => void;
  onScroll?: (scrollTop: number) => void;
}

interface AssignmentPosition {
  top: number;
  height: number;
  endsNextDay: boolean;
}

interface PositionedAssignment {
  assignment: any;
  shift: any;
  top: number;
  height: number;
  width: number;
  left: number;
  isOvernight: boolean;
  isSecondPart: boolean;
}

// Utility: Get minutes from midnight (0-1439)
const getMinutesFromMidnight = (time: dayjs.Dayjs): number => {
  return time.hour() * 60 + time.minute();
};

// Utility: Calculate assignment grid position
const calculateAssignmentGridPosition = (
  shift: any,
  assignmentDate: dayjs.Dayjs,
): AssignmentPosition => {
  const startTime = dayjs.utc(shift.startTime);
  const endTime = dayjs.utc(shift.endTime);

  const startMinutes = getMinutesFromMidnight(startTime);
  const endMinutes = getMinutesFromMidnight(endTime);

  // Check if shift ends on next day
  const endsNextDay =
    endTime.isBefore(startTime) ||
    !endTime.isSame(startTime, "day") ||
    endMinutes < startMinutes;

  if (endsNextDay) {
    // For overnight shifts, calculate as ending at midnight
    const durationToMidnight = 1440 - startMinutes;
    return {
      top: (startMinutes / 1440) * 100,
      height: (durationToMidnight / 1440) * 100,
      endsNextDay: true,
    };
  }

  const duration = endMinutes - startMinutes;
  return {
    top: (startMinutes / 1440) * 100,
    height: (duration / 1440) * 100,
    endsNextDay: false,
  };
};

// Utility: Calculate position for second part of overnight shift
const calculateOvernightSecondPart = (shift: any): AssignmentPosition => {
  const endTime = dayjs.utc(shift.endTime);
  const endMinutes = getMinutesFromMidnight(endTime);

  return {
    top: 0,
    height: (endMinutes / 1440) * 100,
    endsNextDay: false,
  };
};

// Utility: Check if two assignments overlap
const doAssignmentsOverlap = (a1: any, a2: any): boolean => {
  const s1 = a1.shift;
  const s2 = a2.shift;

  const start1 = getMinutesFromMidnight(dayjs.utc(s1.startTime));
  const end1 = getMinutesFromMidnight(dayjs.utc(s1.endTime));
  const start2 = getMinutesFromMidnight(dayjs.utc(s2.startTime));
  const end2 = getMinutesFromMidnight(dayjs.utc(s2.endTime));

  // Handle overnight shifts
  const actualEnd1 = end1 < start1 ? 1440 : end1;
  const actualEnd2 = end2 < start2 ? 1440 : end2;

  return start1 < actualEnd2 && actualEnd1 > start2;
};

// Utility: Calculate positions with overlap handling
const calculateAssignmentPositions = (
  assignments: any[],
  shifts: any[],
  date: dayjs.Dayjs,
): PositionedAssignment[] => {
  // Get shift data for each assignment
  const assignmentsWithShifts = assignments
    .map((a) => ({
      assignment: a,
      shift: shifts.find((s) => s.id === a.shiftId),
    }))
    .filter((a) => a.shift) // Only include assignments with valid shifts
    .sort((a, b) => {
      const startA = getMinutesFromMidnight(dayjs.utc(a.shift.startTime));
      const startB = getMinutesFromMidnight(dayjs.utc(b.shift.startTime));
      return startA - startB;
    });

  // Detect overlaps and assign tracks
  const tracks: any[][] = [];
  for (const item of assignmentsWithShifts) {
    // Find the first track where this assignment doesn't overlap with any existing assignment
    let trackIndex = 0;
    while (trackIndex < tracks.length) {
      const overlaps = tracks[trackIndex].some((existingItem) =>
        doAssignmentsOverlap(item, existingItem),
      );
      if (!overlaps) break;
      trackIndex++;
    }

    // Add to existing track or create new one
    if (trackIndex < tracks.length) {
      tracks[trackIndex].push(item);
    } else {
      tracks.push([item]);
    }
  }

  // Calculate positions
  const positioned: PositionedAssignment[] = [];
  const totalTracks = tracks.length;

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    for (const item of tracks[trackIndex]) {
      const position = calculateAssignmentGridPosition(item.shift, date);

      positioned.push({
        assignment: item.assignment,
        shift: item.shift,
        top: position.top,
        height: position.height,
        width: 100 / totalTracks,
        left: (trackIndex / totalTracks) * 100,
        isOvernight: position.endsNextDay,
        isSecondPart: false,
      });

      // If overnight, add second part for next day
      if (position.endsNextDay) {
        const nextDayPosition = calculateOvernightSecondPart(item.shift);
        positioned.push({
          assignment: item.assignment,
          shift: item.shift,
          top: nextDayPosition.top,
          height: nextDayPosition.height,
          width: 100 / totalTracks,
          left: (trackIndex / totalTracks) * 100,
          isOvernight: false,
          isSecondPart: true,
        });
      }
    }
  }

  return positioned;
};

const WeekGrid = forwardRef<HTMLDivElement, WeekGridProps>(
  (
    {
      week,
      assignmentsByDate,
      shifts,
      today,
      setActiveAssignment,
      setSheetOpen,
      onScroll,
    },
    ref,
  ) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Expose scrollTop via ref for external control
    useImperativeHandle(
      ref,
      () => scrollContainerRef.current as HTMLDivElement,
    );

    // Generate 7 days for the week
    const weekDays = useMemo(() => {
      const days: dayjs.Dayjs[] = [];
      let current = week.start;
      for (let i = 0; i < 7; i++) {
        days.push(current);
        current = current.add(1, "day");
      }
      return days;
    }, [week]);

    // Generate hour labels (00:00 - 23:00)
    const hours = useMemo(() => {
      return Array.from({ length: 24 }, (_, i) =>
        dayjs.utc().hour(i).minute(0).format("HH:mm"),
      );
    }, []);

    // Calculate positioned assignments for each day
    const positionedAssignmentsByDay = useMemo(() => {
      const result: Map<string, PositionedAssignment[]> = new Map();

      weekDays.forEach((day) => {
        const dateKey = day.format("YYYY-MM-DD");
        const dayAssignments = assignmentsByDate.get(dateKey) || [];
        const positioned = calculateAssignmentPositions(
          dayAssignments,
          shifts,
          day,
        );
        result.set(dateKey, positioned);

        // Also check for overnight assignments from the previous day
        const prevDay = day.subtract(1, "day");
        const prevDateKey = prevDay.format("YYYY-MM-DD");
        const prevAssignments = assignmentsByDate.get(prevDateKey) || [];
        const prevPositioned = calculateAssignmentPositions(
          prevAssignments,
          shifts,
          prevDay,
        );

        // Add second parts of overnight shifts to current day
        const overnightSecondParts = prevPositioned.filter(
          (p) => p.isSecondPart,
        );
        if (overnightSecondParts.length > 0) {
          const existing = result.get(dateKey) || [];
          result.set(dateKey, [...existing, ...overnightSecondParts]);
        }
      });

      return result;
    }, [weekDays, assignmentsByDate, shifts]);

    // Render assignment block
    const renderAssignment = (
      positioned: PositionedAssignment,
      dateKey: string,
    ) => {
      const { assignment, shift, top, height, width, left } = positioned;
      const colors = ShiftColorMappings[shift.color] || {
        background: "#f5f5f5",
        sample: "#9e9e9e",
        text: "#212121",
      };

      const isDuty = shift.shiftType === ShiftType.DUTY;
      const startTime = dayjs.utc(shift.startTime).format("HH:mm");
      const endTime = dayjs.utc(shift.endTime).format("HH:mm");
      const endsNextDay = !dayjs
        .utc(shift.endTime)
        .isSame(dayjs.utc(shift.startTime), "day");

      // Use acronym if block is too small (< 60px height)
      // Assuming 24 hours fills viewport height, height % maps roughly to pixels
      const useAcronym = height < 4; // ~60px if viewport is ~1440px tall

      return (
        <Box
          key={`${assignment.id}-${
            positioned.isSecondPart ? "part2" : "part1"
          }`}
          onClick={() => {
            setActiveAssignment(assignment);
            setSheetOpen(true);
          }}
          sx={{
            position: "absolute",
            top: `${top}%`,
            height: `${height}%`,
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: colors.background,
            color: colors.text,
            borderLeft: isDuty ? `6px solid ${colors.sample}` : "none",
            borderRadius: 1,
            padding: 0.5,
            cursor: "pointer",
            overflow: "hidden",
            minHeight: "30px",
            fontSize: "0.75rem",
            display: "flex",
            flexDirection: "column",
            "&:hover": {
              opacity: 0.9,
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: "0.7rem",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {useAcronym ? shift.acronym : shift.name}
          </Typography>
          {!useAcronym && (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.65rem",
                lineHeight: 1.1,
                color: colors.text,
                opacity: 0.9,
              }}
            >
              {startTime} - {endTime}
              {endsNextDay && <sup>+1</sup>}
            </Typography>
          )}
        </Box>
      );
    };

    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* Day headers row - just the 7 days without time column */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "2px solid #e0e0e0",
            backgroundColor: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 10,
            width: "100%",
          }}
        >
          {weekDays.map((day) => {
            const isToday = day.isSame(today, "day");
            return (
              <Box
                key={day.format("YYYY-MM-DD")}
                sx={{
                  padding: 1,
                  textAlign: "center",
                  backgroundColor: isToday ? "#2196f3" : "transparent",
                  color: isToday ? "#fff" : "text.primary",
                  borderRadius: isToday ? 1 : 0,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {day.format("ddd")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {day.format("D")}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Scrollable grid - just the 7 day columns without time column */}
        <Box
          ref={scrollContainerRef}
          onScroll={(e) => {
            if (onScroll) {
              onScroll((e.target as HTMLDivElement).scrollTop);
            }
          }}
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            position: "relative",
            width: "100%",
          }}
        >
          {/* Grid lines and assignments for each day */}
          {hours.map((hour, index) => (
            <React.Fragment key={hour}>
              {weekDays.map((day, dayIndex) => (
                <Box
                  key={`${day.format("YYYY-MM-DD")}-${hour}`}
                  sx={{
                    gridColumn: dayIndex + 1,
                    gridRow: index + 1,
                    borderTop: "1px solid #e0e0e0",
                    borderLeft: dayIndex === 0 ? "1px solid #e0e0e0" : "none",
                    borderRight: "1px solid #e0e0e0",
                    height: "60px",
                    position: "relative",
                  }}
                >
                  {/* Render assignments for this day (positioned absolutely within the day column) */}
                  {index === 0 && ( // Only render once per day column
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "1440px", // 24 hours * 60px per hour
                      }}
                    >
                      {(
                        positionedAssignmentsByDay.get(
                          day.format("YYYY-MM-DD"),
                        ) || []
                      ).map((positioned) =>
                        renderAssignment(positioned, day.format("YYYY-MM-DD")),
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  },
);

WeekGrid.displayName = "WeekGrid";

export default React.memo(WeekGrid);
