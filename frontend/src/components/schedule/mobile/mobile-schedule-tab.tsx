import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
// Hooks
import { useIsLandscape } from "@/hooks/useIsMobile";
import { useGetScheduleEntities } from "../../../hooks/useSchedule";
import { useAssignmentsByPeriod } from "../../../app/lib/hooks/useAssignments";
import { useScheduleViewSettings } from "../../../app/lib/hooks/useScheduleViewSettings";
import { getDefaultScheduleViewSettings } from "../../../app/lib/utils/scheduleViewSettingsUtils";
import { computePeriodEndDate } from "../../../app/lib/utils/scheduleViewSettingsUtils";
import { calculateMobileBufferMonths } from "../../../app/lib/utils/assignmentBufferUtils";
import {
  useAddAssignmentAndRecurrence,
  useUpdateAssignmentAndRecurrence,
  useDeleteAssignment,
} from "../../../hooks/useAssignment";
// Types
import { TeamWithMembership, TeamMembershipRole } from "@/types/team";
import { ShiftRestType } from "@/types/shift";
import { AssignmentT, AssignmentsRecurrencesResultT } from "@/types/assignment";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
// Local components
import ScheduleItemDialog from "../dialogs/schedule-item-dialog";
import { ScheduleItemType, DialogMode } from "../dialogs/schedule-item-types";
import MobileNavAppBar from "../../app-bar/mobile-nav-app-bar";
import MobileScheduleNav from "./mobile-schedule-nav";
import MobileScheduleSettings from "./mobile-schedule-settings";
import MobileWorkerSchedule from "./mobile-worker-schedule";
import MobileTeamSchedule from "./mobile-team-schedule";
import { useUserWorker } from "../../../hooks/useUserWorker";
import { RoleBased } from "../../access/role-based";

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
    teamWithMembership.team.useSolver,
  );

  const [scheduleViewSettings, updateScheduleViewSettings] =
    useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  const getScheduleEntities = useGetScheduleEntities();

  // Assignment mutation hooks
  const addAssignmentAndRecurrence = useAddAssignmentAndRecurrence();
  const updateAssignmentAndRecurrence = useUpdateAssignmentAndRecurrence();
  const deleteAssignment = useDeleteAssignment();

  // Fetch user's worker for role-based checks (only for members)
  const {
    data: userWorker,
    isLoading: isLoadingUserWorker,
    error: userWorkerError,
  } = useUserWorker(
    teamWithMembership.team.id,
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER,
  );

  // Check if member has no worker association
  const memberHasNoWorker =
    teamWithMembership.membership.role === TeamMembershipRole.MEMBER &&
    !isLoadingUserWorker &&
    userWorker === null;

  // Calculate buffer range for mobile (extended to cover ±8 weeks visible range)
  const bufferRange = useMemo(() => {
    return calculateMobileBufferMonths(
      scheduleViewSettings.periodStartDate,
      8, // ±8 weeks radius
    );
  }, [scheduleViewSettings.periodStartDate]);

  // Determine if user should see campaign assignments (owners/leaders only)
  const includeCampaign =
    teamWithMembership.membership.role !== TeamMembershipRole.MEMBER;

  // React Query hook for assignments with smart buffering
  const {
    assignments,
    recurrences,
    isLoading: isLoadingAssignments,
    isFetching: isFetchingAssignments,
    error: assignmentsError,
  } = useAssignmentsByPeriod(
    teamWithMembership.team.id,
    bufferRange.start,
    bufferRange.end,
    includeCampaign,
    scheduleViewSettings.mobileSelectedWorkerId || undefined, // Filter by selected worker
    {
      enabled: !memberHasNoWorker, // Don't fetch if member has no worker
    },
  );

  const [isLoading, setIsLoading] = useState(true);
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
        // Check if member has no worker association
        if (
          teamWithMembership.membership.role === TeamMembershipRole.MEMBER &&
          !isLoadingUserWorker &&
          userWorker === null
        ) {
          if (mounted) setIsLoading(false);
          return;
        }

        // Fetch entities (shifts and workers) - assignments now loaded via React Query
        const { workers, shifts } = await getScheduleEntities(
          teamWithMembership.team.id,
        );
        if (!mounted) return;
        setWorkers(workers);
        setShifts(shifts);

        // Set default worker if none selected or selected worker doesn't exist
        if (
          workers.length > 0 &&
          (!scheduleViewSettings.mobileSelectedWorkerId ||
            !workers.find(
              (w: any) => w.id === scheduleViewSettings.mobileSelectedWorkerId,
            ))
        ) {
          // If member, try to preselect user's worker
          const userId = (teamWithMembership as any).membership?.userId || null;
          const memberWorker = userId
            ? workers.find((w: any) => w.userId === userId)
            : null;
          const defaultWorkerId =
            (memberWorker && memberWorker.id) || workers[0].id;
          updateScheduleViewSettings({
            mobileSelectedWorkerId: defaultWorkerId,
          });
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
  }, [
    teamWithMembership,
    scheduleViewSettings.mobileSelectedWorkerId,
    isLoadingUserWorker,
    userWorker,
  ]);

  const periodStart = scheduleViewSettings.periodStartDate;
  const periodEnd = computePeriodEndDate(
    scheduleViewSettings.periodStartDate,
    scheduleViewSettings.timeFrame,
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
      periodStart.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY",
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
      if (!shift || shift.restType === ShiftRestType.RECUPERATION) continue; // skip if shift not found or recuperation

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
          periodStart.isSameOrBefore(w.end, "day"),
      ) || weeks[0]
    );
  }, [weeks, periodStart]);

  // Handle "scroll to today" button click
  const handleScrollToToday = () => {
    if (scrollToTodayRef.current) {
      scrollToTodayRef.current();
    }
  };

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const handleCreateAssignment = useCallback(
    async (
      assignment: AssignmentT,
      recurrence: RecurrenceRuleT | null = null,
    ) => {
      await addAssignmentAndRecurrence(assignment, recurrence);
      // React Query cache invalidation in the mutation hook handles updates automatically
    },
    [addAssignmentAndRecurrence],
  );

  const handleUpdateAssignment = useCallback(
    async (
      assignment: AssignmentT,
      recurrence: RecurrenceRuleT | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
    ) => {
      await updateAssignmentAndRecurrence(
        assignment,
        teamWithMembership.team.id,
        recurrence,
        recurrenceUpdateScope,
      );
      // React Query cache invalidation in the mutation hook handles updates automatically
    },
    [updateAssignmentAndRecurrence, teamWithMembership.team.id],
  );

  const handleDeleteAssignment = useCallback(
    async (
      assignmentId: string,
      recurrenceId: string | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
    ) => {
      await deleteAssignment(
        assignmentId,
        teamWithMembership.team.id,
        recurrenceId,
        recurrenceUpdateScope,
      );
      // React Query cache invalidation in the mutation hook handles updates automatically
    },
    [deleteAssignment, teamWithMembership.team.id],
  );

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

  if (memberHasNoWorker) {
    return (
      <>
        <MobileNavAppBar lng={lng} mobileContent={scheduleMobileNav} />
        <Box
          data-testid="mobile-schedule-container"
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 128px)",
            p: 3,
          }}
        >
          <Alert
            data-testid="mobile-no-worker-profile-alert"
            severity="info"
            sx={{ maxWidth: "500px" }}
          >
            <Typography variant="body1">
              {t("error_no_worker_assigned")}
            </Typography>
          </Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      <MobileNavAppBar lng={lng} mobileContent={scheduleMobileNav} />
      <Box
        data-testid="mobile-schedule-container"
        sx={{ padding: "0 8px", height: "calc(100vh - 64px)" }}
      >
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
            lng={lng}
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

        <RoleBased
          role={teamWithMembership.membership.role}
          allowedRoles={[TeamMembershipRole.OWNER]}
        >
          <Fab
            data-testid="mobile-create-assignment-fab"
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
        </RoleBased>

        <ScheduleItemDialog
          lng={lng}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          mode={activeAssignment ? DialogMode.EDIT : DialogMode.CREATE}
          selectedType={ScheduleItemType.ASSIGNMENT}
          dialogData={
            activeAssignment
              ? {
                  assignmentData: {
                    assignment: activeAssignment,
                    worker:
                      workers.find((w) => w.id === activeAssignment.workerId) ||
                      null,
                    shift:
                      shifts.find((s) => s.id === activeAssignment.shiftId) ||
                      null,
                    breaches: [],
                    requests: [],
                    recurrence: null,
                  },
                }
              : {
                  scheduleId: null,
                  workerId: null,
                  shiftId: null,
                  date: null,
                }
          }
          teamId={teamWithMembership.team.id}
          scheduleId={null}
          workers={workers}
          shifts={shifts}
          schedules={[]}
          specialties={[]}
          shiftOptions={[]}
          userWorkerId={null}
          userTeamRole={teamWithMembership.membership.role}
          useSolver={teamWithMembership.team.useSolver}
          handleCreateAssignment={handleCreateAssignment}
          handleUpdateAssignment={handleUpdateAssignment}
          handleDeleteAssignment={handleDeleteAssignment}
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
        userRole={teamWithMembership.membership.role}
      />
    </>
  );
}
