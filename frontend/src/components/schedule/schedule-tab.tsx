import React, { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import AssignmentOptions from "./lhs-tabs/assignment-options";
import BreachList from "./lhs-tabs/breach-list";
import QuickStaffingTable from "./lhs-tabs/quick-staffing";
import QuickStatsTable from "./lhs-tabs/quick-stats";
import ScheduleDisplay from "./table/schedule-display";
import ScheduleNavBar from "./nav-bar/schedule-nav-bar";
import LHSTab from "./lhs-tabs/lhs-tab";
// Skeletons
import ScheduleSelectorSkeleton from "../skeletons/schedule-selector-skeleton";
import ScheduleTableSkeleton from "../skeletons/schedule-table-skeleton";
// Actions
import {
  getScheduleTabData,
  solveSchedule,
  validateSchedule,
  updateSchedule,
  getSchedules,
  getScheduleAssignmentsData,
  getScheduleLHSData,
} from "../../app/lib/schedule";
import { updateAssignment } from "../../app/lib/assignment";
import { getStats } from "../../app/lib/stats";
import {
  addDailyShiftDemand,
  updateDailyShiftDemand,
  deleteDailyShiftDemand,
} from "../../app/lib/daily-shift-demand";
import { exportSchedule } from "../../app/lib/export-schedule";
import { SSEManager } from "../../app/lib/sse";
// Styles
import "../../styles/tab-container-styles.css";
import "./schedule-tab.css";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import {
  ScheduleT,
  BreachT,
  AssignmentT,
  SelectedCellT,
  DailyShiftDemandT,
  ExportOptionsT,
  ScheduleStatus,
  SolveDetailsStatus,
  LHSTabContentT,
} from "../../types/schedule";
import { RequestT } from "../../types/request";
import { StatsT } from "../../types/stats";

dayjs.extend(utc);
dayjs.extend(isoWeek);

export default function ScheduleTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "schedule-page");

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
  const [dailyShiftDemands, setDailyShiftDemands] = useState<
    DailyShiftDemandT[]
  >([]);
  const [breaches, setBreaches] = useState<BreachT[]>([]);
  const [stats, setStats] = useState<StatsT | null>(null);

  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [showBreaches, setShowBreaches] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<SelectedCellT | null>(null);

  const [solveStatus, setSolveStatus] = useState<
    SolveDetailsStatus | null | "error"
  >(null);

  const hasConnectedRef = useRef(false);

  const getDateScheduleStatus = useCallback(
    (date: dayjs.Dayjs) => {
      if (scheduleCampaign) {
        if (
          date.isSameOrBefore(scheduleCampaign.endDate, "day") &&
          date.isSameOrAfter(scheduleCampaign.startDate, "day")
        ) {
          return ScheduleStatus.CAMPAIGN;
        }
      }
      const validatedSchedule = schedulesValidated.find(
        (s) =>
          date.isSameOrBefore(s.endDate, "day") &&
          date.isSameOrAfter(s.startDate, "day")
      );
      if (validatedSchedule) {
        return ScheduleStatus.VALIDATED;
      }
      return null;
    },
    [scheduleCampaign, schedulesValidated]
  );

  const buildDates = useCallback(
    (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      const dates: {
        date: dayjs.Dayjs;
        scheduleStatus: ScheduleStatus | null;
      }[] = [];
      let currentDate = startDate;

      while (currentDate.isBefore(endDate)) {
        dates.push({
          date: currentDate,
          scheduleStatus: getDateScheduleStatus(currentDate),
        });
        currentDate = currentDate.add(1, "day");
      }
      return dates;
    },
    [getDateScheduleStatus]
  );

  const [selectedTimeView, setSelectedTimeView] = useState<string>("week");
  const initialStartDate = dayjs
    .utc()
    .startOf(selectedTimeView === "month" ? "month" : "isoWeek");
  const initialEndDate = dayjs
    .utc()
    .endOf(selectedTimeView === "month" ? "month" : "isoWeek");
  const intialPeriodDates = buildDates(initialStartDate, initialEndDate);
  const [periodStartDate, setPeriodStartDate] =
    useState<dayjs.Dayjs>(initialStartDate);
  const [periodEndDate, setPeriodEndDate] =
    useState<dayjs.Dayjs>(initialEndDate);
  const [periodDates, setPeriodDates] =
    useState<{ date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[]>(
      intialPeriodDates
    );

  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  const [selectedQuickStatsTimeFrame, setSelectedQuickStatsTimeFrame] =
    useState<string>("campaign");

  const toggleTab = (tabName: string) => {
    if (selectedTab === tabName) {
      setSelectedTab(null);
    } else {
      setSelectedTab(tabName);
    }
  };

  const handleCellSelection = (selectedCell: SelectedCellT) => {
    setSelectedCell(selectedCell);
    setSelectedTab("Selected assignment");
  };

  //////////////////////////
  // Schedule Actions
  //////////////////////////

  const handleUpdateSchedule = async (schedule: ScheduleT) => {
    const newSchedule = await updateSchedule(schedule);
    setScheduleCampaign(newSchedule);
  };

  const handleSolveSchedule = async (scheduleId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newSchedule = await solveSchedule(scheduleId, selectedTeamId);
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
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newSchedule = await validateSchedule(scheduleId, selectedTeamId);
    setScheduleCampaign(null);
    setSchedulesValidated([...schedulesValidated, newSchedule]);
    setBreaches([]);
  };

  //////////////////////////
  // Daily Shift Demand Actions
  //////////////////////////

  const handleCreateDSD = async (dailyShiftDemand: DailyShiftDemandT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newDailyShiftDemand = await addDailyShiftDemand(dailyShiftDemand);
    setDailyShiftDemands([...dailyShiftDemands, newDailyShiftDemand]);
  };

  const handleUpdateDSD = async (dailyShiftDemand: DailyShiftDemandT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newDailyShiftDemand = await updateDailyShiftDemand(dailyShiftDemand);
    setDailyShiftDemands(
      dailyShiftDemands.map((dsd) =>
        dsd.id === newDailyShiftDemand.id ? newDailyShiftDemand : dsd
      )
    );
  };

  const handleDeleteDSD = async (dsdId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    await deleteDailyShiftDemand(dsdId, selectedTeamId);
    setDailyShiftDemands(dailyShiftDemands.filter((dsd) => dsd.id !== dsdId));
  };

  //////////////////////////
  // Assignment Actions
  //////////////////////////

  const handleUpdateAssignment = async (assignment: AssignmentT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newAssignment = await updateAssignment(assignment, selectedTeamId);
    setAssignments(
      assignments.map((a) => (a.id === newAssignment.id ? newAssignment : a))
    );
  };

  const handleToday = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newPeriodStart =
      selectedTimeView === "week"
        ? dayjs.utc().startOf("isoWeek")
        : selectedTimeView === "month"
        ? dayjs.utc().startOf("month")
        : dayjs.utc(); // Default to current time if neither "week" nor "month"
    const newPeriodEnd =
      selectedTimeView === "week"
        ? dayjs.utc().endOf("isoWeek")
        : selectedTimeView === "month"
        ? dayjs.utc().endOf("month")
        : dayjs.utc(); // Default to current time if neither "week" nor "month"
    setPeriodStartDate(newPeriodStart);
    setPeriodEndDate(newPeriodEnd);
    setPeriodDates(buildDates(newPeriodStart, newPeriodEnd));
  };

  const handlePreviousPeriod = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newPeriodStart = periodStartDate.subtract(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    const newPeriodEnd = periodEndDate.subtract(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    setPeriodStartDate(newPeriodStart);
    setPeriodEndDate(newPeriodEnd);
    setPeriodDates(buildDates(newPeriodStart, newPeriodEnd));
  };

  const handleNextPeriod = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newPeriodStart = periodStartDate.add(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    const newPeriodEnd = periodEndDate.add(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    setPeriodStartDate(newPeriodStart);
    setPeriodEndDate(newPeriodEnd);
    setPeriodDates(buildDates(newPeriodStart, newPeriodEnd));
  };

  const handleChangeSelectedTimeView = async (newSelectedTimeView: string) => {
    console.log("handleChangeSelectedTimeView called", newSelectedTimeView);

    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    setSelectedTimeView(newSelectedTimeView);
    let newPeriodStart = periodStartDate;
    let newPeriodEnd = periodEndDate;
    if (newSelectedTimeView === "month") {
      newPeriodStart = periodEndDate.startOf("month");
      newPeriodEnd = periodEndDate.endOf("month");
    } else if (newSelectedTimeView === "week") {
      newPeriodStart = periodStartDate.startOf("isoWeek");
      newPeriodEnd = periodStartDate.endOf("isoWeek");
    }
    setPeriodStartDate(periodStartDate.startOf("month"));
    setPeriodEndDate(periodEndDate.endOf("month"));
    setPeriodDates(buildDates(newPeriodStart, newPeriodEnd));
  };

  //////////////////////////
  // Stats Actions
  //////////////////////////

  const handleChangeStatsTimeFrame = async (timeFrame: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newStatsOptions = {
      timeFrame,
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: "custom",
      headerUnit: "week",
      selectedShifts: [],
    };
    const newStats = await getStats(newStatsOptions, selectedTeamId);
    setStats(newStats);
    setSelectedQuickStatsTimeFrame(timeFrame);
  };

  //////////////////////////
  // Export Actions
  //////////////////////////

  const handleExportSchedule = async (exportOptions: ExportOptionsT) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    await exportSchedule(selectedTeamId, exportOptions);
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
        newShifts,
      }: {
        newSchedule: ScheduleT;
        newAssignments: AssignmentT[];
        newBreaches: BreachT[];
        newRequests: RequestT[];
        newShifts: ShiftT[];
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
        setShifts((prev) =>
          prev
            .filter((s) => !newShifts.find((ns) => ns.id === s.id))
            .concat(newShifts)
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
    const fetchSchedule = async () => {
      setIsLoadingSchedule(true);
      if (selectedTeamId) {
        const fetchedSchedule = await getSchedules(selectedTeamId);
        setScheduleCampaign(
          fetchedSchedule.find((s) => s.status === ScheduleStatus.CAMPAIGN) ||
            null
        );
        setSchedulesValidated(
          fetchedSchedule.filter((s) => s.status === ScheduleStatus.VALIDATED)
        );
        setIsLoadingSchedule(false);
      }
    };
    fetchSchedule();
  }, [selectedTeamId]);

  useEffect(() => {
    const fetchScheduleAssignmentsData = async () => {
      setIsLoadingAssignments(true);
      if (selectedTeamId) {
        const {
          assignments: fetchedAssignments,
          workers: fetchedWorkers,
          shifts: fetchedShifts,
          dailyShiftDemands: fetchedDailyShiftDemands,
        } = await getScheduleAssignmentsData(selectedTeamId);
        setAssignments(fetchedAssignments);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setDailyShiftDemands(fetchedDailyShiftDemands);
        setIsLoadingAssignments(false);
      }
    };
    fetchScheduleAssignmentsData();
  }, [selectedTeamId]);

  useEffect(() => {
    const fetchScheduleLHSData = async () => {
      setIsLoadingLHS(true);
      if (selectedTeamId) {
        const {
          breaches: fetchedBreaches,
          requests: fetchedRequests,
          stats: fetchedStats,
        } = await getScheduleLHSData(selectedTeamId);
        setBreaches(fetchedBreaches);
        setRequests(fetchedRequests);
        setStats(fetchedStats);
        setIsLoadingLHS(false);
      }
    };
    fetchScheduleLHSData();
  }, [selectedTeamId]);

  useEffect(() => {
    setPeriodDates(buildDates(periodStartDate, periodEndDate));
  }, [
    periodStartDate,
    periodEndDate,
    buildDates,
    scheduleCampaign,
    schedulesValidated,
  ]);

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
      name: t("breaches"),
      content: <BreachList lng={lng} breaches={breaches} />,
    },
    {
      name: t("quick_staffing"),
      content: scheduleCampaign ? (
        <QuickStaffingTable
          lng={lng}
          shifts={shifts.filter((s) => !s.deleted)}
          workers={workers.filter((w) => !w.deleted)}
          assignments={assignments}
          schedule={scheduleCampaign as ScheduleT}
          handleUpdateSchedule={handleUpdateSchedule}
        />
      ) : null,
    },
    {
      name: t("quick_stats"),
      content: stats ? (
        <QuickStatsTable
          lng={lng}
          shifts={shifts.filter((s) => !s.deleted)}
          workers={workers.filter((w) => !w.deleted)}
          stats={stats}
          selectedQuickStatsTimeFrame={selectedQuickStatsTimeFrame}
          handleChangeStatsTimeFrame={handleChangeStatsTimeFrame}
        />
      ) : null,
    },
    {
      name: t("selection"),
      content: selectedCell ? (
        <AssignmentOptions
          lng={lng}
          workers={workers.filter((w) => !w.deleted)}
          shifts={shifts.filter((s) => !s.deleted)}
          schedules={[
            ...(scheduleCampaign ? [scheduleCampaign] : []),
            ...schedulesValidated,
          ]}
          assignments={assignments}
          selectedCell={selectedCell}
          selectedDisplay={selectedDisplay}
          setSelectedCell={setSelectedCell}
          handleUpdateAssignment={handleUpdateAssignment}
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
            currentPeriodStart={periodStartDate}
            currentPeriodEnd={periodEndDate}
            selectedTimeView={selectedTimeView}
            selectedDisplay={selectedDisplay}
            showBreaches={showBreaches}
            scheduleCampaign={scheduleCampaign}
            solveStatus={solveStatus}
            handleToday={handleToday}
            handlePreviousPeriod={handlePreviousPeriod}
            handleNextPeriod={handleNextPeriod}
            handleChangeSelectedTimeView={handleChangeSelectedTimeView}
            setSelectedDisplay={setSelectedDisplay}
            switchShowBreaches={() => setShowBreaches(!showBreaches)}
            handleSolveSchedule={handleSolveSchedule}
            handleValidateSchedule={handleValidateSchedule}
          />
        )}
        <div style={{ display: "flex", flexDirection: "row" }}>
          <LHSTab
            tabContent={lhsTabContent}
            selectedTab={selectedTab}
            toggleTab={toggleTab}
          />
          {isLoadingAssignments ? (
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
              teamId={selectedTeamId as string}
              scheduleCampaign={scheduleCampaign as ScheduleT}
              periodDates={periodDates}
              assignments={assignments}
              dailyShiftDemands={dailyShiftDemands}
              breaches={breaches}
              workers={workers}
              shifts={shifts}
              requests={requests}
              selectedDisplay={selectedDisplay}
              showBreaches={showBreaches}
              handleCellSelection={handleCellSelection}
              handleCreateDSD={handleCreateDSD}
              handleUpdateDSD={handleUpdateDSD}
              handleDeleteDSD={handleDeleteDSD}
              handleExportSchedule={handleExportSchedule}
            />
          )}
        </div>
      </div>
    </div>
  );
}
