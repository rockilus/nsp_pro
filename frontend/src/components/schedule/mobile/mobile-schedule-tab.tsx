import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Fab from "@mui/material/Fab";
import CircularProgress from "@mui/material/CircularProgress";
import useMediaQuery from "@mui/material/useMediaQuery";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
// Hooks
import {
  useGetScheduleAssignmentsData,
  useGetScheduleAssignmentsDataNoSolver,
} from "../../../hooks/useSchedule";
import { useScheduleViewSettings } from "../../../app/lib/hooks/useScheduleViewSettings";
import { getDefaultScheduleViewSettings } from "../../../app/lib/utils/scheduleViewSettingsUtils";
import { computePeriodEndDate } from "../../../app/lib/utils/scheduleViewSettingsUtils";
// Types
import { TeamWithMembership } from "@/types/team";
// Local components
import AssignmentListItem from "./assignment-list-item";
import MobileAssignmentSheet from "./mobile-assignment-sheet";
import PortraitScheduleList from "./portrait-schedule-list";
import LandscapeWeeklyCalendar from "./landscape-weekly-calendar";
import MobileNavAppBar from "../../app-bar/mobile-nav-app-bar";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function MobileScheduleTab({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const defaultSettings = getDefaultScheduleViewSettings(
    teamWithMembership.team.useSolver
  );

  const [scheduleViewSettings, updateScheduleViewSettings] =
    useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  const getScheduleAssignmentsData = useGetScheduleAssignmentsData();
  const getScheduleAssignmentsDataNoSolver =
    useGetScheduleAssignmentsDataNoSolver();

  const [isLoading, setIsLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<string>("");

  const isLandscape = useMediaQuery("(orientation: landscape)", {
    noSsr: true,
  });

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setIsLoading(true);
      try {
        if (teamWithMembership.team.useSolver) {
          const { assignments, workers, shifts } =
            await getScheduleAssignmentsData(teamWithMembership.team.id);
          if (!mounted) return;
          setAssignments(assignments);
          setWorkers(workers);
          setShifts(shifts);
          if (!selectedWorkerId && workers.length > 0) {
            // If member, try to preselect user's worker
            const userId =
              (teamWithMembership as any).membership?.userId || null;
            const memberWorker = userId
              ? workers.find((w: any) => w.userId === userId)
              : null;
            setSelectedWorkerId(
              (memberWorker && memberWorker.id) || workers[0].id
            );
          }
        } else {
          const { assignments, workers, shifts } =
            await getScheduleAssignmentsDataNoSolver(
              teamWithMembership.team.id
            );
          if (!mounted) return;
          setAssignments(assignments);
          setWorkers(workers);
          setShifts(shifts);
          if (!selectedWorkerId && workers.length > 0) {
            setSelectedWorkerId(workers[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamWithMembership]);

  const periodStart = scheduleViewSettings.periodStartDate;
  const periodEnd = computePeriodEndDate(
    scheduleViewSettings.periodStartDate,
    scheduleViewSettings.timeFrame
  );

  // Build multiple weeks around the current period so the user can scroll across months
  const weeks = useMemo(() => {
    const center = periodStart.startOf("isoWeek");
    const result: { start: dayjs.Dayjs; end: dayjs.Dayjs }[] = [];
    const range = 8; // weeks before and after
    for (let i = -range; i <= range; i++) {
      const start = center.add(i, "week");
      const end = start.add(6, "day");
      result.push({ start, end });
    }
    return result;
  }, [periodStart]);

  const today = dayjs.utc();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const weekRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const weeksRef = React.useRef(weeks);

  // Update weeksRef when weeks change
  React.useEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);

  // Detect visible month during scroll
  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerHeight = container.clientHeight;
    const viewportCenter = containerTop + containerHeight / 3; // Use top third for better UX

    // Find which week is most visible (centered in viewport)
    for (let i = 0; i < weekRefs.current.length; i++) {
      const weekEl = weekRefs.current[i];
      if (!weekEl) continue;

      const weekRect = weekEl.getBoundingClientRect();
      const weekTop = weekRect.top;
      const weekBottom = weekRect.bottom;

      // Check if this week contains the viewport center
      if (weekTop <= viewportCenter && weekBottom >= viewportCenter) {
        const week = weeksRef.current[i];
        if (week) {
          const newMonth = week.start.format(
            week.start.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
          );
          setVisibleMonth(newMonth);
        }
        break;
      }
    }
  }, []);

  // Scroll to today in the assignment list (portrait) or navigate to today's week (landscape)
  const handleScrollToToday = () => {
    if (isLandscape) {
      // Landscape: update state to jump to today's week
      const todayWeekStart = today.startOf("isoWeek");
      updateScheduleViewSettings({
        ...scheduleViewSettings,
        timeFrame: "week",
        periodStartDate: todayWeekStart,
      });
      // Update visible month label
      const monthLabel = todayWeekStart.format(
        todayWeekStart.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
      );
      setVisibleMonth(monthLabel);
    } else {
      // Portrait: existing scroll behavior
      const idx = weeks.findIndex(
        (w) =>
          today.isSameOrAfter(w.start, "day") &&
          today.isSameOrBefore(w.end, "day")
      );
      const target = weekRefs.current[idx >= 0 ? idx : 0];
      if (target && containerRef.current) {
        const container = containerRef.current as HTMLElement;
        const targetEl = target as HTMLElement;
        const top = targetEl.offsetTop - container.offsetTop;
        container.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  // On load, scroll to the week that contains today so current date appears at top
  const hasScrolledRef = React.useRef(false);
  useEffect(() => {
    if (isLoading || hasScrolledRef.current) return;
    const idx = weeks.findIndex(
      (w) =>
        today.isSameOrAfter(w.start, "day") &&
        today.isSameOrBefore(w.end, "day")
    );
    const target = weekRefs.current[idx >= 0 ? idx : 0];
    if (target && containerRef.current) {
      try {
        const container = containerRef.current as HTMLElement;
        const targetEl = target as HTMLElement;
        const top = targetEl.offsetTop - container.offsetTop;
        container.scrollTo({ top, behavior: "auto" });
        hasScrolledRef.current = true;
        // Update visible month after initial scroll
        setTimeout(() => handleScroll(), 100);
      } catch (err) {
        // fallback to bounding rect calculation
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollTop + (targetTop - containerTop),
          behavior: "auto",
        });
        hasScrolledRef.current = true;
        // Update visible month after initial scroll
        setTimeout(() => handleScroll(), 100);
      }
    }
  }, [isLoading, weeks, today, handleScroll]);

  // Build array of dayjs dates for the period
  const periodDates = useMemo(() => {
    const dates: dayjs.Dayjs[] = [];
    let current = periodStart;
    while (current.isBefore(periodEnd) || current.isSame(periodEnd, "day")) {
      dates.push(current);
      current = current.add(1, "day");
    }
    return dates;
  }, [periodStart, periodEnd]);

  // Initialize visibleMonth based on periodStart (only on mount)
  const hasInitializedMonthRef = React.useRef(false);
  React.useEffect(() => {
    if (hasInitializedMonthRef.current) return;
    const monthLabel = periodStart.format(
      periodStart.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
    );
    setVisibleMonth(monthLabel);
    hasInitializedMonthRef.current = true;
  }, [periodStart]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!selectedWorkerId) return map;
    for (const a of assignments) {
      if (a.workerId !== selectedWorkerId) continue;
      const key = dayjs(a.date).utc().format("YYYY-MM-DD");
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [assignments, selectedWorkerId]);

  // Find current week for landscape view
  const currentWeek = useMemo(() => {
    return (
      weeks.find(
        (w) =>
          periodStart.isSameOrAfter(w.start, "day") &&
          periodStart.isSameOrBefore(w.end, "day")
      ) || weeks[0]
    );
  }, [weeks, periodStart]);

  // Handle week navigation in landscape mode
  const handleWeekChange = (direction: number) => {
    // Navigate by whole weeks and ensure the settings use a week boundary so
    // validation doesn't snap the date to a month start.
    const newPeriodStart = periodStart.add(direction, "week");
    const aligned = newPeriodStart.startOf("isoWeek");

    updateScheduleViewSettings({
      ...scheduleViewSettings,
      timeFrame: "week",
      periodStartDate: aligned,
    });

    // Update visible month label based on the new week start
    const monthLabel = aligned.format(
      aligned.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
    );
    setVisibleMonth(monthLabel);
  };

  // Build mobile navigation content that fills space between hamburger and avatar
  const scheduleMobileNav = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: "text.secondary" }}
      >
        {visibleMonth}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <IconButton onClick={() => setSettingsOpen(true)} size="small">
          <SettingsIcon />
        </IconButton>
        <Button
          onClick={handleScrollToToday}
          sx={{
            minWidth: 30,
            height: 30,
            // Rounded-square (not fully circular) for a friendlier look
            borderRadius: "6px",
            padding: 0,
            color: "text.secondary",
            // Slightly heavier border to visually match the month label weight
            border: (theme) => `2px solid ${theme.palette.text.secondary}`,
            backgroundColor: "transparent",
            // Match the month label font weight
            fontWeight: 600,
          }}
        >
          {dayjs.utc().format("D")}
        </Button>
      </Box>
    </Box>
  );

  if (isLoading) {
    return (
      <>
        <MobileNavAppBar lng={lng} mobileContent={scheduleMobileNav} />
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <MobileNavAppBar lng={lng} mobileContent={scheduleMobileNav} />
      <Box sx={{ padding: "0 8px" }}>
        {!isLandscape ? (
          <PortraitScheduleList
            weeks={weeks}
            containerRef={containerRef}
            weekRefs={weekRefs}
            assignmentsByDate={assignmentsByDate}
            periodDates={periodDates}
            shifts={shifts}
            today={today}
            setActiveAssignment={setActiveAssignment}
            setSheetOpen={setSheetOpen}
            onScroll={handleScroll}
          />
        ) : (
          <LandscapeWeeklyCalendar
            currentWeek={currentWeek}
            assignmentsByDate={assignmentsByDate}
            shifts={shifts}
            selectedWorkerId={selectedWorkerId}
            today={today}
            setActiveAssignment={setActiveAssignment}
            setSheetOpen={setSheetOpen}
            onWeekChange={handleWeekChange}
          />
        )}

        <Fab
          color="primary"
          aria-label="create-assignment"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={() => {
            setActiveAssignment(null);
            setSheetOpen(true);
          }}
        >
          <AddIcon />
        </Fab>

        <MobileAssignmentSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          assignment={activeAssignment}
        />
      </Box>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="mobile-worker-select-label">
              {t("worker") || "Worker"}
            </InputLabel>
            <Select
              labelId="mobile-worker-select-label"
              value={selectedWorkerId || ""}
              label={t("worker") || "Worker"}
              onChange={(e) => setSelectedWorkerId(String(e.target.value))}
            >
              {workers.map((w: any) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// CAROUSEL LOGIC FOR LANDSCAPE WEEKLY CALENDAR

// // Find current week for landscape view and adjacent weeks for carousel
//   const carouselWeeks = useMemo((): [
//     {
//       week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
//       assignmentsByDate: Map<string, any[]>;
//     },
//     {
//       week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
//       assignmentsByDate: Map<string, any[]>;
//     },
//     {
//       week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
//       assignmentsByDate: Map<string, any[]>;
//     }
//   ] => {
//     const currentWeekIndex = weeks.findIndex(
//       (w) =>
//         periodStart.isSameOrAfter(w.start, "day") &&
//         periodStart.isSameOrBefore(w.end, "day")
//     );

//     // Filter assignments for a given week
//     const filterAssignmentsForWeek = (week: {
//       start: dayjs.Dayjs;
//       end: dayjs.Dayjs;
//     }) => {
//       const weekMap = new Map<string, any[]>();
//       let current = week.start;
//       while (current.isSameOrBefore(week.end, "day")) {
//         const dateKey = current.format("YYYY-MM-DD");
//         weekMap.set(dateKey, assignmentsByDate.get(dateKey) || []);
//         current = current.add(1, "day");
//       }
//       return weekMap;
//     };

//     if (currentWeekIndex === -1 || weeks.length < 3) {
//       // Fallback: use first 3 weeks if current not found or not enough weeks
//       const week0 = weeks[0] || {
//         start: periodStart.startOf("isoWeek"),
//         end: periodStart.startOf("isoWeek").add(6, "day"),
//       };
//       const week1 = weeks[1] || {
//         start: periodStart.startOf("isoWeek").add(1, "week"),
//         end: periodStart.startOf("isoWeek").add(1, "week").add(6, "day"),
//       };
//       const week2 = weeks[2] || {
//         start: periodStart.startOf("isoWeek").add(2, "week"),
//         end: periodStart.startOf("isoWeek").add(2, "week").add(6, "day"),
//       };

//       return [
//         { week: week0, assignmentsByDate: filterAssignmentsForWeek(week0) },
//         { week: week1, assignmentsByDate: filterAssignmentsForWeek(week1) },
//         { week: week2, assignmentsByDate: filterAssignmentsForWeek(week2) },
//       ];
//     }

//     // Get prev, current, next weeks
//     const prevWeek = weeks[currentWeekIndex - 1] || weeks[currentWeekIndex];
//     const currentWeek = weeks[currentWeekIndex];
//     const nextWeek = weeks[currentWeekIndex + 1] || weeks[currentWeekIndex];

//     return [
//       { week: prevWeek, assignmentsByDate: filterAssignmentsForWeek(prevWeek) },
//       {
//         week: currentWeek,
//         assignmentsByDate: filterAssignmentsForWeek(currentWeek),
//       },
//       { week: nextWeek, assignmentsByDate: filterAssignmentsForWeek(nextWeek) },
//     ];
//   }, [weeks, periodStart, assignmentsByDate]);
