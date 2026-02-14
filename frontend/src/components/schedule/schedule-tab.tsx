import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MobileScheduleTab from "./mobile/mobile-schedule-tab";
// Hooks
import { useIsMobile } from "@/hooks/useIsMobile";
// Components
import BreachList from "./lhs-tabs/breach-list";
import QuickStaffingTable from "./lhs-tabs/quick-staffing";
import QuickStatsTable from "./lhs-tabs/quick-stats";
import ScheduleDisplay from "./table/schedule-display";
import ScheduleNavBar from "./nav-bar/schedule-nav-bar";
import LHSTab from "./lhs-tabs/lhs-tab";
import ScheduleItemDialog from "./dialogs/schedule-item-dialog";
import {
  ScheduleItemType,
  DialogMode,
  ScheduleItemDialogData,
  CreateAssignmentData,
  CreateDemandData,
  CreateRequestData,
} from "./dialogs/schedule-item-types";
import NoAssignmentsDisplay from "./no-assignments-display";
import { buildAssignmentsDataByOwnerAndDate } from "./table/shared/assignment-utils";
import { getPeriodStartEndDates } from "./schedule-utils";
import { computePeriodEndDate } from "../../app/lib/utils/scheduleViewSettingsUtils";
// Skeletons
import ScheduleSelectorSkeleton from "../skeletons/schedule-selector-skeleton";
import ScheduleTableSkeleton from "../skeletons/schedule-table-skeleton";
// Actions
import { useGetStats } from "../../hooks/useStats";
import { useGetBreaches } from "../../hooks/useBreach";
import { useGetSpecialties } from "../../hooks/useSpecialty";
// Assignment Hooks
import {
  useAddAssignmentAndRecurrence,
  useUpdateAssignmentAndRecurrence,
  useDeleteAssignment,
} from "../../hooks/useAssignment";
import {
  useAssignmentsByPeriod,
  assignmentsQueryKeys,
} from "../../app/lib/hooks/useAssignments";
import {
  calculateBufferMonths,
  shouldFetchMore,
} from "../../app/lib/utils/assignmentBufferUtils";
// Request Hooks
import {
  useGetRequests,
  useAddRequest,
  useUpdateRequest,
  useDeleteRequest,
  useRescindRequest,
  useAcceptRequest,
  useDenyRequest,
} from "../../hooks/useRequest";
// Hooks
import {
  useValidateSchedule,
  useUpdateSchedule,
  useGetSchedules,
  useGetScheduleEntities,
  useGetScheduleLHSData,
  useDuplicatePeriod,
} from "../../hooks/useSchedule";
import { useExportSchedule } from "../../hooks/useExport";
import { useUserWorker } from "../../hooks/useUserWorker";
import Alert from "@mui/material/Alert";
// Styles
import "../../styles/tab-container-styles.css";
import "./schedule-tab.css";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import {
  ScheduleT,
  ExportOptionsT,
  ScheduleStatus,
  LHSTabContentT,
  periodDateT,
  DuplicateRequestT,
  AssignmentDataT,
  ScheduleCellDataT,
  DuplicateResultT,
} from "../../types/schedule";
import { BreachT } from "@/types/breach";
import { TeamMembershipRole } from "@/types/team";
import {
  ShiftDemandCreateDTO,
  ShiftDemandUpdateDTO,
} from "@/types/shiftDemand";
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
  CreateAssignmentT,
} from "@/types/assignment";
import { RequestT } from "../../types/request";
import {
  StatsT,
  StatsOptionsT,
  StatsTimeFrameOptions,
  StatsUnitOptions,
  HeaderUnitOptions,
} from "../../types/stats";
import { AttributeOwnerType } from "../../types/attribute";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
import { SpecialtyT } from "@/types/specialty";
import { TeamWithMembership } from "@/types/team";
import { SolveTaskStatusResponseT } from "@/types/solveTaskStatus";
import {
  useShiftDemands,
  useShiftDemandMutations,
} from "../../app/lib/hooks/useShiftDemands";
import { useScheduleViewSettings } from "../../app/lib/hooks/useScheduleViewSettings";
import { getDefaultScheduleViewSettings } from "../../app/lib/utils/scheduleViewSettingsUtils";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function ScheduleTab({
  lng,
  teamWithMembership,
}: {
  lng: string;
  teamWithMembership: TeamWithMembership;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  // Query client for manual cache operations (prefetching)
  const queryClient = useQueryClient();

  // Stats hook
  const getStats = useGetStats();

  // Data hooks for owner-only data
  const getBreaches = useGetBreaches();
  const getSpecialties = useGetSpecialties();
  const getRequests = useGetRequests();

  // Schedule hooks
  const validateSchedule = useValidateSchedule();
  const updateSchedule = useUpdateSchedule();
  const getSchedules = useGetSchedules();
  const getScheduleEntities = useGetScheduleEntities();
  const getScheduleLHSData = useGetScheduleLHSData();
  const duplicatePeriod = useDuplicatePeriod();
  const exportSchedule = useExportSchedule();

  // Assignment hooks
  const addAssignmentAndRecurrence = useAddAssignmentAndRecurrence();
  const updateAssignmentAndRecurrence = useUpdateAssignmentAndRecurrence();
  const deleteAssignment = useDeleteAssignment();

  // Request hooks
  const addRequest = useAddRequest();
  const updateRequest = useUpdateRequest();
  const deleteRequest = useDeleteRequest();
  const rescindRequest = useRescindRequest();
  const acceptRequest = useAcceptRequest();
  const denyRequest = useDenyRequest();

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

  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedulesValidated, setSchedulesValidated] = useState<ScheduleT[]>([]);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null,
  );
  const [breaches, setBreaches] = useState<BreachT[]>([]);
  const [stats, setStats] = useState<StatsT | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);

  // Use persistent schedule view settings
  const defaultSettings = getDefaultScheduleViewSettings(
    teamWithMembership.team.useSolver,
  );

  const [
    scheduleViewSettings,
    updateScheduleViewSettings,
    resetScheduleViewSettings,
  ] = useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  // resetScheduleViewSettings can be called to reset all settings to defaults
  // Example: resetScheduleViewSettings() - useful for settings reset UI

  // Calculate buffer range for smart assignment loading
  const bufferRange = useMemo(() => {
    const periodEnd = computePeriodEndDate(
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame,
    );
    return calculateBufferMonths(
      scheduleViewSettings.periodStartDate,
      periodEnd,
    );
  }, [scheduleViewSettings.periodStartDate, scheduleViewSettings.timeFrame]);

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
    undefined, // No worker filter for desktop view
    {
      enabled: !memberHasNoWorker, // Don't fetch if member has no worker
    },
  );

  // React Query hooks for shift demands - use dates from settings
  const {
    demands: shiftDemands,
    demandsById: shiftDemandsById,
    matrix: shiftDemandMatrix,
    isLoading: isLoadingShiftDemands,
    error: shiftDemandError,
  } = useShiftDemands(
    teamWithMembership.team.id,
    scheduleViewSettings.periodStartDate,
    computePeriodEndDate(
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame,
    ),
    {
      enabled:
        teamWithMembership.team.useSolver &&
        teamWithMembership.membership.role !== TeamMembershipRole.MEMBER,
      bufferDays: 7, // Load extra days for better UX
    },
  );

  // Mutation hooks for shift demands
  const shiftDemandMutations = useShiftDemandMutations(
    teamWithMembership.team.id,
  );

  const getScheduleFromDate = useCallback(
    (date: dayjs.Dayjs) => {
      if (scheduleCampaign) {
        if (
          date.isSameOrBefore(scheduleCampaign.endDate, "day") &&
          date.isSameOrAfter(scheduleCampaign.startDate, "day")
        ) {
          return scheduleCampaign;
        }
      }
      const validatedSchedule = schedulesValidated.find(
        (s) =>
          date.isSameOrBefore(s.endDate, "day") &&
          date.isSameOrAfter(s.startDate, "day"),
      );
      if (validatedSchedule) {
        return validatedSchedule;
      }
      return null;
    },
    [scheduleCampaign, schedulesValidated],
  );

  const buildDates = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      const dates: periodDateT[] = [];
      let currentDate = startDate;

      while (
        currentDate.isBefore(endDate) ||
        currentDate.isSame(endDate, "day")
      ) {
        const schedule = getScheduleFromDate(currentDate);
        dates.push({
          date: currentDate,
          scheduleId: schedule ? schedule.id : null,
          scheduleStatus: schedule ? schedule.status : null,
        });
        currentDate = currentDate.add(1, "day");
      }
      return dates;
    },
    [getScheduleFromDate],
  );

  // Compute periodDates from the centralized date state
  const periodDates = useMemo(
    () =>
      buildDates(
        scheduleViewSettings.periodStartDate,
        computePeriodEndDate(
          scheduleViewSettings.periodStartDate,
          scheduleViewSettings.timeFrame,
        ),
      ),
    [
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame,
      buildDates,
    ],
  );

  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  const [selectedQuickStatsTimeFrame, setSelectedQuickStatsTimeFrame] =
    useState<StatsTimeFrameOptions>(StatsTimeFrameOptions.CAMPAING);

  // Unified dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(DialogMode.CREATE);
  const [dialogType, setDialogType] = useState<ScheduleItemType>(
    ScheduleItemType.ASSIGNMENT,
  );
  const [dialogData, setDialogData] = useState<ScheduleItemDialogData>(null);

  const isMobile = useIsMobile();

  const toggleTab = (tabName: string) => {
    if (selectedTab === tabName) {
      setSelectedTab(null);
    } else {
      setSelectedTab(tabName);
    }
  };

  const handleAssignmentSelection = (selectedAssignment: AssignmentDataT) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.ASSIGNMENT);
    setDialogData({ assignmentData: selectedAssignment });
  };

  const handleDemandSelection = (
    selectedScheduleCellData: ScheduleCellDataT,
  ) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.DEMAND);
    setDialogData({ cellData: selectedScheduleCellData });
  };

  const handleRequestSelection = (request: RequestT) => {
    setDialogOpen(true);
    setDialogMode(DialogMode.EDIT);
    setDialogType(ScheduleItemType.REQUEST);
    setDialogData({ request });
  };

  // updateScheduleViewSettings is now provided by the useScheduleViewSettings hook

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    try {
      const newSchedule = await updateSchedule(schedule);
      setScheduleCampaign(newSchedule);
    } catch (error) {
      console.error("Failed to update schedule:", error);
      // Handle error appropriately
    }
  };

  const handleValidateSchedule = async (scheduleId: string) => {
    try {
      const newSchedule = await validateSchedule(
        scheduleId,
        teamWithMembership.team.id,
      );
      setScheduleCampaign(null);
      setSchedulesValidated([...schedulesValidated, newSchedule]);
      setBreaches([]);
    } catch (error) {
      console.error("Failed to validate schedule:", error);
      // Handle error appropriately
    }
  };

  const handleDuplicateResult = (duplicateResult: DuplicateResultT) => {
    if (duplicateResult.assignments) {
      updateAssignmentsAndRecurrencesStates(duplicateResult.assignments);
    }
    // Note: Shift demands will be automatically updated via React Query
    // when the duplicate operation affects shift demands
  };

  const handleSendDuplicateRequest = async (
    request: DuplicateRequestT,
    campaignId: string,
    teamId: string,
  ) => {
    try {
      const duplicateResult = await duplicatePeriod(
        request,
        campaignId,
        teamId,
      );
      handleDuplicateResult(duplicateResult);
      const newPeriodStart = request.targetPeriod.startDate.startOf("isoWeek");
      const newPeriodEnd = request.targetPeriod.startDate.endOf("isoWeek");
      updateSelectedPeriod(newPeriodStart, newPeriodEnd);
    } catch (error) {
      console.error("Failed to duplicate period:", error);
      // Handle error appropriately
    }
  };

  //////////////////////////
  // Shift Demand Actions (New Implementation)
  //////////////////////////

  const handleCreateShiftDemand = useCallback(
    async (
      shiftId: string,
      date: dayjs.Dayjs,
      count: number,
      notes?: string,
    ) => {
      try {
        const demandData: Omit<ShiftDemandCreateDTO, "teamId"> = {
          shiftId,
          date: date.unix(),
          count,
          notes: notes || null,
          source: "manual",
          sourceId: null,
        };

        await shiftDemandMutations.create.mutateAsync({ demand: demandData });

        // Update selected demand if applicable
        setSelectedTab("selection");

        // Note: React Query will handle state updates automatically
        // No need to manually update local state
      } catch (error) {
        console.error("Failed to create shift demand:", error);
        // Error handling will be managed by React Query
      }
    },
    [shiftDemandMutations],
  );

  const handleUpdateShiftDemand = useCallback(
    async (demandId: string, updates: Partial<ShiftDemandUpdateDTO>) => {
      try {
        // Get the updated shift demand from the mutation response
        const updatedShiftDemand =
          await shiftDemandMutations.update.mutateAsync({
            demandId,
            demand: updates,
          });
      } catch (error) {
        console.error("Failed to update shift demand:", error);
      }
    },
    [shiftDemandMutations],
  );

  const handleDeleteShiftDemand = useCallback(
    async (demandId: string) => {
      try {
        await shiftDemandMutations.delete.mutateAsync(demandId);
      } catch (error) {
        console.error("Failed to delete shift demand:", error);
      }
    },
    [shiftDemandMutations],
  );

  //////////////////////////
  // Request Actions
  //////////////////////////

  const handleAddRequest = useCallback(
    async (request: RequestT) => {
      try {
        const newRequest = await addRequest(
          request,
          teamWithMembership.team.id,
        );
        setRequests([...requests, newRequest]);
      } catch (error) {
        console.error("Failed to add request:", error);
      }
    },
    [addRequest, teamWithMembership.team.id, requests],
  );

  const handleUpdateRequest = useCallback(
    async (request: RequestT) => {
      try {
        const updatedRequest = await updateRequest(
          request,
          teamWithMembership.team.id,
        );
        setRequests(
          requests.map((r) =>
            r.id === updatedRequest.id ? updatedRequest : r,
          ),
        );
      } catch (error) {
        console.error("Failed to update request:", error);
      }
    },
    [updateRequest, teamWithMembership.team.id, requests],
  );

  const handleDeleteRequest = useCallback(
    async (requestId: string) => {
      try {
        await deleteRequest(requestId, teamWithMembership.team.id);
        setRequests(requests.filter((r) => r.id !== requestId));
      } catch (error) {
        console.error("Failed to delete request:", error);
      }
    },
    [deleteRequest, teamWithMembership.team.id, requests],
  );

  const handleRescindRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await rescindRequest(
          requestId,
          teamWithMembership.team.id,
        );
        const rescindedRequest = result.request;
        const assignmentsDeletedIds = result.assignmentsDeletedIds || [];

        setRequests((prev) =>
          prev.map((r) =>
            r.id === rescindedRequest.id ? rescindedRequest : r,
          ),
        );

        // React Query cache invalidation in the mutation hook handles assignment updates
      } catch (error) {
        console.error("Failed to rescind request:", error);
      }
    },
    [rescindRequest, teamWithMembership.team.id],
  );

  const handleAcceptRequest = useCallback(
    async (requestId: string) => {
      try {
        const result = await acceptRequest(
          requestId,
          teamWithMembership.team.id,
        );
        const acceptedRequest = result.request;
        const newAssignments = result.assignments || [];

        // Update requests list
        setRequests((prev) =>
          prev.map((r) => (r.id === acceptedRequest.id ? acceptedRequest : r)),
        );

        // React Query cache invalidation in the mutation hook handles assignment updates
      } catch (error) {
        console.error("Failed to accept request:", error);
      }
    },
    [acceptRequest, teamWithMembership.team.id],
  );

  const handleDenyRequest = useCallback(
    async (requestId: string) => {
      try {
        const deniedRequest = await denyRequest(
          requestId,
          teamWithMembership.team.id,
        );
        setRequests(
          requests.map((r) => (r.id === deniedRequest.id ? deniedRequest : r)),
        );
      } catch (error) {
        console.error("Failed to deny request:", error);
      }
    },
    [denyRequest, teamWithMembership.team.id, requests],
  );

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const updateAssignmentsAndRecurrencesStates = useCallback(
    (ARResult: AssignmentsRecurrencesResultT) => {
      // React Query cache invalidation in the mutation hooks handles updates automatically
      // This function is kept for backward compatibility but no longer updates local state
    },
    [],
  );

  const handleOpenCreateAssignment = useCallback(
    (createAssignmentData: CreateAssignmentT) => {
      setDialogOpen(true);
      setDialogMode(DialogMode.CREATE);
      setDialogType(ScheduleItemType.ASSIGNMENT);
      setDialogData({
        scheduleId: createAssignmentData.scheduleId,
        workerId: createAssignmentData.workerId,
        shiftId: createAssignmentData.shiftId,
        date: createAssignmentData.date,
        addDemandActive:
          !createAssignmentData.haveDemand &&
          scheduleViewSettings.groupBy === "shift",
      } as CreateAssignmentData);
    },
    [scheduleViewSettings.groupBy],
  );

  const handleCloseLHS = useCallback(() => {
    setSelectedTab(null);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogData(null);
  }, []);

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
      const ARResult = await updateAssignmentAndRecurrence(
        assignment,
        teamWithMembership.team.id,
        recurrence,
        recurrenceUpdateScope,
      );

      updateAssignmentsAndRecurrencesStates(ARResult);
    },
    [
      updateAssignmentAndRecurrence,
      teamWithMembership.team.id,
      updateAssignmentsAndRecurrencesStates,
    ],
  );

  const handleDeleteAssignment = useCallback(
    async (
      assignmentId: string,
      recurrenceId: string | null = null,
      recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
    ) => {
      const ARResult = await deleteAssignment(
        assignmentId,
        teamWithMembership.team.id,
        recurrenceId,
        recurrenceUpdateScope,
      );
      updateAssignmentsAndRecurrencesStates(ARResult);
    },
    [
      deleteAssignment,
      teamWithMembership.team.id,
      updateAssignmentsAndRecurrencesStates,
    ],
  );

  const updateSelectedPeriod = (
    newPeriodStart: dayjs.Dayjs,
    newPeriodEnd: dayjs.Dayjs,
  ) => {
    updateScheduleViewSettings({
      periodStartDate: newPeriodStart,
    });
    // No need to setPeriodDates since it's now computed
  };

  const handleToday = async () => {
    const newPeriodStart =
      scheduleViewSettings.timeFrame === "week"
        ? dayjs.utc().startOf("isoWeek")
        : scheduleViewSettings.timeFrame === "month"
          ? dayjs.utc().startOf("month")
          : dayjs.utc(); // Default to current time if neither "week" nor "month"
    const newPeriodEnd =
      scheduleViewSettings.timeFrame === "week"
        ? dayjs.utc().endOf("isoWeek")
        : scheduleViewSettings.timeFrame === "month"
          ? dayjs.utc().endOf("month")
          : dayjs.utc(); // Default to current time if neither "week" nor "month"
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handlePreviousPeriod = async () => {
    const isMonth = scheduleViewSettings.timeFrame === "month";
    const newPeriodStart = scheduleViewSettings.periodStartDate.subtract(
      1,
      isMonth ? "month" : "week",
    );
    const newPeriodEnd = computePeriodEndDate(
      newPeriodStart,
      scheduleViewSettings.timeFrame,
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);

    // Prefetch data for extended buffer if approaching edge
    const newBufferRange = calculateBufferMonths(newPeriodStart, newPeriodEnd);
    if (shouldFetchMore(bufferRange, newPeriodStart, newPeriodEnd)) {
      // Prefetch extended buffer in background
      queryClient.prefetchQuery({
        queryKey: assignmentsQueryKeys.byPeriod(
          teamWithMembership.team.id,
          newBufferRange.start,
          newBufferRange.end,
          includeCampaign,
          undefined,
        ),
      });
    }
  };

  const handleNextPeriod = async () => {
    const isMonth = scheduleViewSettings.timeFrame === "month";
    const newPeriodStart = scheduleViewSettings.periodStartDate.add(
      1,
      isMonth ? "month" : "week",
    );
    const newPeriodEnd = computePeriodEndDate(
      newPeriodStart,
      scheduleViewSettings.timeFrame,
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);

    // Prefetch data for extended buffer if approaching edge
    const newBufferRange = calculateBufferMonths(newPeriodStart, newPeriodEnd);
    if (shouldFetchMore(bufferRange, newPeriodStart, newPeriodEnd)) {
      // Prefetch extended buffer in background
      queryClient.prefetchQuery({
        queryKey: assignmentsQueryKeys.byPeriod(
          teamWithMembership.team.id,
          newBufferRange.start,
          newBufferRange.end,
          includeCampaign,
          undefined,
        ),
      });
    }
  };

  const handleChangeTimeFrame = async (newTimeFrame: "week" | "month") => {
    console.log("Changing time frame to:", newTimeFrame);

    // Step 1: Get the new period dates using the NEW timeFrame
    const { firstDate: newPeriodStart, lastDate: newPeriodEnd } =
      getPeriodStartEndDates(
        newTimeFrame,
        scheduleViewSettings.periodStartDate,
        computePeriodEndDate(
          scheduleViewSettings.periodStartDate,
          newTimeFrame,
        ),
      );

    // Step 2: Update schedule view settings with both new timeFrame and new start date
    updateScheduleViewSettings({
      timeFrame: newTimeFrame,
      periodStartDate: newPeriodStart,
    });
  };

  //////////////////////////
  // Stats Actions
  //////////////////////////

  const handleChangeStatsTimeFrame = async (
    timeFrame: StatsTimeFrameOptions,
  ) => {
    const newStatsOptions = {
      timeFrame,
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
      headerUnit: HeaderUnitOptions.WEEK,
      selectedShifts: [],
      showFavorites: true,
    };
    const newStats = await getStats(
      teamWithMembership.team.id,
      newStatsOptions,
    );
    setStats(newStats);
    setSelectedQuickStatsTimeFrame(timeFrame);
  };

  //////////////////////////
  // Export Actions
  //////////////////////////

  const handleExportSchedule = async (exportOptions: ExportOptionsT) => {
    try {
      await exportSchedule(teamWithMembership.team.id, exportOptions);
    } catch (error) {
      console.error("Failed to export schedule:", error);
      // Handle error appropriately
    }
  };

  //////////////////////////
  // SQS Solve Actions
  //////////////////////////

  const handleSqsSolveComplete = useCallback(
    (result: SolveTaskStatusResponseT) => {
      console.log("SQS Solve completed, updating schedule data...");

      if (result.result) {
        const {
          assignments: newAssignments,
          breaches: newBreaches,
          requests: newRequests,
        } = result.result;

        // Update schedule campaign (use existing scheduleCampaign as the schedule itself doesn't change structure)
        // The solve status will be reflected in the campaign state
        if (scheduleCampaign) {
          const updatedSchedule = {
            ...scheduleCampaign,
            // Update any schedule-level properties if needed
          };
          setScheduleCampaign(updatedSchedule);
        }

        // Update assignments for the scheduleCampaign period
        // React Query cache invalidation handles assignment updates automatically
        // Manually invalidate to refresh the assignments view
        if (newAssignments && scheduleCampaign) {
          queryClient.invalidateQueries({
            queryKey: assignmentsQueryKeys.teams(teamWithMembership.team.id),
          });
        }

        // Update breaches
        if (newBreaches) {
          setBreaches(newBreaches);
        }

        // Update requests
        if (newRequests) {
          setRequests((prev) =>
            prev.map(
              (r) => newRequests.find((nr: RequestT) => nr.id === r.id) || r,
            ),
          );
        }
      }
    },
    [scheduleCampaign, teamWithMembership.team.id, queryClient],
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingSchedule(true);

      try {
        // Fetch schedules
        const fetchedSchedule = await getSchedules(teamWithMembership.team.id);
        setScheduleCampaign(
          fetchedSchedule.find(
            (s: ScheduleT) => s.status === ScheduleStatus.CAMPAIGN,
          ) || null,
        );
        setSchedulesValidated(
          fetchedSchedule.filter(
            (s: ScheduleT) => s.status === ScheduleStatus.VALIDATED,
          ),
        );
        setIsLoadingSchedule(false);

        // Fetch entities (shifts and workers) - assignments now loaded via React Query
        const { workers: fetchedWorkers, shifts: fetchedShifts } =
          await getScheduleEntities(teamWithMembership.team.id);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);

        // Fetch requests (needed for both members and owners)
        const fetchedRequests = await getRequests(teamWithMembership.team.id);
        setRequests(fetchedRequests);

        // Fetch owner-only data conditionally
        if (teamWithMembership.membership.role !== TeamMembershipRole.MEMBER) {
          // Prepare stats options
          const statsOptions: StatsOptionsT = {
            timeFrame: StatsTimeFrameOptions.CAMPAING,
            startDate: dayjs.utc().startOf("day").subtract(1, "year"),
            endDate: dayjs.utc().startOf("day"),
            statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
            headerUnit: HeaderUnitOptions.WEEK,
            selectedShifts: [],
            showFavorites: true,
          };

          const [fetchedBreaches, fetchedStats, fetchedSpecialties] =
            await Promise.all([
              getBreaches(teamWithMembership.team.id),
              getStats(teamWithMembership.team.id, statsOptions),
              getSpecialties(teamWithMembership.team.id),
            ]);
          setBreaches(fetchedBreaches);
          setStats(fetchedStats);
          setSpecialties(fetchedSpecialties);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchData();
  }, [
    teamWithMembership,
    getSchedules,
    getScheduleEntities,
    getRequests,
    getBreaches,
    getStats,
    getSpecialties,
  ]);

  // Filter tabs based on user role - members don't see owner-only tabs
  const isOwner =
    teamWithMembership.membership.role !== TeamMembershipRole.MEMBER;

  const allLhsTabContent: LHSTabContentT[] = [
    {
      name: "breaches",
      label: t("breaches"),
      content: (
        <BreachList lng={lng} breaches={breaches} onClose={handleCloseLHS} />
      ),
      ownerOnly: true,
    },
    {
      name: "quick_staffing",
      label: t("quick_staffing"),
      content: scheduleCampaign ? (
        <QuickStaffingTable
          lng={lng}
          shifts={shifts.filter((s) => !s.deleted)}
          workers={workers.filter((w) => !w.deleted)}
          assignments={assignments}
          schedule={scheduleCampaign as ScheduleT}
          onClose={handleCloseLHS}
          handleUpdateSchedule={handleUpdateSchedule}
        />
      ) : null,
      ownerOnly: true,
    },
    {
      name: "quick_stats",
      label: t("quick_stats"),
      content: stats ? (
        <QuickStatsTable
          lng={lng}
          shifts={shifts.filter((s) => !s.deleted)}
          workers={workers.filter((w) => !w.deleted)}
          stats={stats}
          selectedQuickStatsTimeFrame={selectedQuickStatsTimeFrame}
          onClose={handleCloseLHS}
          handleChangeStatsTimeFrame={handleChangeStatsTimeFrame}
        />
      ) : null,
      ownerOnly: true,
    },
  ];

  // Filter tabs based on role
  const lhsTabContent: LHSTabContentT[] = allLhsTabContent.filter(
    (tab) => isOwner || !tab.ownerOnly,
  );

  if (isMobile) {
    return (
      <MobileScheduleTab lng={lng} teamWithMembership={teamWithMembership} />
    );
  }

  if (memberHasNoWorker) {
    return (
      <div
        className="tab-container-ultrawide"
        data-testid="schedule-page-heading"
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            p: 4,
          }}
        >
          <Alert
            severity="info"
            sx={{ maxWidth: "600px" }}
            data-testid="no-worker-profile-alert"
          >
            <Typography variant="body1">
              {t("error_no_worker_assigned")}
            </Typography>
          </Alert>
        </Box>
      </div>
    );
  }

  return (
    <div
      className="tab-container-ultrawide"
      data-testid="schedule-page-heading"
    >
      <div>
        {isLoadingSchedule ? (
          <div className="container-schedule-selector-skeleton">
            <ScheduleSelectorSkeleton />
          </div>
        ) : (
          <ScheduleNavBar
            lng={lng}
            teamWithMembership={teamWithMembership}
            currentPeriodStart={scheduleViewSettings.periodStartDate}
            currentPeriodEnd={computePeriodEndDate(
              scheduleViewSettings.periodStartDate,
              scheduleViewSettings.timeFrame,
            )}
            scheduleCampaign={scheduleCampaign}
            scheduleViewSettings={scheduleViewSettings}
            handleToday={handleToday}
            handlePreviousPeriod={handlePreviousPeriod}
            handleNextPeriod={handleNextPeriod}
            handleValidateSchedule={handleValidateSchedule}
            handleSendDuplicateRequest={handleSendDuplicateRequest}
            updateScheduleViewSettings={updateScheduleViewSettings}
            handleChangeTimeFrame={handleChangeTimeFrame}
            handleOpenLHS={setSelectedTab}
            useSqsWorkflow={true}
            onSqsSolveComplete={handleSqsSolveComplete}
          />
        )}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <LHSTab
            teamWithMembership={teamWithMembership}
            tabContent={lhsTabContent}
            selectedTab={selectedTab}
            toggleTab={toggleTab}
          />
          {isLoadingAssignments ||
          (teamWithMembership.team.useSolver && isLoadingShiftDemands) ? (
            <ScheduleTableSkeleton />
          ) : assignments.length === 0 &&
            requests.length === 0 &&
            shiftDemands.length === 0 ? (
            <NoAssignmentsDisplay
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleId={null}
              workers={workers}
              shifts={shifts}
              handleCreateAssignment={handleCreateAssignment}
              handleCreateShiftDemand={handleCreateShiftDemand}
            />
          ) : (
            <ScheduleDisplay
              lng={lng}
              teamWithMembership={teamWithMembership}
              scheduleCampaign={scheduleCampaign as ScheduleT}
              periodDates={periodDates}
              assignments={assignments}
              shiftDemands={shiftDemands}
              recurrences={recurrences}
              breaches={breaches}
              workers={workers}
              shifts={shifts}
              requests={requests}
              scheduleViewSettings={scheduleViewSettings}
              handleAssignmentSelection={handleAssignmentSelection}
              handleDemandSelection={handleDemandSelection}
              handleRequestSelection={handleRequestSelection}
              handleExportSchedule={handleExportSchedule}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          )}
        </div>

        <ScheduleItemDialog
          lng={lng}
          open={dialogOpen}
          onClose={handleCloseDialog}
          mode={dialogMode}
          selectedType={dialogType}
          dialogData={dialogData}
          teamId={teamWithMembership.team.id}
          scheduleId={scheduleCampaign?.id ?? null}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts.filter((s) => !s.deleted)}
          schedules={[
            ...(scheduleCampaign ? [scheduleCampaign] : []),
            ...schedulesValidated,
          ]}
          specialties={specialties}
          shiftOptions={[]}
          userWorkerId={null}
          userTeamRole={teamWithMembership.membership.role}
          useSolver={teamWithMembership.team.useSolver}
          handleCreateAssignment={handleCreateAssignment}
          handleUpdateAssignment={handleUpdateAssignment}
          handleDeleteAssignment={handleDeleteAssignment}
          handleCreateShiftDemand={handleCreateShiftDemand}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
          handleAddRequest={handleAddRequest}
          handleUpdateRequest={handleUpdateRequest}
          handleDeleteRequest={handleDeleteRequest}
          handleRescindRequest={handleRescindRequest}
          handleAcceptRequest={handleAcceptRequest}
          handleDenyRequest={handleDenyRequest}
        />
      </div>
    </div>
  );
}
