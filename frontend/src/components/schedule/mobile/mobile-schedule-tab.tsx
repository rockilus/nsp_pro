import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
// Hooks
import { useIsLandscape } from "@/hooks/useIsMobile";
import {
  useGetScheduleAssignmentsData,
  useGetScheduleAssignmentsDataNoSolver,
} from "../../../hooks/useSchedule";
import { useScheduleViewSettings } from "../../../app/lib/hooks/useScheduleViewSettings";
import { getDefaultScheduleViewSettings } from "../../../app/lib/utils/scheduleViewSettingsUtils";
import { computePeriodEndDate } from "../../../app/lib/utils/scheduleViewSettingsUtils";
// Types
import { TeamWithMembership } from "@/types/team";
import { ShiftRestType } from "@/types/shift";
// Local components
import AssignmentDialog from "../assignment-dialog";
import MobileNavAppBar from "../../app-bar/mobile-nav-app-bar";
import MobileScheduleNav from "./mobile-schedule-nav";
import MobileScheduleSettings from "./mobile-schedule-settings";
import MobileWorkerSchedule from "./mobile-worker-schedule";
import MobileTeamSchedule from "./mobile-team-schedule";

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<string>("");

  const isLandscape = useIsLandscape();

  // Ref to store the scrollToToday handler from child component
  const scrollToTodayRef = React.useRef<(() => void) | null>(null);

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

          // Set default worker if none selected or selected worker doesn't exist
          if (
            workers.length > 0 &&
            (!scheduleViewSettings.mobileSelectedWorkerId ||
              !workers.find(
                (w: any) => w.id === scheduleViewSettings.mobileSelectedWorkerId
              ))
          ) {
            // If member, try to preselect user's worker
            const userId =
              (teamWithMembership as any).membership?.userId || null;
            const memberWorker = userId
              ? workers.find((w: any) => w.userId === userId)
              : null;
            const defaultWorkerId =
              (memberWorker && memberWorker.id) || workers[0].id;
            updateScheduleViewSettings({
              mobileSelectedWorkerId: defaultWorkerId,
            });
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

          // Set default worker if none selected or selected worker doesn't exist
          if (
            workers.length > 0 &&
            (!scheduleViewSettings.mobileSelectedWorkerId ||
              !workers.find(
                (w: any) => w.id === scheduleViewSettings.mobileSelectedWorkerId
              ))
          ) {
            updateScheduleViewSettings({
              mobileSelectedWorkerId: workers[0].id,
            });
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
  }, [teamWithMembership, scheduleViewSettings.mobileSelectedWorkerId]);

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
    if (!scheduleViewSettings.mobileSelectedWorkerId) return map;

    for (const a of assignments) {
      if (a.workerId !== scheduleViewSettings.mobileSelectedWorkerId) continue;

      const shift = shifts.find((s: any) => s.id === a.shiftId);
      if (shift.restType === ShiftRestType.RECUPERATION) continue; // skip recuperation shifts

      const key = dayjs(a.date).utc().format("YYYY-MM-DD");
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }

    return map;
  }, [assignments, scheduleViewSettings.mobileSelectedWorkerId, shifts]);

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

  // Handle "scroll to today" button click
  const handleScrollToToday = () => {
    if (scrollToTodayRef.current) {
      scrollToTodayRef.current();
    }
  };

  // Build mobile navigation content that fills space between hamburger and avatar
  const scheduleMobileNav = (
    <MobileScheduleNav
      visibleMonth={visibleMonth}
      onSettingsClick={() => setSettingsOpen(true)}
      onTodayClick={handleScrollToToday}
      lng={lng}
    />
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
      <Box sx={{ padding: "0 8px", height: "calc(100vh - 64px)" }}>
        {scheduleViewSettings.mobileSelectedView === "worker" ? (
          <MobileWorkerSchedule
            weeks={weeks}
            currentWeek={currentWeek}
            assignmentsByDate={assignmentsByDate}
            periodDates={periodDates}
            shifts={shifts}
            selectedWorkerId={
              scheduleViewSettings.mobileSelectedWorkerId ?? null
            }
            today={today}
            isLandscape={isLandscape}
            setActiveAssignment={setActiveAssignment}
            setSheetOpen={setSheetOpen}
            periodStart={periodStart}
            scheduleViewSettings={scheduleViewSettings}
            updateScheduleViewSettings={updateScheduleViewSettings}
            onVisibleMonthChange={setVisibleMonth}
            onScrollToTodayReady={(handler) => {
              scrollToTodayRef.current = handler;
            }}
          />
        ) : (
          <MobileTeamSchedule
            lng={lng}
            weeks={weeks}
            today={today}
            assignments={assignments}
            workers={workers}
            shifts={shifts}
            setActiveAssignment={setActiveAssignment}
            setSheetOpen={setSheetOpen}
            onVisibleMonthChange={setVisibleMonth}
            onScrollToTodayReady={(handler) => {
              scrollToTodayRef.current = handler;
            }}
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

        <AssignmentDialog
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          assignment={activeAssignment}
          shift={
            activeAssignment
              ? shifts.find((s) => s.id === activeAssignment.shiftId)
              : null
          }
          worker={
            activeAssignment
              ? workers.find((w) => w.id === activeAssignment.workerId)
              : null
          }
        />
      </Box>

      <MobileScheduleSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        workers={workers}
        selectedWorkerId={scheduleViewSettings.mobileSelectedWorkerId ?? null}
        onWorkerChange={(workerId) =>
          updateScheduleViewSettings({ mobileSelectedWorkerId: workerId })
        }
        selectedView={scheduleViewSettings.mobileSelectedView || "worker"}
        onViewChange={(view) =>
          updateScheduleViewSettings({ mobileSelectedView: view })
        }
        lng={lng}
      />
    </>
  );
}
