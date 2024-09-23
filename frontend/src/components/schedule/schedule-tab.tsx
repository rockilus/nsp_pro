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
import ScheduleDisplay from "./table/schedule-display";
import ScheduleNavBar from "./nav-bar/schedule-nav-bar";
import LHSTab from "./lhs-tabs/lhs-tab";
// Skeletons
import ScheduleSkeleton from "../skeletons/schedule-skeleton";
// Actions
import {
  getScheduleTabData,
  solveSchedule,
  validateSchedule,
  updateSchedule,
} from "../../app/lib/schedule";
import { getAssignments, updateAssignment } from "../../app/lib/assignment";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { ShiftT } from "../../types/shift";
import { WorkerT } from "../../types/worker";
import {
  ScheduleT,
  BreachT,
  AssignmentT,
  SelectedCellT,
} from "../../types/schedule";
import { RequestT } from "../../types/request";

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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [requests, setRequests] = useState<RequestT[]>([]);
  const [schedule, setSchedule] = useState<ScheduleT | null>(null);
  const [assignments, setAssignments] = useState<AssignmentT[]>([]);
  const [breaches, setBreaches] = useState<BreachT[]>([]);

  const [selectedDisplay, setSelectedDisplay] = useState<string>("shift"); // ["shift", "worker", "week"]
  const [showBreaches, setShowBreaches] = useState<boolean>(true);
  const [CBsDisplayed, setCBsDisplayed] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCellT | null>(null);

  const [selectedTimeView, setSelectedTimeView] = useState<string>("week");
  const [currentPeriodStart, setCurrentPeriodStart] = useState<dayjs.Dayjs>(
    dayjs.utc().startOf(selectedTimeView === "month" ? "month" : "isoWeek")
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<dayjs.Dayjs>(
    dayjs.utc().endOf(selectedTimeView === "month" ? "month" : "isoWeek")
  );

  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  const toggleTab = (tabName: string) => {
    if (selectedTab === tabName) {
      setSelectedTab(null);
    } else {
      setSelectedTab(tabName);
    }
  };

  const addCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(Array.from(new Set([...CBsDisplayed, ...ids])));
  };
  const removeCBsDisplayed = (ids: string[]) => {
    setCBsDisplayed(CBsDisplayed.filter((cbId) => !ids.includes(cbId)));
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
    const assigmentsNewPeriod = await getAssignments(
      newPeriodStart,
      newPeriodEnd,
      selectedTeamId
    );
    setAssignments(assigmentsNewPeriod);
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
    const assigmentsNewPeriod = await getAssignments(
      newPeriodStart,
      newPeriodEnd,
      selectedTeamId
    );
    setAssignments(assigmentsNewPeriod);
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
    const assigmentsNewPeriod = await getAssignments(
      newPeriodStart,
      newPeriodEnd,
      selectedTeamId
    );
    setAssignments(assigmentsNewPeriod);
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
    const assigmentsNewPeriod = await getAssignments(
      newPeriodStart,
      newPeriodEnd,
      selectedTeamId
    );
    setAssignments(assigmentsNewPeriod);
  };

  useEffect(() => {
    const fetchScheduleTabData = async () => {
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          assignments: fetchedAssignments,
          breaches: fetchedBreaches,
          requests: fetchedRequests,
          schedule: fetchedSchedule,
          workers: fetchedWorkers,
          shifts: fetchedShifts,
        } = await getScheduleTabData(
          currentPeriodStart,
          currentPeriodEnd,
          selectedTeamId
        );
        setAssignments(fetchedAssignments);
        setBreaches(fetchedBreaches);
        setRequests(fetchedRequests);
        setSchedule(fetchedSchedule);
        setWorkers(fetchedWorkers);
        setShifts(fetchedShifts);
        setIsLoading(false);
      }
    };
    fetchScheduleTabData();
  }, [selectedTeamId, currentPeriodStart, currentPeriodEnd]);

  const lhsTabContent = {
    Breaches: (
      <BreachList
        lng={lng}
        breaches={breaches}
        CBsDisplayed={CBsDisplayed}
        workers={workers}
        shifts={shifts}
        addCBsDisplayed={addCBsDisplayed}
        removeCBsDisplayed={removeCBsDisplayed}
      />
    ),
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
      {isLoading ? (
        <ScheduleSkeleton />
      ) : (
        <div>
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
          <div style={{ display: "flex", flexDirection: "row" }}>
            <LHSTab
              tabContent={lhsTabContent}
              selectedTab={selectedTab}
              toggleTab={toggleTab}
            />
            {assignments.length === 0 || !schedule ? (
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
                schedule={schedule as ScheduleT}
                startDate={currentPeriodStart}
                endDate={currentPeriodEnd}
                assignments={assignments}
                breaches={breaches}
                workers={workers}
                shifts={shifts}
                requests={requests}
                selectedDisplay={selectedDisplay}
                showBreaches={showBreaches}
                CBsDisplayed={CBsDisplayed}
                handleCellSelection={handleCellSelection}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
