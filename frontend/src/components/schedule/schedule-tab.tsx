import React, { useState, useEffect } from "react";
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
  getSchedule,
  getScheduleAssignmentsData,
  getScheduleLHSData,
} from "../../app/lib/schedule";
import {
  getAssignmentsByDates,
  updateAssignment,
} from "../../app/lib/assignment";
import { getStats } from "../../app/lib/stats";
import {
  addDailyShiftDemand,
  updateDailyShiftDemand,
  deleteDailyShiftDemand,
} from "../../app/lib/daily-shift-demand";
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

  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedule, setSchedule] = useState<ScheduleT | null>(null);
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);
  const [dailyShiftDemands, setDailyShiftDemands] = useState<
    DailyShiftDemandT[]
  >([]);
  const [breaches, setBreaches] = useState<BreachT[]>([]);
  const [stats, setStats] = useState<StatsT | null>(null);

  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [showBreaches, setShowBreaches] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<SelectedCellT | null>(null);

  const [selectedTimeView, setSelectedTimeView] = useState<string>("week");
  const [currentPeriodStart, setCurrentPeriodStart] = useState<dayjs.Dayjs>(
    dayjs.utc().startOf(selectedTimeView === "month" ? "month" : "isoWeek")
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<dayjs.Dayjs>(
    dayjs.utc().endOf(selectedTimeView === "month" ? "month" : "isoWeek")
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
    setSchedule(newSchedule);
  };

  const handleSolveSchedule = async (scheduleId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const {
      schedule: newSchedule,
      assignments: newAssignments,
      breaches: newBreaches,
      requests: newRequests,
      recuperationShiftsNew: newShifts,
    } = await solveSchedule(scheduleId, selectedTeamId);
    setSchedule(newSchedule);
    setAssignments((prev) => [
      ...prev.filter((a) => a.scheduleId !== scheduleId),
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
  };

  const handleValidateSchedule = async (scheduleId: string) => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const { schedule: newSchedule, assignments: newAssignments } =
      await validateSchedule(scheduleId, selectedTeamId);
    setSchedule(newSchedule);
    setAssignments((prev) =>
      prev.map((a) => newAssignments.find((na) => na.id === a.id) || a)
    );
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
    setCurrentPeriodStart(newPeriodStart);
    setCurrentPeriodEnd(newPeriodEnd);
    // const assigmentsNewPeriod = await getAssignmentsByDates(
    //   selectedTeamId,
    //   newPeriodStart,
    //   newPeriodEnd
    // );
    // setAssignments(assigmentsNewPeriod);
  };

  const handlePreviousPeriod = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newPeriodStart = currentPeriodStart.subtract(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    const newPeriodEnd = currentPeriodEnd.subtract(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    setCurrentPeriodStart(newPeriodStart);
    setCurrentPeriodEnd(newPeriodEnd);
    // const assigmentsNewPeriod = await getAssignmentsByDates(
    //   selectedTeamId,
    //   newPeriodStart,
    //   newPeriodEnd
    // );
    // setAssignments(assigmentsNewPeriod);
  };

  const handleNextPeriod = async () => {
    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    const newPeriodStart = currentPeriodStart.add(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    const newPeriodEnd = currentPeriodEnd.add(
      1,
      selectedTimeView === "month" ? "month" : "week"
    );
    setCurrentPeriodStart(newPeriodStart);
    setCurrentPeriodEnd(newPeriodEnd);
    // const assigmentsNewPeriod = await getAssignmentsByDates(
    //   selectedTeamId,
    //   newPeriodStart,
    //   newPeriodEnd
    // );
    // setAssignments(assigmentsNewPeriod);
  };

  const handleChangeSelectedTimeView = async (newSelectedTimeView: string) => {
    console.log("handleChangeSelectedTimeView called", newSelectedTimeView);

    if (!selectedTeamId) {
      throw new Error("No team selected");
    }
    setSelectedTimeView(newSelectedTimeView);
    let newPeriodStart = currentPeriodStart;
    let newPeriodEnd = currentPeriodEnd;
    if (newSelectedTimeView === "month") {
      newPeriodStart = currentPeriodEnd.startOf("month");
      newPeriodEnd = currentPeriodEnd.endOf("month");
    } else if (newSelectedTimeView === "week") {
      newPeriodStart = currentPeriodStart.startOf("isoWeek");
      newPeriodEnd = currentPeriodStart.endOf("isoWeek");
    }
    setCurrentPeriodStart(currentPeriodStart.startOf("month"));
    setCurrentPeriodEnd(currentPeriodEnd.endOf("month"));
    // const assigmentsNewPeriod = await getAssignmentsByDates(
    //   selectedTeamId,
    //   newPeriodStart,
    //   newPeriodEnd
    // );
    // setAssignments(assigmentsNewPeriod);
  };

  //////////////////////////
  // Assignment Actions
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

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoadingSchedule(true);
      if (selectedTeamId) {
        const fetchedSchedule = await getSchedule(selectedTeamId);
        setSchedule(fetchedSchedule);
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

  const lhsTabContent = {
    Breaches: <BreachList lng={lng} breaches={breaches} />,
    "Quick staffing": schedule ? (
      <QuickStaffingTable
        lng={lng}
        shifts={shifts.filter((s) => !s.deleted)}
        workers={workers.filter((w) => !w.deleted)}
        assignments={assignments}
        schedule={schedule as ScheduleT}
        handleUpdateSchedule={handleUpdateSchedule}
      />
    ) : null,
    "Quick stats": stats ? (
      <QuickStatsTable
        lng={lng}
        shifts={shifts.filter((s) => !s.deleted)}
        workers={workers.filter((w) => !w.deleted)}
        stats={stats}
        selectedQuickStatsTimeFrame={selectedQuickStatsTimeFrame}
        handleChangeStatsTimeFrame={handleChangeStatsTimeFrame}
      />
    ) : null,
    "Selected assignment": selectedCell ? (
      <AssignmentOptions
        lng={lng}
        workers={workers.filter((w) => !w.deleted)}
        shifts={shifts.filter((s) => !s.deleted)}
        assignments={assignments}
        selectedCell={selectedCell}
        selectedDisplay={selectedDisplay}
        setSelectedCell={setSelectedCell}
        handleUpdateAssignment={handleUpdateAssignment}
      />
    ) : null,
  };

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
            currentPeriodStart={currentPeriodStart}
            currentPeriodEnd={currentPeriodEnd}
            selectedTimeView={selectedTimeView}
            selectedDisplay={selectedDisplay}
            showBreaches={showBreaches}
            schedule={schedule}
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
          ) : assignments.length === 0 || !schedule ? (
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
              schedule={schedule as ScheduleT}
              startDate={currentPeriodStart}
              endDate={currentPeriodEnd}
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
