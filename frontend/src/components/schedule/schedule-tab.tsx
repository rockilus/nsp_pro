import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import CurrentSelectionLHSTab from "./lhs-tabs/current-selection-lhs-tab";
import BreachList from "./lhs-tabs/breach-list";
import QuickStaffingTable from "./lhs-tabs/quick-staffing";
import QuickStatsTable from "./lhs-tabs/quick-stats";
import ScheduleDisplay from "./table/schedule-display";
import ScheduleNavBar from "./nav-bar/schedule-nav-bar";
import LHSTab from "./lhs-tabs/lhs-tab";
import CreateAssignment from "./lhs-tabs/create-assignment";
import { buildAssignmentsDataByOwnerAndDate } from "./table/shared/assignment-utils";
import { getPeriodStartEndDates } from "./schedule-utils";
import { computePeriodEndDate } from "../../app/lib/utils/scheduleViewSettingsUtils";
// Skeletons
import ScheduleSelectorSkeleton from "../skeletons/schedule-selector-skeleton";
import ScheduleTableSkeleton from "../skeletons/schedule-table-skeleton";
// Actions
import {
  solveSchedule,
  validateSchedule,
  updateSchedule,
  getSchedules,
  getScheduleAssignmentsData,
  getScheduleAssignmentsDataNoSolver,
  getScheduleLHSData,
  duplicatePeriod,
} from "../../app/lib/schedule";
import {
  addAssignmentAndRecurrence,
  updateAssignmentAndRecurrence,
  deleteAssignment,
} from "../../app/lib/assignment";
import { getStats } from "../../app/lib/stats";
import { exportSchedule } from "../../app/lib/export-schedule";
import { SSEManager } from "../../app/lib/sse";
import { USE_SQS_SOLVE } from "../../app/lib/env";
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
  SolveDetailsStatus,
  LHSTabContentT,
  periodDateT,
  DuplicateRequestT,
  AssignmentDataT,
  ScheduleCellDataT,
  DuplicateResultT,
} from "../../types/schedule";
import { BreachT } from "@/types/breach";
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
  StatsTimeFrameOptions,
  StatsUnitOptions,
  HeaderUnitOptions,
} from "../../types/stats";
import { AttributeOwnerType } from "../../types/attribute";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
import { SpecialtyT } from "@/types/specialty";
import { TeamWithMembership } from "@/types/team";
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

  console.log("USE_SQS_SOLVE:", USE_SQS_SOLVE);

  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(true);
  const [isLoadingAssignments, setIsLoadingAssignments] =
    useState<boolean>(true);
  const [isLoadingLHS, setIsLoadingLHS] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState(false);

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedulesValidated, setSchedulesValidated] = useState<ScheduleT[]>([]);
  const [scheduleCampaign, setScheduleCampaign] = useState<ScheduleT | null>(
    null
  );
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);
  const [recurrences, setRecurrences] = useState<RecurrenceRuleT[]>([]);
  const [breaches, setBreaches] = useState<BreachT[]>([]);
  const [stats, setStats] = useState<StatsT | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyT[]>([]);

  // Use persistent schedule view settings
  const defaultSettings = getDefaultScheduleViewSettings(
    teamWithMembership.team.useSolver
  );

  const [
    scheduleViewSettings,
    updateScheduleViewSettings,
    resetScheduleViewSettings,
  ] = useScheduleViewSettings(teamWithMembership.team.id, defaultSettings);

  // resetScheduleViewSettings can be called to reset all settings to defaults
  // Example: resetScheduleViewSettings() - useful for settings reset UI
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentDataT | null>(null);
  const [selectedDemand, setSelectedDemand] =
    useState<ScheduleCellDataT | null>(null);

  const [solveStatus, setSolveStatus] = useState<
    SolveDetailsStatus | null | "error"
  >(null);

  const hasConnectedRef = useRef(false);

  // React Query hooks for shift demands - use dates from settings
  const {
    demands: shiftDemands,
    demandsById: shiftDemandsById,
    matrix: shiftDemandMatrix,
    isLoading: isLoadingShiftDemands,
    error: shiftDemandError,
  } = useShiftDemands(
    teamWithMembership.team.id,
    scheduleViewSettings.periodStartDate.toDate(),
    computePeriodEndDate(
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame
    ).toDate(),
    {
      enabled: teamWithMembership.team.useSolver,
      bufferDays: 7, // Load extra days for better UX
    }
  );

  // Mutation hooks for shift demands
  const shiftDemandMutations = useShiftDemandMutations(
    teamWithMembership.team.id
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
          date.isSameOrAfter(s.startDate, "day")
      );
      if (validatedSchedule) {
        return validatedSchedule;
      }
      return null;
    },
    [scheduleCampaign, schedulesValidated]
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
    [getScheduleFromDate]
  );

  // Compute periodDates from the centralized date state
  const periodDates = useMemo(
    () =>
      buildDates(
        scheduleViewSettings.periodStartDate,
        computePeriodEndDate(
          scheduleViewSettings.periodStartDate,
          scheduleViewSettings.timeFrame
        )
      ),
    [
      scheduleViewSettings.periodStartDate,
      scheduleViewSettings.timeFrame,
      buildDates,
    ]
  );

  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [createAssignmentData, setCreateAssignmentData] =
    useState<CreateAssignmentT | null>(null);

  const [selectedQuickStatsTimeFrame, setSelectedQuickStatsTimeFrame] =
    useState<StatsTimeFrameOptions>(StatsTimeFrameOptions.CAMPAING);

  const toggleTab = (tabName: string) => {
    if (selectedTab === tabName) {
      setSelectedTab(null);
    } else {
      setSelectedTab(tabName);
    }
  };

  const handleAssignmentSelection = (selectedAssignment: AssignmentDataT) => {
    setSelectedAssignment(selectedAssignment);
    setSelectedDemand(null);
    setSelectedTab("selection");
  };

  const handleDemandSelection = (
    selectedScheduleCellData: ScheduleCellDataT
  ) => {
    setSelectedDemand(selectedScheduleCellData);
    setSelectedAssignment(null);
    setSelectedTab("selection");
  };

  // updateScheduleViewSettings is now provided by the useScheduleViewSettings hook

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    const newSchedule = await updateSchedule(schedule);
    setScheduleCampaign(newSchedule);
  };

  const handleSolveSchedule = async (scheduleId: string) => {
    const newSchedule = await solveSchedule(
      scheduleId,
      teamWithMembership.team.id
    );
    console.log("Connected to SSE in handleSolveSchedule...");

    if (newSchedule.solveDetails) {
      connectSSE(newSchedule.solveDetails.taskId, newSchedule.id);
    }
    setScheduleCampaign(newSchedule);
    // setAssignments((prev) => [
    //   ...prev.filter((a) => a.scheduleId !== scheduleId),
    //   ...newAssignments,
    // ]);
    // setBreaches(newBreaches);
    // setRequests((prev) =>
    //   prev.map((r) => newRequests.find((nr) => nr.id === r.id) || r)
    // );
    // setShifts((prev) =>
    //   prev
    //     .filter((s) => !newShifts.find((ns) => ns.id === s.id))
    //     .concat(newShifts)
    // );
  };

  const handleValidateSchedule = async (scheduleId: string) => {
    const newSchedule = await validateSchedule(
      scheduleId,
      teamWithMembership.team.id
    );
    setScheduleCampaign(null);
    setSchedulesValidated([...schedulesValidated, newSchedule]);
    setBreaches([]);
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
    teamId: string
  ) => {
    const duplicateResult = await duplicatePeriod(request, campaignId, teamId);
    handleDuplicateResult(duplicateResult);
    const newPeriodStart = request.targetPeriod.startDate.startOf("isoWeek");
    const newPeriodEnd = request.targetPeriod.startDate.endOf("isoWeek");
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  //////////////////////////
  // Shift Demand Actions (New Implementation)
  //////////////////////////

  const handleCreateShiftDemand = async (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
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
  };

  const handleUpdateShiftDemand = async (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>
  ) => {
    try {
      // Get the updated shift demand from the mutation response
      const updatedShiftDemand = await shiftDemandMutations.update.mutateAsync({
        demandId,
        demand: updates,
      });

      // Update selectedDemand with fresh data if it was the updated demand
      if (selectedDemand?.shiftDemandsData?.shiftDemand?.id === demandId) {
        if (updatedShiftDemand) {
          // Create updated ScheduleCellDataT with new shift demand data
          const updatedSelectedDemand: ScheduleCellDataT = {
            ...selectedDemand,
            shiftDemandsData: {
              ...selectedDemand.shiftDemandsData,
              shiftDemand: updatedShiftDemand,
            },
          };
          setSelectedDemand(updatedSelectedDemand);
        }
      }
    } catch (error) {
      console.error("Failed to update shift demand:", error);
    }
  };

  const handleDeleteShiftDemand = async (demandId: string) => {
    try {
      await shiftDemandMutations.delete.mutateAsync(demandId);

      // Clear selection if deleted demand was selected
      if (selectedDemand) {
        setSelectedDemand(null);
      }
    } catch (error) {
      console.error("Failed to delete shift demand:", error);
    }
  };

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const updateAssignmentsAndRecurrencesStates = (
    ARResult: AssignmentsRecurrencesResultT
  ) => {
    setAssignments((prev) => {
      let updatedAssignments = prev.map(
        (a) =>
          ARResult.assignmentsUpdated.find((updated) => updated.id === a.id) ||
          a
      );

      if (ARResult.assignmentsCreated.length > 0) {
        updatedAssignments = [
          ...updatedAssignments,
          ...ARResult.assignmentsCreated,
        ];
      }

      if (ARResult.assignmentsDeletedIds.length > 0) {
        updatedAssignments = updatedAssignments.filter(
          (a) => !ARResult.assignmentsDeletedIds.includes(a.id)
        );
      }

      return updatedAssignments;
    });

    setRecurrences((prev) => {
      let updatedRecurrences = [...prev];

      if (ARResult.recurrenceCreated) {
        updatedRecurrences = [
          ...updatedRecurrences,
          ARResult.recurrenceCreated,
        ];
      }

      if (ARResult.recurrenceUpdated) {
        updatedRecurrences = updatedRecurrences.map((recurrence) =>
          ARResult.recurrenceUpdated
            ? recurrence.id === ARResult.recurrenceUpdated.id
              ? ARResult.recurrenceUpdated
              : recurrence
            : recurrence
        );
      }

      if (ARResult.recurrencesDeletedIds.length > 0) {
        updatedRecurrences = updatedRecurrences.filter(
          (recurrence) =>
            !ARResult.recurrencesDeletedIds.includes(recurrence.id)
        );
      }

      return updatedRecurrences;
    });
  };

  const handleOpenCreateAssignment = (
    createAssignmentData: CreateAssignmentT
  ) => {
    setCreateAssignmentData(createAssignmentData);
    setSelectedTab("create_assignment");
  };

  const handleCloseLHS = () => {
    setCreateAssignmentData(null);
    setSelectedTab(null);
    setSelectedAssignment(null);
  };

  const handleCreateAssignment = async (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null = null
  ) => {
    const ARResult = await addAssignmentAndRecurrence(assignment, recurrence);
    setAssignments([...assignments, ...ARResult.assignmentsCreated]);
    if (ARResult.recurrenceCreated) {
      setRecurrences([...recurrences, ARResult.recurrenceCreated]);
    }
    setSelectedTab("selection");
    const assignDict = buildAssignmentsDataByOwnerAndDate(
      AttributeOwnerType.WORKER,
      [ARResult.assignmentsCreated[0]], // Feed only the first assignment
      recurrences,
      workers,
      shifts,
      breaches,
      requests
    );
    const newSelectedCell = Object.values(assignDict)[0][0];
    setSelectedAssignment(newSelectedCell);
    setCreateAssignmentData(null);
  };

  const handleUpdateAssignment = async (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null = null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null
  ) => {
    const ARResult = await updateAssignmentAndRecurrence(
      assignment,
      teamWithMembership.team.id,
      recurrence,
      recurrenceUpdateScope
    );

    updateAssignmentsAndRecurrencesStates(ARResult);

    const assignDict = buildAssignmentsDataByOwnerAndDate(
      AttributeOwnerType.WORKER,
      [ARResult.assignmentsUpdated[0]], // Feed only the first updated assignment
      recurrences,
      workers,
      shifts,
      breaches,
      requests
    );
    const newSelectedCell = Object.values(assignDict)[0][0];
    setSelectedAssignment(newSelectedCell);
    setSelectedTab("selection");
    setCreateAssignmentData(null);
  };

  const handleDeleteAssignment = async (
    assignmentId: string,
    recurrenceId: string | null = null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null
  ) => {
    const ARResult = await deleteAssignment(
      assignmentId,
      teamWithMembership.team.id,
      recurrenceId,
      recurrenceUpdateScope
    );
    updateAssignmentsAndRecurrencesStates(ARResult);
    setSelectedAssignment(null);
  };

  const updateSelectedPeriod = (
    newPeriodStart: dayjs.Dayjs,
    newPeriodEnd: dayjs.Dayjs
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
      isMonth ? "month" : "week"
    );
    const newPeriodEnd = computePeriodEndDate(
      newPeriodStart,
      scheduleViewSettings.timeFrame
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handleNextPeriod = async () => {
    const isMonth = scheduleViewSettings.timeFrame === "month";
    const newPeriodStart = scheduleViewSettings.periodStartDate.add(
      1,
      isMonth ? "month" : "week"
    );
    const newPeriodEnd = computePeriodEndDate(
      newPeriodStart,
      scheduleViewSettings.timeFrame
    );
    updateSelectedPeriod(newPeriodStart, newPeriodEnd);
  };

  const handleChangeTimeFrame = async (newTimeFrame: "week" | "month") => {
    console.log("Changing time frame to:", newTimeFrame);

    // Step 1: Get the new period dates using the NEW timeFrame
    const { firstDate: newPeriodStart, lastDate: newPeriodEnd } =
      getPeriodStartEndDates(
        newTimeFrame,
        scheduleViewSettings.periodStartDate,
        computePeriodEndDate(scheduleViewSettings.periodStartDate, newTimeFrame)
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
    timeFrame: StatsTimeFrameOptions
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
      newStatsOptions,
      teamWithMembership.team.id
    );
    setStats(newStats);
    setSelectedQuickStatsTimeFrame(timeFrame);
  };

  //////////////////////////
  // Export Actions
  //////////////////////////

  const handleExportSchedule = async (exportOptions: ExportOptionsT) => {
    await exportSchedule(teamWithMembership.team.id, exportOptions);
  };

  //////////////////////////
  // SSE Actions
  //////////////////////////

  const connectSSE = useCallback(
    (taskId?: string, scheduleId?: string) => {
      if (hasConnectedRef.current) return;

      setIsConnected(true);
      hasConnectedRef.current = true;

      const sseManager = new SSEManager();

      const handleTaskStatusEvent = (status: SolveDetailsStatus) => {
        setSolveStatus(status);
      };

      const handleOutputEventSuccessSolution = ({
        newSchedule,
        newAssignments,
        newBreaches,
        newRequests,
      }: {
        newSchedule: ScheduleT;
        newAssignments: AssignmentT[];
        newBreaches: BreachT[];
        newRequests: RequestT[];
      }) => {
        console.log("Updating schedule data...");

        setScheduleCampaign(newSchedule);
        setAssignments((prev) => [
          ...prev.filter((a) => a.scheduleId !== newSchedule.id),
          ...newAssignments,
        ]);
        setBreaches(newBreaches);
        setRequests((prev) =>
          prev.map((r) => newRequests.find((nr) => nr.id === r.id) || r)
        );
        setSolveStatus(SolveDetailsStatus.SUCCESS);
        // Disconnect from SSE after receiving the data
        sseManager.close();
        setIsConnected(false);
        hasConnectedRef.current = false;
      };

      const handleOutputEventSuccessSchedule = ({
        newSchedule,
      }: {
        newSchedule: ScheduleT;
      }) => {
        console.log("Updating schedule data...");

        setScheduleCampaign(newSchedule);
        setSolveStatus(SolveDetailsStatus.SUCCESS);
        // Disconnect from SSE after receiving the data
        sseManager.close();
        setIsConnected(false);
        hasConnectedRef.current = false;
      };

      const handleOutputEventFailure = ({
        newSchedule,
      }: {
        newSchedule: ScheduleT;
      }) => {
        console.log("Updating schedule data...");

        setScheduleCampaign(newSchedule);
        setSolveStatus(SolveDetailsStatus.FAILURE);
        // Disconnect from SSE after receiving the data
        sseManager.close();
        setIsConnected(false);
        hasConnectedRef.current = false;
      };

      const handleSSEError = () => {
        console.error("SSE connection error.");
        setSolveStatus("error");
        setIsConnected(false);
        hasConnectedRef.current = false;
      };

      sseManager.connect(
        handleTaskStatusEvent,
        handleOutputEventSuccessSolution,
        handleOutputEventSuccessSchedule,
        handleOutputEventFailure,
        handleSSEError,
        taskId,
        scheduleId
      );
    },
    [hasConnectedRef]
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingSchedule(true);
      setIsLoadingAssignments(true);
      setIsLoadingLHS(true);

      // console.log("fetchData useEffect started");
      // const startTime = dayjs();

      try {
        // Fetch schedules
        const fetchedSchedule = await getSchedules(teamWithMembership.team.id);
        setScheduleCampaign(
          fetchedSchedule.find((s) => s.status === ScheduleStatus.CAMPAIGN) ||
            null
        );
        setSchedulesValidated(
          fetchedSchedule.filter((s) => s.status === ScheduleStatus.VALIDATED)
        );
        setIsLoadingSchedule(false);

        // Fetch assignment data
        if (teamWithMembership.team.useSolver) {
          const {
            assignments: fetchedAssignments,
            recurrences: fetchedRecurrences,
            workers: fetchedWorkers,
            shifts: fetchedShifts,
          } = await getScheduleAssignmentsData(teamWithMembership.team.id);
          setAssignments(fetchedAssignments);
          setRecurrences(fetchedRecurrences);
          setWorkers(fetchedWorkers);
          setShifts(fetchedShifts);
          // Note: Shift demands are now loaded via React Query hook
        } else {
          const {
            assignments: fetchedAssignments,
            recurrences: fetchedRecurrences,
            workers: fetchedWorkers,
            shifts: fetchedShifts,
          } = await getScheduleAssignmentsDataNoSolver(
            teamWithMembership.team.id
          );
          setAssignments(fetchedAssignments);
          setRecurrences(fetchedRecurrences);
          setWorkers(fetchedWorkers);
          setShifts(fetchedShifts);
        }

        setIsLoadingAssignments(false);

        // Fetch left-hand side bar data
        const {
          breaches: fetchedBreaches,
          requests: fetchedRequests,
          stats: fetchedStats,
          specialties: fetchedSpecialties,
        } = await getScheduleLHSData(teamWithMembership.team.id);
        setBreaches(fetchedBreaches);
        setRequests(fetchedRequests);
        setStats(fetchedStats);
        setSpecialties(fetchedSpecialties);

        setIsLoadingLHS(false);

        // const endTime = dayjs();
        // console.log("fetchData useEffect ended");
        // console.log(
        //   `fetchData useEffect took ${endTime.diff(
        //     startTime,
        //     "millisecond"
        //   )} ms`
        // );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingSchedule(false);
        setIsLoadingAssignments(false);
        setIsLoadingLHS(false);
      }
    };

    fetchData();
  }, [teamWithMembership]);

  // React Query hooks automatically handle refetching when scheduleViewSettings.periodStartDate/timeFrame change

  useEffect(() => {
    if (
      !hasConnectedRef.current &&
      scheduleCampaign &&
      scheduleCampaign.solveDetails &&
      (scheduleCampaign.solveDetails.status === SolveDetailsStatus.PENDING ||
        scheduleCampaign.solveDetails.status === SolveDetailsStatus.STARTED ||
        scheduleCampaign.solveDetails.status === SolveDetailsStatus.RETRY)
    ) {
      console.log("Connecting to SSE in useEffect...");

      connectSSE(scheduleCampaign.solveDetails.taskId, scheduleCampaign.id);
      hasConnectedRef.current = true;
      setSolveStatus(scheduleCampaign.solveDetails.status);
    }
  }, [scheduleCampaign, connectSSE]);

  const lhsTabContent: LHSTabContentT[] = [
    {
      name: "breaches",
      label: t("breaches"),
      content: (
        <BreachList lng={lng} breaches={breaches} onClose={handleCloseLHS} />
      ),
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
    },
    {
      name: "selection",
      label: t("selection"),
      content: (
        <CurrentSelectionLHSTab
          lng={lng}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts.filter((s) => !s.deleted)}
          schedules={[
            ...(scheduleCampaign ? [scheduleCampaign] : []),
            ...schedulesValidated,
          ]}
          selectedAssignment={selectedAssignment}
          selectedDemand={selectedDemand}
          specialties={specialties}
          onClose={handleCloseLHS}
          handleUpdateAssignment={handleUpdateAssignment}
          handleDeleteAssignment={handleDeleteAssignment}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
        />
      ),
    },
    {
      name: "create_assignment",
      label: "",
      content: createAssignmentData ? (
        <CreateAssignment
          lng={lng}
          teamWithMembership={teamWithMembership}
          scheduleId={createAssignmentData.scheduleId}
          workerSelectedId={createAssignmentData.workerId}
          shiftSelectedId={createAssignmentData.shiftId}
          dateSelected={createAssignmentData.date}
          workers={workers}
          shifts={shifts}
          addDemandActive={
            !createAssignmentData.haveDemand &&
            scheduleViewSettings.groupBy === "shift"
          }
          onClose={handleCloseLHS}
          handleCreateAssignment={handleCreateAssignment}
          handleCreateShiftDemand={handleCreateShiftDemand}
        />
      ) : null,
    },
  ];

  return (
    <div className="tab-container-ultrawide">
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
              scheduleViewSettings.timeFrame
            )}
            scheduleCampaign={scheduleCampaign}
            solveStatus={solveStatus}
            scheduleViewSettings={scheduleViewSettings}
            handleToday={handleToday}
            handlePreviousPeriod={handlePreviousPeriod}
            handleNextPeriod={handleNextPeriod}
            handleSolveSchedule={handleSolveSchedule}
            handleValidateSchedule={handleValidateSchedule}
            handleSendDuplicateRequest={handleSendDuplicateRequest}
            updateScheduleViewSettings={updateScheduleViewSettings}
            handleChangeTimeFrame={handleChangeTimeFrame}
            handleOpenLHS={setSelectedTab}
            useSqsWorkflow={USE_SQS_SOLVE}
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
          ) : assignments.length === 0 && !scheduleCampaign ? (
            <Box
              sx={{
                margin: 2,
                marginLeft: 0,
                overflowX: "auto",
                backgroundColor: "none",
                width: "100%",
              }}
            >
              <Typography
                variant="body1"
                color="textSecondary"
                sx={{ fontStyle: "italic" }}
              >
                {t("no_schedule_text")}
              </Typography>
            </Box>
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
              handleExportSchedule={handleExportSchedule}
              handleOpenCreateAssignment={handleOpenCreateAssignment}
            />
          )}
        </div>
      </div>
    </div>
  );
}
